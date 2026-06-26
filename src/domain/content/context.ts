import type { ContentInput, ContentContext } from './types';
import { RECENT_LOG_WINDOW } from './types';
import type { LifeStage } from '@/src/domain/types';
import { phaseForDate } from '@/src/domain/insights/phase-assignment';
import { daysBetween } from '@/src/domain/dates';

export function deriveContentContext(
  input: ContentInput,
  lifeStage: LifeStage = 'cycle',
): ContentContext {
  const { cycles, dailyLogs, stats, today } = input;
  const hasData = cycles.length > 0 || dailyLogs.length > 0;

  const recent = new Set<string>();
  for (const log of dailyLogs) {
    const age = daysBetween(log.date, today);
    if (age < 0 || age > RECENT_LOG_WINDOW) continue;
    for (const s of log.symptoms) recent.add(s);
    for (const m of log.moods) recent.add(m);
  }

  return {
    currentPhase: phaseForDate(today, cycles, stats),
    recentSymptoms: [...recent],
    isIrregular: hasData && !stats.isRegular,
    hasData,
    lifeStage,
  };
}
