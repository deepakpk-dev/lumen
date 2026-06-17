'use client';

import { useCallback, useEffect, useState } from 'react';
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

  const stats: CycleStats = computeCycleStats(cycles);
  const prediction: Prediction | null = generatePrediction(cycles, todayISO());

  return {
    cycles,
    dailyLogs,
    stats,
    prediction,
    loading,
    startPeriod,
    endPeriod,
    saveLog,
    refresh,
  };
}
