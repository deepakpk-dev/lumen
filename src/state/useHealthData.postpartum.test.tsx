// src/state/useHealthData.postpartum.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '@/src/data/db';
import { savePostpartumProfile, savePregnancyProfile } from '@/src/data/repository';
import { setLifeStage, clearPreferences } from '@/src/settings/preferences';
import { useHealthData, HealthDataProvider } from './useHealthData';
import type { PostpartumProfile, PregnancyProfile } from '@/src/domain/types';

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
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPostpartum).toBe(true);
    expect(result.current.postpartumWeekNumber).toBeGreaterThanOrEqual(1);
    expect(result.current.postpartumContentToday).not.toBeNull();
  });

  it('saves a scored EPDS check-in and exposes the latest', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.saveEpdsCheckin([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });
    expect(result.current.latestEpds?.total).toBe(10);
    expect(result.current.latestEpds?.band).toBe('possible');
  });

  it('saveEpdsCheckin does nothing when no postpartum profile is active', async () => {
    // Do NOT save a profile or set lifeStage — no postpartumProfile present
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.postpartumProfile).toBeNull();
    await act(async () => {
      await result.current.saveEpdsCheckin([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });
    expect(result.current.latestEpds).toBeNull();
    expect(result.current.epdsEntries).toHaveLength(0);
  });

  it('endPostpartumMode switches life stage and ends the profile', async () => {
    await savePostpartumProfile(profile);
    setLifeStage('postpartum', '2026-06-08');
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.endPostpartumMode('cycle');
    });
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.isPostpartum).toBe(false);
  });
});

it('confirming birth enters postpartum mode with a profile', async () => {
  const preg: PregnancyProfile = {
    id: 'current', dueDate: '2026-10-08', lmp: '2026-01-01',
    dueDateSource: 'lmp', startedAt: '2026-01-10', status: 'active',
  };
  await savePregnancyProfile(preg);
  setLifeStage('pregnancy', '2026-06-08');
  const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    await result.current.endPregnancyBirth('2026-06-20');
  });
  expect(result.current.lifeStage).toBe('postpartum');
  expect(result.current.isPostpartum).toBe(true);
  expect(result.current.postpartumProfile?.birthDate).toBe('2026-06-20');
});
