#!/usr/bin/env node
// Production smoke test for the sync API. Registers a throwaway account,
// pushes one random-bytes envelope, pulls it back, deletes the account.
// Usage: node scripts/sync-smoke.mjs https://your-deployment.vercel.app
import { webcrypto as crypto } from 'node:crypto';

const origin = process.argv[2];
if (!origin) {
  console.error('usage: node scripts/sync-smoke.mjs <origin>');
  process.exit(2);
}

const hex = (n) =>
  [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (bytes) => Buffer.from(bytes).toString('base64');

const accountId = hex(16); // 32 hex chars, matches isHex(accountId, 32)
const authSecret = hex(32);
const authHash = Buffer.from(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authSecret)),
).toString('hex');

async function post(path, body, auth = true) {
  const res = await fetch(`${origin}/api/sync/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${accountId}:${authSecret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

// Random bytes only — the server never decrypts, and this script must never
// send anything that even looks like health data.
const envelope = {
  recordKey: hex(32),
  iv: b64(crypto.getRandomValues(new Uint8Array(12))),
  ciphertext: b64(crypto.getRandomValues(new Uint8Array(256))),
  updatedAt: new Date().toISOString(),
  deleted: false,
};

try {
  await post('register', { accountId, authHash }, false);
  console.log('register  OK');
  await post('push', { records: [envelope] });
  console.log('push      OK');
  const page = await post('pull', { since: 0 });
  const got = page.records.find((r) => r.recordKey === envelope.recordKey);
  if (!got || got.ciphertext !== envelope.ciphertext) {
    throw new Error('pull did not return the pushed record intact');
  }
  console.log('pull      OK (round-trip verified)');
  await post('delete-account', {});
  console.log('delete    OK');
  console.log(`\nSync is LIVE at ${origin}`);
} catch (err) {
  console.error(`\nSMOKE FAILED: ${err.message}`);
  process.exit(1);
}
