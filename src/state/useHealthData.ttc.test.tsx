import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useHealthData, HealthDataProvider } from '@/src/state/useHealthData';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('useHealthData TTC mode', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
  });

  it('exposes null TTC outputs in cycle mode', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.conceptionToday).toBeNull();
    expect(result.current.ovulationConfirmation).toBeNull();
  });

  it('turns TTC mode on and off reactively via setTtcMode (no manual refresh)', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');

    await act(async () => {
      result.current.setTtcMode(true);
    });
    expect(result.current.lifeStage).toBe('ttc');

    await act(async () => {
      result.current.setTtcMode(false);
    });
    expect(result.current.lifeStage).toBe('cycle');
  });

  it('scopes cycle daily content out once TTC mode is on', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    // In plain cycle mode a starter read is surfaced.
    expect(result.current.dailyContent).not.toBeNull();

    await act(async () => {
      result.current.setTtcMode(true);
    });
    expect(result.current.dailyContent).toBeNull();
  });

  it('computes conception guidance in TTC mode', async () => {
    setLifeStage('ttc', '2026-06-01');
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      result.current.refreshSettings();
    });
    expect(result.current.lifeStage).toBe('ttc');
    expect(result.current.conceptionToday).not.toBeNull();
  });
});
