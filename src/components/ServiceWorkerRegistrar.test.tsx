import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ServiceWorkerRegistrar', () => {
  it('registers the service worker when supported', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });
    render(<ServiceWorkerRegistrar />);
    await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js'));
  });
});
