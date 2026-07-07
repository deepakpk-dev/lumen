import { describe, it, expect } from 'vitest';
import { parseBbtCsv } from './bbt-import';

describe('parseBbtCsv', () => {
  it('parses date,temp with a header', () => {
    const { readings, skipped } = parseBbtCsv('date,temp\n2026-07-01,36.55\n2026-07-02,36.60\n');
    expect(readings).toEqual([
      { date: '2026-07-01', bbt: 36.55 },
      { date: '2026-07-02', bbt: 36.6 },
    ]);
    expect(skipped).toBe(0);
  });

  it('converts Fahrenheit and decimal commas, semicolon-delimited', () => {
    const { readings } = parseBbtCsv('01/7/2026;97,7\n'); // M/D/YYYY per spec → Jan 7
    expect(readings).toEqual([{ date: '2026-01-07', bbt: 36.5 }]);
  });

  it('skips out-of-range and malformed rows, first duplicate wins', () => {
    const { readings, skipped } = parseBbtCsv(
      '2026-07-01T06:12:00,36.5\n2026-07-01,36.9\n2026-07-03,12.0\nnot,a,row\n',
    );
    expect(readings).toEqual([{ date: '2026-07-01', bbt: 36.5 }]);
    expect(skipped).toBe(3);
  });

  it('throws when nothing is importable', () => {
    expect(() => parseBbtCsv('a,b\nc,d\n')).toThrow(/no temperature readings/i);
  });
});
