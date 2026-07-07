import type { WrappedVault } from '@/src/crypto/vault';

// Where the passcode-wrapped recovery phrase lives on-device. Safe to persist
// in the clear — it's inert without the passcode (see crypto/vault.ts).
const KEY = 'lumen.vault';

export function hasVault(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) !== null;
}

export function loadVault(): WrappedVault | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WrappedVault;
  } catch {
    return null;
  }
}

// Same-tab localStorage writes don't fire 'storage', so settings sections that
// gate on hasVault() listen for this instead.
export const VAULT_CHANGED_EVENT = 'lumen:vault-changed';

function emitChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(VAULT_CHANGED_EVENT));
}

export function saveVault(vault: WrappedVault): void {
  localStorage.setItem(KEY, JSON.stringify(vault));
  emitChanged();
}

export function clearVault(): void {
  localStorage.removeItem(KEY);
  emitChanged();
}
