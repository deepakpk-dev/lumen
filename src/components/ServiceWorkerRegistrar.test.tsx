import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ServiceWorkerRegistrar', () => {
  it('registers the service worker outside development', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    render(<ServiceWorkerRegistrar />);
    await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'));
  });

  it('in development unregisters stale workers and clears caches instead of registering', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const unregister = vi.fn().mockResolvedValue(true);
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register,
        getRegistrations: vi.fn().mockResolvedValue([{ unregister }]),
      },
    });
    const cacheDelete = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['lumen-shell-v1']),
        delete: cacheDelete,
      },
    });

    render(<ServiceWorkerRegistrar />);

    await waitFor(() => expect(unregister).toHaveBeenCalled());
    await waitFor(() => expect(cacheDelete).toHaveBeenCalledWith('lumen-shell-v1'));
    expect(register).not.toHaveBeenCalled();
  });
});
