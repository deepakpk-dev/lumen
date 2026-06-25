import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData, HealthDataProvider } from './useHealthData';
import { deleteAll } from '@/src/data/repository';

beforeEach(async () => {
  await deleteAll();
});

describe('useHealthData', () => {
  it('starts a period and recomputes a prediction', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startPeriod('2026-01-01');
    });
    await act(async () => {
      await result.current.startPeriod('2026-01-29');
    });

    await waitFor(() => expect(result.current.cycles).toHaveLength(2));
    expect(result.current.prediction).not.toBeNull();
    expect(result.current.prediction!.nextPeriodStart).toBe('2026-02-26');
  });
});
