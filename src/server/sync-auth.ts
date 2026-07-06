import { createHash, timingSafeEqual } from 'node:crypto';
import { query } from './sync-db';

// Trust-boundary validators. accountId is 128-bit hex, authSecret 256-bit hex,
// hashes 256-bit hex — all produced by the client crypto core (src/crypto/keys.ts).
export function isHex(value: unknown, length: number): value is string {
  return typeof value === 'string' && value.length === length && /^[0-9a-f]+$/.test(value);
}

export function hexEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Verifies `Authorization: Bearer <accountId>:<authSecret>` and returns the
// accountId, or null. The server never stores authSecret — only its SHA-256 —
// so a database dump cannot be replayed as credentials.
export async function authenticate(req: Request): Promise<string | null> {
  const match = /^Bearer ([0-9a-f]{32}):([0-9a-f]{64})$/.exec(
    req.headers.get('authorization') ?? '',
  );
  if (!match) return null;
  const [, accountId, authSecret] = match;
  const { rows } = await query('select auth_hash from sync_accounts where account_id = $1', [
    accountId,
  ]);
  if (rows.length === 0) return null;
  const givenHash = createHash('sha256').update(authSecret).digest('hex');
  return hexEqual(String(rows[0].auth_hash), givenHash) ? accountId : null;
}
