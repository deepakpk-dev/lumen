import { query } from '@/src/server/sync-db';
import { authenticate, isHex } from '@/src/server/sync-auth';
import type { SyncEnvelope } from '@/src/crypto/envelope';

// Caps sized to the domain: the largest real record (a full pregnancy profile)
// is a few KB of JSON; 64k base64 chars ≈ 48 KB plaintext leaves huge headroom.
// The sync engine (Phase 3c) chunks its outbox to stay under MAX_RECORDS.
const MAX_RECORDS = 500;
const MAX_CIPHERTEXT_CHARS = 64_000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

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

  // ponytail: one statement per record, no transaction — LWW upserts are
  // idempotent and the client clears its dirty flags only on a 200, so a
  // partial failure just means a harmless re-push. Batch VALUES if it's slow.
  for (const r of records) {
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
      [accountId, r.recordKey, r.iv, r.ciphertext, r.updatedAt, r.deleted],
    );
  }
  return Response.json({ ok: true });
}
