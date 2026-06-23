import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestPersistentStorage } from './persist';

const originalNavigator = globalThis.navigator;

function setStorage(storage: unknown) {
  Object.defineProperty(globalThis, 'navigator', {
    value: storage === undefined ? {} : { storage },
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
  });
});

describe('requestPersistentStorage', () => {
  it('returns false when the Storage API is unavailable', async () => {
    setStorage(undefined);
    expect(await requestPersistentStorage()).toBe(false);
  });

  it('returns true without calling persist() when already persisted', async () => {
    const persist = vi.fn().mockResolvedValue(false);
    setStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it('calls persist() and returns its result when not yet persisted', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    setStorage({ persisted: vi.fn().mockResolvedValue(false), persist });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('swallows errors and returns false', async () => {
    setStorage({ persist: vi.fn().mockRejectedValue(new Error('denied')) });
    expect(await requestPersistentStorage()).toBe(false);
  });
});
