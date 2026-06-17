import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData } from './useHealthData';
import { deleteAll } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('useHealthData insights', () => {
  it('exposes a trend insight after three logged cycles', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    for (const d of ['2026-01-01', '2026-01-29', '2026-02-26']) {
      await act(async () => {
        await result.current.startPeriod(d);
      });
    }

    await waitFor(() => expect(result.current.cycles).toHaveLength(3));
    expect(Array.isArray(result.current.insights)).toBe(true);
    expect(
      result.current.insights.some((i) => i.id === 'trend:regularity'),
    ).toBe(true);
  });
});
