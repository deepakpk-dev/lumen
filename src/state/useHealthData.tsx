'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Cycle,
  CycleStats,
  DailyLog,
  ISODate,
  Prediction,
  PregnancyProfile,
  DueDateSource,
  KickSession,
  ContractionSession,
} from '@/src/domain/types';
import type { LifeStage } from '@/src/domain/types';
import {
  addCycle,
  getAllDailyLogs,
  getCycles,
  updateCycle,
  upsertDailyLog,
  getPregnancyProfile,
  savePregnancyProfile,
  clearPregnancyProfile,
  clearPostpartumProfile,
  addKickSession,
  getKickSessions,
  addContractionSession,
  getContractionSessions,
  getPostpartumProfile,
  savePostpartumProfile,
  addEpdsEntry,
  getEpdsEntries,
  getProgramProgress,
  saveProgramProgress,
} from '@/src/data/repository';
import { PROGRAMS } from '@/src/content/programs';
import {
  programsForStage,
  computeProgramStatus,
  toggleStepComplete,
} from '@/src/domain/content/programs/progress';
import type { ProgramStatus } from '@/src/domain/content/programs/types';
import type { ProgramProgress } from '@/src/domain/types';
import {
  startPostpartum,
  setBreastfeeding,
  editBirthDate,
  endPostpartum,
} from '@/src/domain/postpartum/lifecycle';
import { postpartumWeek, recoveryStage, type RecoveryStage } from '@/src/domain/postpartum/recovery';
import { postpartumWeekContent, type PostpartumWeekContent } from '@/src/domain/postpartum/weeks';
import { scoreEpds } from '@/src/domain/postpartum/epds';
import type { PostpartumProfile, PostpartumReturnTo, EpdsEntry } from '@/src/domain/types';
import {
  gestationalAge,
  trimester,
  daysUntilDue,
  type GestationalAge,
  type Trimester,
} from '@/src/domain/pregnancy/gestation';
import { weekContent, type WeekContent } from '@/src/domain/pregnancy/weeks';
import {
  startPregnancy,
  editDueDate,
  endByBirth,
  endByLoss,
} from '@/src/domain/pregnancy/lifecycle';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import { todayISO, msUntilNextMidnight } from '@/src/domain/dates';
import { generateInsights } from '@/src/domain/insights/insights';
import type { Insight } from '@/src/domain/insights/types';
import { ARTICLES } from '@/src/content';
import { deriveContentContext } from '@/src/domain/content/context';
import { buildContentFeed } from '@/src/domain/content/feed';
import { selectDailyContent } from '@/src/domain/content/daily';
import type { ScoredArticle, ContentArticle } from '@/src/domain/content/types';
import { confirmOvulation } from '@/src/domain/fertility/confirmation';
import { estimateLutealLength } from '@/src/domain/fertility/luteal';
import { conceptionGuidance } from '@/src/domain/fertility/guidance';
import type { OvulationConfirmation, ConceptionGuidance } from '@/src/domain/fertility/types';
import type { ObservedFertility } from '@/src/domain/prediction';
import {
  getLifeStage,
  getBbtUnit,
  getTtcStartDate,
  setLifeStage,
  setBbtUnit as setBbtUnitPref,
  type BbtUnit,
} from '@/src/settings/preferences';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random()}`;
}

function useHealthDataState() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [pregnancyProfile, setPregnancyProfile] = useState<PregnancyProfile | null>(null);
  const [kickSessions, setKickSessions] = useState<KickSession[]>([]);
  const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([]);
  const [postpartumProfile, setPostpartumProfile] = useState<PostpartumProfile | null>(null);
  const [epdsEntries, setEpdsEntries] = useState<EpdsEntry[]>([]);
  const [programProgress, setProgramProgress] = useState<ProgramProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [lifeStage, setLifeStageState] = useState<LifeStage>('cycle');
  const [bbtUnit, setBbtUnit] = useState<BbtUnit>('C');
  const [ttcStartDate, setTtcStartDate] = useState<string | null>(null);

  // Reactive "today". Every daily derivation (insights, content feed, gestation,
  // recovery week, conception guidance) keys off this, so it must advance when
  // the clock crosses local midnight — otherwise an app left open overnight
  // shows yesterday's day until a manual reload. We roll it at midnight and
  // re-check on tab focus/visibility (a backgrounded PWA's timer may not fire).
  const [today, setToday] = useState<ISODate>(() => todayISO());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const bump = () => setToday((prev) => (prev === todayISO() ? prev : todayISO()));
    const schedule = () => {
      // +1s cushion so we're safely past midnight when the timer fires.
      timer = setTimeout(() => {
        bump();
        schedule();
      }, msUntilNextMidnight() + 1000);
    };
    const onWake = () => {
      if (!document.hidden) bump();
    };
    schedule();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, []);

  const refreshSettings = useCallback(() => {
    setLifeStageState(getLifeStage());
    setBbtUnit(getBbtUnit());
    setTtcStartDate(getTtcStartDate());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration of preferences from localStorage
    refreshSettings();
  }, [refreshSettings]);

  // Toggle TTC mode through the shared context so every consumer (daily-log
  // BBT field, home conception card, fertility nav) reacts immediately —
  // writing the preference alone leaves the live context stale until reload.
  const setTtcMode = useCallback(
    (on: boolean) => {
      setLifeStage(on ? 'ttc' : 'cycle', todayISO());
      refreshSettings();
    },
    [refreshSettings],
  );

  const setBbtUnitPreference = useCallback(
    (u: BbtUnit) => {
      setBbtUnitPref(u);
      refreshSettings();
    },
    [refreshSettings],
  );

  const refresh = useCallback(async () => {
    const [c, l, p, ks, cs, pp, ep, prog] = await Promise.all([
      getCycles(),
      getAllDailyLogs(),
      getPregnancyProfile(),
      getKickSessions(),
      getContractionSessions(),
      getPostpartumProfile(),
      getEpdsEntries(),
      getProgramProgress(),
    ]);
    setCycles(c);
    setDailyLogs(l);
    setPregnancyProfile(p ?? null);
    setKickSessions(ks);
    setContractionSessions(cs);
    setPostpartumProfile(pp ?? null);
    setEpdsEntries(ep);
    setProgramProgress(prog);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async load from IndexedDB; state set after the await
    void refresh();
  }, [refresh]);

  const startPeriod = useCallback(
    async (date: ISODate) => {
      await addCycle({ id: newId(), startDate: date });
      await refresh();
    },
    [refresh],
  );

  const endPeriod = useCallback(
    async (cycleId: string, endDate: ISODate) => {
      const cycle = cycles.find((c) => c.id === cycleId);
      if (!cycle) return;
      await updateCycle({ ...cycle, endDate });
      await refresh();
    },
    [cycles, refresh],
  );

  const saveLog = useCallback(
    async (log: DailyLog) => {
      await upsertDailyLog(log);
      await refresh();
    },
    [refresh],
  );

  const stats: CycleStats = useMemo(() => computeCycleStats(cycles), [cycles]);

  const startPregnancyMode = useCallback(
    async (input: { dueDate?: ISODate; lmp?: ISODate; source?: DueDateSource; useCycleLength?: boolean }) => {
      const profile = startPregnancy({
        today: todayISO(),
        dueDate: input.dueDate,
        lmp: input.lmp,
        source: input.source,
        averageCycleLength: input.useCycleLength ? stats.averageCycleLength : undefined,
      });
      await savePregnancyProfile(profile);
      setLifeStage('pregnancy', todayISO());
      refreshSettings();
      await refresh();
    },
    [stats.averageCycleLength, refresh, refreshSettings],
  );

  // Single entry point for the onboarding setup step. Onboarding is a fresh
  // start, but the route has no guard and the provider outlives navigation, so
  // it can run with a stale stage still in memory/storage (a re-onboard, or
  // arriving here after a data wipe). Clearing the prior pregnancy/postpartum
  // journey and asserting the goal's life stage makes every goal land cleanly —
  // the plain cycle goal especially, which otherwise has no path that resets a
  // carried-over 'pregnancy'/'postpartum'/'ttc' stage. (Goal mirrors the union
  // in OnboardingForm; kept inline to avoid a component→state import cycle.)
  const completeOnboarding = useCallback(
    async (goal: 'cycle' | 'ttc' | 'pregnant', input: { date?: ISODate; dueDate?: ISODate }) => {
      await clearPregnancyProfile();
      await clearPostpartumProfile();
      if (goal === 'pregnant') {
        await savePregnancyProfile(startPregnancy({ today: todayISO(), dueDate: input.dueDate }));
        setLifeStage('pregnancy', todayISO());
      } else {
        // Both cycle and TTC seed a cycle so predictions work from day one; TTC
        // additionally lands in fertility mode.
        if (input.date) await addCycle({ id: newId(), startDate: input.date });
        setLifeStage(goal === 'ttc' ? 'ttc' : 'cycle', todayISO());
      }
      refreshSettings();
      await refresh();
    },
    [refresh, refreshSettings],
  );

  const updateDueDate = useCallback(
    async (dueDate: ISODate, source: DueDateSource) => {
      if (!pregnancyProfile) return;
      await savePregnancyProfile(editDueDate(pregnancyProfile, dueDate, source));
      await refresh();
    },
    [pregnancyProfile, refresh],
  );

  const endPregnancyBirth = useCallback(
    async (endDate: ISODate) => {
      if (!pregnancyProfile) return;
      await savePregnancyProfile(endByBirth(pregnancyProfile, endDate));
      await savePostpartumProfile(startPostpartum({ birthDate: endDate, today: todayISO() }));
      setLifeStage('postpartum', todayISO());
      refreshSettings();
      await refresh();
    },
    [pregnancyProfile, refresh, refreshSettings],
  );

  const endPregnancyLoss = useCallback(
    async (endDate: ISODate) => {
      if (!pregnancyProfile) return;
      await savePregnancyProfile(endByLoss(pregnancyProfile, endDate));
      setLifeStage('cycle', todayISO());
      refreshSettings();
      await refresh();
    },
    [pregnancyProfile, refresh, refreshSettings],
  );

  const saveEpdsCheckin = useCallback(
    async (responses: number[]) => {
      if (!postpartumProfile) return;
      const result = scoreEpds(responses);
      await addEpdsEntry({
        id: newId(),
        date: todayISO(),
        responses,
        total: result.total,
        band: result.band,
      });
      await refresh();
    },
    [postpartumProfile, refresh],
  );

  const setPostpartumBreastfeeding = useCallback(
    async (value: boolean) => {
      if (!postpartumProfile) return;
      await savePostpartumProfile(setBreastfeeding(postpartumProfile, value));
      await refresh();
    },
    [postpartumProfile, refresh],
  );

  const updateBirthDate = useCallback(
    async (birthDate: ISODate) => {
      if (!postpartumProfile) return;
      await savePostpartumProfile(editBirthDate(postpartumProfile, birthDate));
      await refresh();
    },
    [postpartumProfile, refresh],
  );

  const endPostpartumMode = useCallback(
    async (returnTo: PostpartumReturnTo) => {
      if (!postpartumProfile) return;
      await savePostpartumProfile(endPostpartum(postpartumProfile, { returnTo, endDate: todayISO() }));
      setLifeStage(returnTo, todayISO());
      refreshSettings();
      await refresh();
    },
    [postpartumProfile, refresh, refreshSettings],
  );

  const saveKickSession = useCallback(
    async (s: KickSession) => {
      await addKickSession(s);
      await refresh();
    },
    [refresh],
  );

  const saveContractionSession = useCallback(
    async (s: ContractionSession) => {
      await addContractionSession(s);
      await refresh();
    },
    [refresh],
  );

  const isPregnant = lifeStage === 'pregnancy' && pregnancyProfile?.status === 'active';

  const gestation: GestationalAge | null = useMemo(
    () => (isPregnant && pregnancyProfile ? gestationalAge(pregnancyProfile.dueDate, today) : null),
    [isPregnant, pregnancyProfile, today],
  );

  const currentTrimester: Trimester | null = useMemo(
    () => (gestation ? trimester(gestation.weeks) : null),
    [gestation],
  );

  const daysToDue: number | null = useMemo(
    () => (isPregnant && pregnancyProfile ? daysUntilDue(pregnancyProfile.dueDate, today) : null),
    [isPregnant, pregnancyProfile, today],
  );

  const weekContentToday: WeekContent | null = useMemo(
    () => (gestation ? weekContent(gestation.weeks) : null),
    [gestation],
  );

  const isPostpartum = lifeStage === 'postpartum' && postpartumProfile?.status === 'active';

  const postpartumWeekNumber: number | null = useMemo(
    () => (isPostpartum && postpartumProfile ? postpartumWeek(postpartumProfile.birthDate, today) : null),
    [isPostpartum, postpartumProfile, today],
  );

  const recoveryStageToday: RecoveryStage | null = useMemo(
    () => (isPostpartum && postpartumProfile ? recoveryStage(postpartumProfile.birthDate, today) : null),
    [isPostpartum, postpartumProfile, today],
  );

  const postpartumContentToday: PostpartumWeekContent | null = useMemo(
    () => (postpartumWeekNumber !== null ? postpartumWeekContent(postpartumWeekNumber) : null),
    [postpartumWeekNumber],
  );

  const latestEpds: EpdsEntry | null = epdsEntries[0] ?? null;

  const isTtc = lifeStage === 'ttc';

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [cycles],
  );

  const confirmations: OvulationConfirmation[] = useMemo(() => {
    if (!isTtc) return [];
    return sortedCycles
      .map((c, i) =>
        confirmOvulation(dailyLogs, c, sortedCycles[i + 1]?.startDate),
      )
      .filter((x): x is OvulationConfirmation => x !== null);
  }, [isTtc, sortedCycles, dailyLogs]);

  const currentCycle = sortedCycles.at(-1) ?? null;
  const ovulationConfirmation: OvulationConfirmation | null = useMemo(() => {
    if (!isTtc || !currentCycle) return null;
    return confirmOvulation(dailyLogs, currentCycle);
  }, [isTtc, currentCycle, dailyLogs]);

  const observed: ObservedFertility | undefined = useMemo(() => {
    if (!isTtc) return undefined;
    return {
      lutealLength: estimateLutealLength(confirmations, cycles) ?? undefined,
      currentCycleOvulation: ovulationConfirmation ?? undefined,
    };
  }, [isTtc, confirmations, cycles, ovulationConfirmation]);

  const prediction: Prediction | null = useMemo(
    () => generatePrediction(cycles, observed),
    [cycles, observed],
  );

  const conceptionToday: ConceptionGuidance | null = useMemo(() => {
    if (!isTtc) return null;
    return conceptionGuidance(
      today,
      prediction,
      ovulationConfirmation,
      dailyLogs.find((l) => l.date === today),
    );
  }, [isTtc, prediction, ovulationConfirmation, dailyLogs, today]);
  const insights: Insight[] = useMemo(
    () =>
      generateInsights({
        cycles,
        dailyLogs,
        stats,
        prediction,
        today,
      }),
    [cycles, dailyLogs, stats, prediction, today],
  );

  const contentFeed: ScoredArticle[] = useMemo(() => {
    const context = deriveContentContext(
      {
        cycles,
        dailyLogs,
        stats,
        prediction,
        today,
      },
      lifeStage,
    );
    return buildContentFeed(ARTICLES, context);
  }, [cycles, dailyLogs, stats, prediction, today, lifeStage]);

  const dailyContent: ContentArticle | null = useMemo(
    () => selectDailyContent(contentFeed, today),
    [contentFeed, today],
  );

  const completedByProgram = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of programProgress) map.set(p.programSlug, p.completedSteps);
    return map;
  }, [programProgress]);

  // Programs offered in the current life stage, each with derived progress.
  const programs: ProgramStatus[] = useMemo(
    () =>
      programsForStage(PROGRAMS, lifeStage).map((p) =>
        computeProgramStatus(p, completedByProgram.get(p.slug) ?? []),
      ),
    [lifeStage, completedByProgram],
  );

  // Status for any program by slug (used by the program detail page, which may
  // render a program regardless of the active stage). Null for unknown slugs.
  const getProgramStatus = useCallback(
    (slug: string): ProgramStatus | null => {
      const program = PROGRAMS.find((p) => p.slug === slug);
      if (!program) return null;
      return computeProgramStatus(program, completedByProgram.get(slug) ?? []);
    },
    [completedByProgram],
  );

  const setProgramStepDone = useCallback(
    async (programSlug: string, stepSlug: string, done: boolean) => {
      const current = completedByProgram.get(programSlug) ?? [];
      const now = new Date().toISOString();
      const existing = programProgress.find((p) => p.programSlug === programSlug);
      await saveProgramProgress({
        programSlug,
        completedSteps: toggleStepComplete(current, stepSlug, done),
        startedAt: existing?.startedAt ?? now,
        updatedAt: now,
      });
      await refresh();
    },
    [completedByProgram, programProgress, refresh],
  );

  return {
    today,
    cycles,
    dailyLogs,
    stats,
    prediction,
    insights,
    contentFeed,
    dailyContent,
    programs,
    getProgramStatus,
    setProgramStepDone,
    loading,
    startPeriod,
    completeOnboarding,
    endPeriod,
    saveLog,
    refresh,
    lifeStage,
    bbtUnit,
    ttcStartDate,
    ovulationConfirmation,
    conceptionToday,
    refreshSettings,
    setTtcMode,
    setBbtUnitPreference,
    pregnancyProfile,
    isPregnant,
    gestation,
    currentTrimester,
    daysToDue,
    weekContentToday,
    startPregnancyMode,
    updateDueDate,
    endPregnancyBirth,
    endPregnancyLoss,
    kickSessions,
    contractionSessions,
    saveKickSession,
    saveContractionSession,
    postpartumProfile,
    isPostpartum,
    postpartumWeekNumber,
    recoveryStageToday,
    postpartumContentToday,
    epdsEntries,
    latestEpds,
    saveEpdsCheckin,
    setPostpartumBreastfeeding,
    updateBirthDate,
    endPostpartumMode,
  };
}

type HealthData = ReturnType<typeof useHealthDataState>;

const HealthDataContext = createContext<HealthData | null>(null);

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const value = useHealthDataState();
  return <HealthDataContext.Provider value={value}>{children}</HealthDataContext.Provider>;
}

export function useHealthData(): HealthData {
  const ctx = useContext(HealthDataContext);
  if (ctx === null) {
    throw new Error('useHealthData must be used within a HealthDataProvider');
  }
  return ctx;
}
