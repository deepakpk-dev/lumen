'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Cycle,
  CycleStats,
  DailyLog,
  ISODate,
  Prediction,
} from '@/src/domain/types';
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

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `c_${Date.now()}_${Math.random()}`;
}

export function useHealthData() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [c, l] = await Promise.all([getCycles(), getAllDailyLogs()]);
    setCycles(c);
    setDailyLogs(l);
    setLoading(false);
  }, []);

  useEffect(() => {
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
  const prediction: Prediction | null = useMemo(
    () => generatePrediction(cycles, todayISO()),
    [cycles],
  );
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
  };
}
