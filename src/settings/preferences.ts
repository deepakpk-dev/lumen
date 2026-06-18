import type { ISODate, LifeStage } from '@/src/domain/types';

export type BbtUnit = 'C' | 'F';

const LIFESTAGE_KEY = 'lumen.settings.lifeStage';
const BBTUNIT_KEY = 'lumen.settings.bbtUnit';
const TTCSTART_KEY = 'lumen.settings.ttcStartDate';

function ls(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function getLifeStage(): LifeStage {
  return (ls()?.getItem(LIFESTAGE_KEY) as LifeStage | null) ?? 'cycle';
}

export function getTtcStartDate(): ISODate | null {
  return ls()?.getItem(TTCSTART_KEY) ?? null;
}

export function setLifeStage(stage: LifeStage, today: ISODate): void {
  const store = ls();
  if (!store) return;
  store.setItem(LIFESTAGE_KEY, stage);
  if (stage === 'ttc') {
    if (!store.getItem(TTCSTART_KEY)) store.setItem(TTCSTART_KEY, today);
  } else {
    store.removeItem(TTCSTART_KEY);
  }
}

export function getBbtUnit(): BbtUnit {
  return (ls()?.getItem(BBTUNIT_KEY) as BbtUnit | null) ?? 'C';
}

export function setBbtUnit(unit: BbtUnit): void {
  ls()?.setItem(BBTUNIT_KEY, unit);
}
