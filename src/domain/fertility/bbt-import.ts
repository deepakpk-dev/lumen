import type { ISODate } from '@/src/domain/types';
import type { BbtReading } from './bbt';
import { fToC } from './units';

// Narrow, forgiving CSV import for basal body temperature. Accepts exports from
// thermometer apps / spreadsheets: a date column and a temperature column,
// comma- or semicolon-delimited, °C or °F. Everything unusable is counted, not
// fatal — real wearable exports are full of gaps and stray columns.

const ISO_RE = /^(\d{4}-\d{2}-\d{2})/; // also matches a leading timestamp
const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/; // US month/day/year

function parseDate(cell: string): ISODate | null {
  const iso = ISO_RE.exec(cell);
  if (iso) return iso[1];
  const mdy = MDY_RE.exec(cell);
  if (!mdy) return null;
  const [, m, d, y] = mdy;
  // ponytail: US M/D order; European D/M with day ≤ 12 will misparse — add a
  // format toggle only if users report it.
  if (Number(m) > 12 || Number(d) > 31 || Number(m) < 1 || Number(d) < 1) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseTemp(cell: string): number | null {
  if (cell === '') return null;
  const n = Number(cell.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  // Values in the Fahrenheit range are converted; anything still outside a
  // plausible body-temp window (e.g. Oura's relative "deviation" column, or a
  // stray count) is dropped, not imported.
  const c = n >= 45 ? fToC(n) : n;
  return c >= 34 && c <= 42 ? c : null;
}

export function parseBbtCsv(text: string): { readings: BbtReading[]; skipped: number } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
  const delim = text.includes(';') ? ';' : ',';
  const byDate = new Map<ISODate, number>();
  let skipped = 0;

  lines.forEach((line, i) => {
    const cells = line.split(delim).map((c) => c.trim());
    const date = cells.map(parseDate).find((d): d is ISODate => d !== null) ?? null;
    let temp: number | null = null;
    for (const c of cells) {
      const t = parseTemp(c);
      if (t !== null) {
        temp = t;
        break;
      }
    }
    if (date && temp !== null) {
      if (byDate.has(date)) skipped++; // first waking temp of a day wins
      else byDate.set(date, temp);
    } else if (i === 0 && !date && temp === null) {
      // Header row: cells parse as neither a date nor a temperature. Not an error.
    } else {
      skipped++;
    }
  });

  if (byDate.size === 0) {
    throw new Error('No temperature readings found — expected columns with a date and a temperature.');
  }
  const readings = [...byDate.entries()].map(([date, bbt]) => ({ date, bbt }));
  return { readings, skipped };
}
