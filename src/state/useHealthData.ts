'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Cycle,
  CycleStats,
  DailyLog,
  ISODate,
  Prediction,
} from '@/src/domain/types';
import type { LifeStage } from '@/src/domain/types';
import {
  addCycle,
  getAllDailyLogs,
  getCycles,
  updateCycle,
  upsertDailyLog,
} from '@/src/data/repository';
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
  type BbtUnit,
} from '@/src/settings/preferences';

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random()}`;
}

export function useHealthData() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
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
    const [c, l] = await Promise.all([getCycles(), getAllDailyLogs()]);
    setCycles(c);
    setDailyLogs(l);
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
    () => generatePrediction(cycles, todayISO(), observed),
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
  };
}
