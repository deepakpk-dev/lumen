import { query } from '@/src/server/sync-db';
import { authenticate } from '@/src/server/sync-auth';

const PAGE_SIZE = 1000;

// Incremental pull: everything after the client's last-seen server_seq, in
// server order. `since` in the response is the new high-water mark; `more`
// tells the client to keep paging (design doc §4).
export async function POST(req: Request) {
  const accountId = await authenticate(req);
  if (!accountId) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawSince = (body as Record<string, unknown> | null)?.since ?? 0;
  const since = Number(rawSince);
  if (!Number.isInteger(since) || since < 0) {
    return Response.json({ error: 'invalid request' }, { status: 400 });
  }

  const { rows } = await query(
    `select record_key, iv, ciphertext, updated_at, deleted, server_seq
     from sync_records
     where account_id = $1 and server_seq > $2
     order by server_seq asc
     limit ${PAGE_SIZE}`,
    [accountId, since],
  );

  const records = rows.map((r) => ({
    recordKey: r.record_key as string,
    iv: r.iv as string,
    ciphertext: r.ciphertext as string,
    updatedAt: new Date(r.updated_at as string | Date).toISOString(),
    deleted: r.deleted as boolean,
  }));
  const last = rows.at(-1);
  return Response.json({
    records,
    since: last ? Number(last.server_seq) : since,
    more: rows.length === PAGE_SIZE,
  });
}
