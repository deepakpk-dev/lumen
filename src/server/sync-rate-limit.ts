import { createHmac } from 'node:crypto';
import { query } from './sync-db';

const CLIENT_LIMIT = 5;
const UNKNOWN_CLIENT_LIMIT = 100;
const GLOBAL_LIMIT = 200;
const WINDOW_SECONDS = 60 * 60;

function clientScope(req: Request): { scope: string; limit: number } {
  const ip =
    req.headers.get('x-vercel-forwarded-for')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (!ip) return { scope: 'register:unknown', limit: UNKNOWN_CLIENT_LIMIT };

  // Never persist a user's IP address. DATABASE_URL is already required by the
  // sync service and supplies a deployment-local HMAC key; an explicit secret
  // lets operators rotate database credentials without resetting rate buckets.
  const secret = process.env.SYNC_RATE_LIMIT_SECRET || process.env.DATABASE_URL || 'local-test';
  const digest = createHmac('sha256', secret).update(ip).digest('hex');
  return { scope: `register:client:${digest}`, limit: CLIENT_LIMIT };
}

async function consume(scope: string, limit: number): Promise<boolean> {
  const { rows } = await query(
    `insert into sync_rate_limits (scope, window_start, attempts)
     values ($1, now(), 1)
     on conflict (scope) do update set
       window_start = case
         when sync_rate_limits.window_start <= now() - ($2 * interval '1 second') then now()
         else sync_rate_limits.window_start
       end,
       attempts = case
         when sync_rate_limits.window_start <= now() - ($2 * interval '1 second') then 1
         else sync_rate_limits.attempts + 1
       end
     returning attempts`,
    [scope, WINDOW_SECONDS],
  );
  return Number(rows[0].attempts) <= limit;
}

export async function allowSyncRegistration(req: Request): Promise<boolean> {
  // Remove expired client buckets so a distributed scan cannot grow this
  // privacy-preserving side table without bound.
  await query(
    `delete from sync_rate_limits
     where window_start <= now() - ($1 * interval '1 second')`,
    [WINDOW_SECONDS * 2],
  );
  // Bound distributed abuse as well as repeated requests from one client. The
  // database row makes this durable across regions and serverless instances.
  if (!(await consume('register:global', GLOBAL_LIMIT))) return false;
  const client = clientScope(req);
  return consume(client.scope, client.limit);
}

export const REGISTRATION_RETRY_AFTER_SECONDS = WINDOW_SECONDS;
