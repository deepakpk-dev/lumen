import type { Cycle, Confidence, DailyLog, ISODate } from '@/src/domain/types';
import type { OvulationConfirmation, OvulationMethod } from './types';
import { detectThermalShift, type BbtReading } from './bbt';
import { addDays, daysBetween } from '@/src/domain/dates';

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

function buildExplanation(
  status: 'confirmed' | 'likely',
  methods: OvulationMethod[],
  ov: ISODate,
): string {
  const phrase: Record<OvulationMethod, string> = {
    bbt: 'a sustained temperature rise',
    lh: 'a positive LH test',
    mucus: 'fertile (egg-white) cervical mucus',
  };
  const verb = status === 'confirmed' ? 'confirmed' : 'estimated';
  return `Ovulation ${verb} around ${ov}, based on ${joinList(
    methods.map((m) => phrase[m]),
  )}.`;
}

export function confirmOvulation(
  logs: DailyLog[],
  cycle: Cycle,
  nextStart?: ISODate,
): OvulationConfirmation | null {
  const cycleLogs = logs
    .filter((l) => l.date >= cycle.startDate && (!nextStart || l.date < nextStart))
    .sort((a, b) => a.date.localeCompare(b.date));

  const bbtReadings: BbtReading[] = cycleLogs
    .filter((l) => typeof l.bbt === 'number')
    .map((l) => ({ date: l.date, bbt: l.bbt as number }));
  const shift = detectThermalShift(bbtReadings);

  const firstLhPos = cycleLogs.find((l) => l.lh === 'positive')?.date ?? null;
  const lhOv = firstLhPos ? addDays(firstLhPos, 1) : null;

  const mucusPeak =
    cycleLogs
      .filter((l) => l.mucus === 'egg-white' || l.mucus === 'watery')
      .map((l) => l.date)
      .sort((a, b) => a.localeCompare(b))
      .at(-1) ?? null;

  const within2 = (a: ISODate, b: ISODate) => Math.abs(daysBetween(a, b)) <= 2;
  const mk = (
    ovulationDate: ISODate,
    status: 'confirmed' | 'likely',
    methods: OvulationMethod[],
    confidence: Confidence,
  ): OvulationConfirmation => ({
    cycleId: cycle.id,
    ovulationDate,
    status,
    methods,
    confidence,
    explanation: buildExplanation(status, methods, ovulationDate),
  });

  if (shift.shiftDetected && shift.ovulationDate) {
    const ov = shift.ovulationDate;
    const methods: OvulationMethod[] = ['bbt'];
    let corroborated = false;
    if (lhOv && within2(lhOv, ov)) {
      methods.push('lh');
      corroborated = true;
    }
    if (mucusPeak && within2(mucusPeak, ov)) {
      methods.push('mucus');
      corroborated = true;
    }
    return mk(ov, 'confirmed', methods, corroborated ? 'high' : 'medium');
  }

  if (lhOv && mucusPeak && within2(lhOv, mucusPeak)) {
    return mk(lhOv, 'likely', ['lh', 'mucus'], 'medium');
  }
  if (lhOv) return mk(lhOv, 'likely', ['lh'], 'low');
  if (mucusPeak) return mk(mucusPeak, 'likely', ['mucus'], 'low');
  return null;
}
