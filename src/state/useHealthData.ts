'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  addKickSession,
  getKickSessions,
  addContractionSession,
  getContractionSessions,
  getPostpartumProfile,
  savePostpartumProfile,
  addEpdsEntry,
  getEpdsEntries,
} from '@/src/data/repository';
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
import { todayISO } from '@/src/domain/dates';
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
  type BbtUnit,
} from '@/src/settings/preferences';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random()}`;
}

export function useHealthData() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [pregnancyProfile, setPregnancyProfile] = useState<PregnancyProfile | null>(null);
  const [kickSessions, setKickSessions] = useState<KickSession[]>([]);
  const [contractionSessions, setContractionSessions] = useState<ContractionSession[]>([]);
  const [postpartumProfile, setPostpartumProfile] = useState<PostpartumProfile | null>(null);
  const [epdsEntries, setEpdsEntries] = useState<EpdsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lifeStage, setLifeStageState] = useState<LifeStage>('cycle');
  const [bbtUnit, setBbtUnit] = useState<BbtUnit>('C');
  const [ttcStartDate, setTtcStartDate] = useState<string | null>(null);

  const refreshSettings = useCallback(() => {
    setLifeStageState(getLifeStage());
    setBbtUnit(getBbtUnit());
    setTtcStartDate(getTtcStartDate());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time hydration of preferences from localStorage
    refreshSettings();
  }, [refreshSettings]);

  const refresh = useCallback(async () => {
    const [c, l, p, ks, cs, pp, ep] = await Promise.all([
      getCycles(),
      getAllDailyLogs(),
      getPregnancyProfile(),
      getKickSessions(),
      getContractionSessions(),
      getPostpartumProfile(),
      getEpdsEntries(),
    ]);
    setCycles(c);
    setDailyLogs(l);
    setPregnancyProfile(p ?? null);
    setKickSessions(ks);
    setContractionSessions(cs);
    setPostpartumProfile(pp ?? null);
    setEpdsEntries(ep);
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
    () => (isPregnant && pregnancyProfile ? gestationalAge(pregnancyProfile.dueDate, todayISO()) : null),
    [isPregnant, pregnancyProfile],
  );

  const currentTrimester: Trimester | null = useMemo(
    () => (gestation ? trimester(gestation.weeks) : null),
    [gestation],
  );

  const daysToDue: number | null = useMemo(
    () => (isPregnant && pregnancyProfile ? daysUntilDue(pregnancyProfile.dueDate, todayISO()) : null),
    [isPregnant, pregnancyProfile],
  );

  const weekContentToday: WeekContent | null = useMemo(
    () => (gestation ? weekContent(gestation.weeks) : null),
    [gestation],
  );

  const isPostpartum = lifeStage === 'postpartum' && postpartumProfile?.status === 'active';

  const postpartumWeekNumber: number | null = useMemo(
    () => (isPostpartum && postpartumProfile ? postpartumWeek(postpartumProfile.birthDate, todayISO()) : null),
    [isPostpartum, postpartumProfile],
  );

  const recoveryStageToday: RecoveryStage | null = useMemo(
    () => (isPostpartum && postpartumProfile ? recoveryStage(postpartumProfile.birthDate, todayISO()) : null),
    [isPostpartum, postpartumProfile],
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
      todayISO(),
      prediction,
      ovulationConfirmation,
      dailyLogs.find((l) => l.date === todayISO()),
    );
  }, [isTtc, prediction, ovulationConfirmation, dailyLogs]);
  const insights: Insight[] = useMemo(
    () =>
      generateInsights({
        cycles,
        dailyLogs,
        stats,
        prediction,
        today: todayISO(),
      }),
    [cycles, dailyLogs, stats, prediction],
  );

  const today = todayISO();

  const contentFeed: ScoredArticle[] = useMemo(() => {
    const context = deriveContentContext({
      cycles,
      dailyLogs,
      stats,
      prediction,
      today,
    });
    return buildContentFeed(ARTICLES, context);
  }, [cycles, dailyLogs, stats, prediction, today]);

  const dailyContent: ContentArticle | null = useMemo(
    () => selectDailyContent(contentFeed, today),
    [contentFeed, today],
  );

  return {
    cycles,
    dailyLogs,
    stats,
    prediction,
    insights,
    contentFeed,
    dailyContent,
    loading,
    startPeriod,
    endPeriod,
    saveLog,
    refresh,
    lifeStage,
    bbtUnit,
    ttcStartDate,
    ovulationConfirmation,
    conceptionToday,
    refreshSettings,
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
