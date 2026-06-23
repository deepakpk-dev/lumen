// src/state/useHealthData.postpartum.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '@/src/data/db';
import { savePostpartumProfile } from '@/src/data/repository';
import { setLifeStage, clearPreferences } from '@/src/settings/preferences';
import { useHealthData } from './useHealthData';
import type { PostpartumProfile } from '@/src/domain/types';

const profile: PostpartumProfile = {
  id: 'current', birthDate: '2026-06-01', startedAt: '2026-06-01', status: 'active',
};

beforeEach(async () => {
  await db.delete();
  await db.open();
  clearPreferences();
});

describe('postpartum hook state', () => {
  it('derives recovery week and content in postpartum mode', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPostpartum).toBe(true);
    expect(result.current.postpartumWeekNumber).toBeGreaterThanOrEqual(1);
    expect(result.current.postpartumContentToday).not.toBeNull();
  });

  it('saves a scored EPDS check-in and exposes the latest', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.saveEpdsCheckin([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });
    expect(result.current.latestEpds?.total).toBe(10);
    expect(result.current.latestEpds?.band).toBe('possible');
  });

  it('endPostpartumMode switches life stage and ends the profile', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.endPostpartumMode('cycle');
    });
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.isPostpartum).toBe(false);
  });
});
