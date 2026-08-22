import { query } from '@/src/server/sync-db';
import { authenticate, isHex } from '@/src/server/sync-auth';
import type { SyncEnvelope } from '@/src/crypto/envelope';

// Caps sized to the domain: the largest real record (a full pregnancy profile)
// is a few KB of JSON. envelope.ts pads plaintext to exponential size buckets,
// so the ceiling is the 64 KB bucket → ~87k base64 chars + GCM tag; 90k leaves
// headroom. The sync engine (Phase 3c) chunks its outbox to stay under MAX_RECORDS.
const MAX_RECORDS = 500;
const MAX_CIPHERTEXT_CHARS = 90_000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Per-account storage ceiling. A real user across all 8 stores (daily logs are
// one row/day) stays well under 20k rows over decades; 50k is generous headroom
// while bounding an authenticated attacker who mints unlimited distinct
// recordKeys to exhaust storage. Worst case per account is capped at
// MAX_RECORDS_PER_ACCOUNT × MAX_CIPHERTEXT_CHARS. Account creation has a
// database-backed shared limiter in sync-rate-limit.ts; an edge rule remains a
// useful first layer because it rejects abusive traffic before a function runs.
// ponytail: bump if a power user ever legitimately nears it.
const MAX_RECORDS_PER_ACCOUNT = 50_000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

function normalizeUpdatedAt(updatedAt: string, receivedAt: number): string {
  return new Date(Math.min(Date.parse(updatedAt), receivedAt + MAX_FUTURE_SKEW_MS)).toISOString();
}

function isEnvelope(r: unknown): r is SyncEnvelope {
  if (typeof r !== 'object' || r === null) return false;
  const e = r as Record<string, unknown>;
  return (
    isHex(e.recordKey, 64) &&
    typeof e.iv === 'string' &&
    e.iv.length === 16 && // 12 IV bytes in base64
    BASE64.test(e.iv) &&
    typeof e.ciphertext === 'string' &&
    e.ciphertext.length > 0 &&
    e.ciphertext.length <= MAX_CIPHERTEXT_CHARS &&
    BASE64.test(e.ciphertext) &&
    typeof e.updatedAt === 'string' &&
    Number.isFinite(Date.parse(e.updatedAt)) &&
    typeof e.deleted === 'boolean'
  );
}

// Upsert with a last-write-wins guard: an incoming write with updated_at ≤ the
// stored row is silently skipped, so a stale device can never clobber newer
// data (design doc §4). Updates take a fresh server_seq so incremental pulls
// on other devices see the change.
export async function POST(req: Request) {
  const accountId = await authenticate(req);
  if (!accountId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const records = (body as Record<string, unknown> | null)?.records;
  if (!Array.isArray(records) || records.length > MAX_RECORDS || !records.every(isEnvelope)) {
    return Response.json({ error: 'invalid request' }, { status: 400 });
  }

  // Quota guard: reject the push if it could grow the account past the ceiling.
  // Counts incoming records as growth even when some are updates to existing
  // rows — conservative by design, and the cap sits far above real usage so a
  // legitimate client never hits it. Returning 413 (not 200) leaves the client's
  // rows dirty so nothing is silently dropped.
  const { rows: countRows } = await query(
    'select count(*)::int as n from sync_records where account_id = $1',
    [accountId],
  );
  if (Number(countRows[0].n) + records.length > MAX_RECORDS_PER_ACCOUNT) {
    return Response.json({ error: 'account storage limit reached' }, { status: 413 });
  }

  // ponytail: one statement per record, no transaction — LWW upserts are
  // idempotent and the client clears its dirty flags only on a 200, so a
  // partial failure just means a harmless re-push. Batch VALUES if it's slow.
  const receivedAt = Date.now();
  const accepted: { recordKey: string; updatedAt: string }[] = [];
  for (const r of records) {
    // Bound client clock skew so one misconfigured device cannot create a
    // timestamp that blocks every other device's edits for months or years.
    const updatedAt = normalizeUpdatedAt(r.updatedAt, receivedAt);
    await query(
      `insert into sync_records (account_id, record_key, iv, ciphertext, updated_at, deleted)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (account_id, record_key) do update set
         iv = excluded.iv,
         ciphertext = excluded.ciphertext,
         updated_at = excluded.updated_at,
         deleted = excluded.deleted,
         server_seq = nextval(pg_get_serial_sequence('sync_records', 'server_seq'))
       where excluded.updated_at > sync_records.updated_at`,
      [accountId, r.recordKey, r.iv, r.ciphertext, updatedAt, r.deleted],
    );
    accepted.push({ recordKey: r.recordKey, updatedAt });
  }
  // Echo the canonical clocks so the sending device uses the same LWW values
  // as the server. `records` is additive for compatibility with older clients.
  return Response.json({ ok: true, records: accepted });
}
