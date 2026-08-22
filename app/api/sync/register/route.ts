import { query } from '@/src/server/sync-db';
import { hexEqual, isHex } from '@/src/server/sync-auth';
import {
  allowSyncRegistration,
  REGISTRATION_RETRY_AFTER_SECONDS,
} from '@/src/server/sync-rate-limit';

// Idempotent account creation (design doc §4). The client sends authHash =
// SHA-256(authSecret), so even registration never transmits the bearer secret's
// preimage store-side. Re-registering with the same hash is a no-op; a
// different hash is a hijack attempt and is rejected.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { accountId, authHash } = (body ?? {}) as Record<string, unknown>;
  if (!isHex(accountId, 32) || !isHex(authHash, 64)) {
    return Response.json({ error: 'invalid request' }, { status: 400 });
  }

  // Existing devices re-register idempotently on restore/enable. Do not spend
  // a creation-rate token for that normal path.
  const existing = await query('select auth_hash from sync_accounts where account_id = $1', [
    accountId,
  ]);
  if (existing.rows.length > 0) {
    return hexEqual(String(existing.rows[0].auth_hash), authHash)
      ? Response.json({ ok: true })
      : Response.json({ error: 'account already exists' }, { status: 409 });
  }

  if (!(await allowSyncRegistration(req))) {
    return Response.json(
      { error: 'too many registration attempts' },
      {
        status: 429,
        headers: { 'Retry-After': String(REGISTRATION_RETRY_AFTER_SECONDS) },
      },
    );
  }
  const inserted = await query(
    `insert into sync_accounts (account_id, auth_hash) values ($1, $2)
     on conflict (account_id) do nothing
     returning account_id`,
    [accountId, authHash],
  );
  if (inserted.rows.length === 0) {
    // A concurrent registration may have won after the lookup above.
    const raced = await query('select auth_hash from sync_accounts where account_id = $1', [
      accountId,
    ]);
    if (raced.rows.length === 0 || !hexEqual(String(raced.rows[0].auth_hash), authHash)) {
      return Response.json({ error: 'account already exists' }, { status: 409 });
    }
  }
  return Response.json({ ok: true });
}
