import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useHealthData, HealthDataProvider } from '@/src/state/useHealthData';
import { db } from '@/src/data/db';

describe('useHealthData programs', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
    await db.programProgress.clear();
  });

  it('offers stage-scoped programs with zero initial progress', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.lifeStage).toBe('cycle');
    const slugs = result.current.programs.map((s) => s.program.slug);
    expect(slugs).toContain('understanding-your-cycle');
    // A TTC program should not surface in cycle mode.
    expect(slugs).not.toContain('preparing-for-pregnancy');

    const cycleProgram = result.current.programs.find(
      (s) => s.program.slug === 'understanding-your-cycle',
    )!;
    expect(cycleProgram.completedCount).toBe(0);
    expect(cycleProgram.percentComplete).toBe(0);
    expect(cycleProgram.isComplete).toBe(false);
  });

  it('marks a step complete and reflects progress reactively', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setProgramStepDone('understanding-your-cycle', 'how-tracking-works', true);
    });

    const status = result.current.getProgramStatus('understanding-your-cycle')!;
    expect(status.completedCount).toBe(1);
    expect(status.completedSteps).toContain('how-tracking-works');
    expect(status.nextStep?.articleSlug).toBe('menstrual-phase');
    expect(status.isComplete).toBe(false);
  });

  it('un-marks a step and returns to zero progress', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setProgramStepDone('understanding-your-cycle', 'how-tracking-works', true);
    });
    await act(async () => {
      await result.current.setProgramStepDone('understanding-your-cycle', 'how-tracking-works', false);
    });

    expect(result.current.getProgramStatus('understanding-your-cycle')!.completedCount).toBe(0);
  });

  it('returns null status for an unknown program slug', async () => {
    const { result } = renderHook(() => useHealthData(), { wrapper: HealthDataProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getProgramStatus('does-not-exist')).toBeNull();
  });
});
