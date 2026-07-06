import { query } from '@/src/server/sync-db';
import { authenticate } from '@/src/server/sync-auth';

// The server half of "Delete all data": hard-deletes every record and the
// account row itself. No soft delete, no retention — the hard-delete promise
// holds server-side too (design doc §6).
export async function POST(req: Request) {
  const accountId = await authenticate(req);
  if (!accountId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  await query('delete from sync_records where account_id = $1', [accountId]);
  await query('delete from sync_accounts where account_id = $1', [accountId]);
  return Response.json({ ok: true });
}
