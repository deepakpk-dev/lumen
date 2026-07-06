import { query } from '@/src/server/sync-db';
import { hexEqual, isHex } from '@/src/server/sync-auth';

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
  const inserted = await query(
    `insert into sync_accounts (account_id, auth_hash) values ($1, $2)
     on conflict (account_id) do nothing
     returning account_id`,
    [accountId, authHash],
  );
  if (inserted.rows.length === 0) {
    const existing = await query('select auth_hash from sync_accounts where account_id = $1', [
      accountId,
    ]);
    if (!hexEqual(String(existing.rows[0].auth_hash), authHash)) {
      return Response.json({ error: 'account already exists' }, { status: 409 });
    }
  }
  return Response.json({ ok: true });
}
