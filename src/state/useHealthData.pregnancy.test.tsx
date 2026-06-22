import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData } from './useHealthData';
import { deleteAll } from '@/src/data/repository';
import { clearPreferences } from '@/src/settings/preferences';

beforeEach(async () => {
  await deleteAll();
  clearPreferences();
});

describe('useHealthData pregnancy', () => {
  it('starts pregnancy mode and exposes derived gestation state', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startPregnancyMode({ dueDate: '2026-10-08' });
    });

    await waitFor(() => expect(result.current.isPregnant).toBe(true));
    expect(result.current.pregnancyProfile?.dueDate).toBe('2026-10-08');
    expect(result.current.gestation).not.toBeNull();
    expect(result.current.currentTrimester).not.toBeNull();
    expect(result.current.weekContentToday).not.toBeNull();
  });

  it('ends pregnancy by loss and returns to cycle mode', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.startPregnancyMode({ dueDate: '2026-10-08' });
    });
    await waitFor(() => expect(result.current.isPregnant).toBe(true));

    await act(async () => {
      await result.current.endPregnancyLoss('2026-04-02');
    });

    await waitFor(() => expect(result.current.isPregnant).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.pregnancyProfile?.status).toBe('ended');
    expect(result.current.pregnancyProfile?.endReason).toBe('loss');
  });
});
