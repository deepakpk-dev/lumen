import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useHealthData } from '@/src/state/useHealthData';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('useHealthData TTC mode', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
  });

  it('exposes null TTC outputs in cycle mode', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.conceptionToday).toBeNull();
    expect(result.current.ovulationConfirmation).toBeNull();
  });

  it('computes conception guidance in TTC mode', async () => {
    setLifeStage('ttc', '2026-06-01');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      result.current.refreshSettings();
    });
    expect(result.current.lifeStage).toBe('ttc');
    expect(result.current.conceptionToday).not.toBeNull();
  });
});
