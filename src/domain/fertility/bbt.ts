import type { ISODate } from '@/src/domain/types';
import { addDays } from '@/src/domain/dates';

export interface BbtReading {
  date: ISODate;
  bbt: number; // °C
}

export interface ThermalShift {
  shiftDetected: boolean;
  coverline?: number;
  ovulationDate?: ISODate;
  firstHighDate?: ISODate;
  sustainedRise?: boolean;
}

export function detectThermalShift(readings: BbtReading[]): ThermalShift {
  const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 6; i + 2 < sorted.length; i++) {
    const prev6 = sorted.slice(i - 6, i).map((r) => r.bbt);
    const coverline = Math.max(...prev6);
    const highs = [sorted[i], sorted[i + 1], sorted[i + 2]];
    if (highs.every((r) => r.bbt > coverline)) {
      return {
        shiftDetected: true,
        coverline,
        firstHighDate: sorted[i].date,
        ovulationDate: addDays(sorted[i].date, -1),
        sustainedRise: highs.every((r) => r.bbt >= coverline + 0.2),
      };
    }
  }
  return { shiftDetected: false };
}
