import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useHealthData, HealthDataProvider } from './useHealthData';
import { deleteAll } from '@/src/data/repository';
import { clearPreferences } from '@/src/settings/preferences';

beforeEach(async () => {
  await deleteAll();
  clearPreferences();
});

describe('useHealthData onboarding', () => {
  it('re-onboarding as cycle clears a prior pregnancy stage', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Arrange: the user was previously in pregnancy mode.
    await act(async () => {
      await result.current.startPregnancyMode({ dueDate: '2026-10-08' });
    });
    await waitFor(() => expect(result.current.isPregnant).toBe(true));

    // Act: they re-onboard, this time picking "Track my cycle".
    await act(async () => {
      await result.current.completeOnboarding('cycle', { date: '2026-06-01' });
    });

    // Assert: home would render cycle content, not the pregnancy card.
    await waitFor(() => expect(result.current.isPregnant).toBe(false));
    expect(result.current.lifeStage).toBe('cycle');
    expect(result.current.cycles).toHaveLength(1);
    expect(result.current.pregnancyProfile).toBeNull();
  });

  it('onboarding as cycle resets a stale ttc stage', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setTtcMode(true);
    });
    await waitFor(() => expect(result.current.lifeStage).toBe('ttc'));

    await act(async () => {
      await result.current.completeOnboarding('cycle', { date: '2026-06-01' });
    });

    await waitFor(() => expect(result.current.lifeStage).toBe('cycle'));
    expect(result.current.ttcStartDate).toBeNull();
  });

  it('onboarding as ttc seeds a cycle and switches on fertility mode', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeOnboarding('ttc', { date: '2026-06-01' });
    });

    await waitFor(() => expect(result.current.lifeStage).toBe('ttc'));
    expect(result.current.cycles).toHaveLength(1);
  });

  it('onboarding as pregnant clears a prior postpartum stage', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Arrange: a prior pregnancy that ended in birth leaves the user in postpartum.
    await act(async () => {
      await result.current.startPregnancyMode({ dueDate: '2026-01-08' });
    });
    await waitFor(() => expect(result.current.isPregnant).toBe(true));
    await act(async () => {
      await result.current.endPregnancyBirth('2026-06-01');
    });
    await waitFor(() => expect(result.current.isPostpartum).toBe(true));

    // Act: they re-onboard as pregnant again.
    await act(async () => {
      await result.current.completeOnboarding('pregnant', { dueDate: '2027-02-08' });
    });

    await waitFor(() => expect(result.current.isPregnant).toBe(true));
    expect(result.current.isPostpartum).toBe(false);
    expect(result.current.postpartumProfile).toBeNull();
    expect(result.current.pregnancyProfile?.dueDate).toBe('2027-02-08');
  });
});
