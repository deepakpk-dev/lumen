// Best-effort request for durable on-device storage. Lumen is local-first, so
// IndexedDB data is the only copy — asking the browser to mark it "persistent"
// reduces the chance it is silently evicted under storage pressure. Safe to call
// on every load; resolves to whether storage is (now) persisted.
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const storage = navigator.storage;
  if (!storage || typeof storage.persist !== 'function') return false;
  try {
    if (typeof storage.persisted === 'function' && (await storage.persisted())) {
      return true;
    }
    return await storage.persist();
  } catch {
    return false;
  }
}
