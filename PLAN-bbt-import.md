# BBT / Temperature Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let TTC users bulk-import basal body temperature readings from a CSV file (thermometer apps, Oura/wearable exports, spreadsheets) instead of typing them one day at a time — closing the "wearable/temperature import" credibility gap vs Natural Cycles/Apple without any device SDK or regulatory exposure.

**Architecture:** A pure parser in `src/domain/fertility/` (no I/O, fully unit-testable) turns CSV text into `BbtReading[]` (canonical °C, already the domain type in `bbt.ts`). A repository function merges readings into existing `dailyLogs` via the normal `putRecord` funnel — which means imported readings are automatically encrypted at rest when a vault is active and queued for sync when tracking is on, for free. UI is one file-input card on the Fertility page.

**Tech Stack:** existing stack only. No CSV library — the format accepted is simple enough for a ~40-line parser (ponytail: add PapaParse only if real-world files break this).

## Global Constraints

- This repo's Next.js is a custom 16.2.9 build — read `node_modules/next/dist/docs/` before writing any Next-specific code.
- No new dependencies.
- BBT is stored canonically in **°C** (`DailyLog.bbt`, see `src/domain/types.ts:18`); display conversion via existing `src/domain/fertility/units.ts` (`fToC`, `cToF`).
- Never overwrite a manually logged value with an imported one.
- `npm run lint && npx tsc --noEmit && npm test` green before every commit.

---

### Task 1: CSV parser (pure domain)

**Files:**
- Create: `src/domain/fertility/bbt-import.ts`
- Test: `src/domain/fertility/bbt-import.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `parseBbtCsv(text: string): { readings: BbtReading[]; skipped: number }` where `BbtReading` is imported from `./bbt` (`{ date: ISODate; bbt: number /* °C */ }`).

Format spec (deliberately narrow, documented in the UI):
- Delimiter `,` or `;` (detect from the first data line).
- Two used columns: the first column that parses as a date, and the first column that parses as a plausible temperature. Extra columns ignored.
- Optional header row (skipped when its cells parse as neither).
- Dates: `YYYY-MM-DD` (also accepts a leading timestamp like `2026-07-01T06:12:00`, truncated to the date) and `M/D/YYYY`.
- Temperatures: decimal point or comma (`36,55` → `36.55`). Values ≥ 45 are treated as °F and converted with `fToC`; after conversion, anything outside **34–42 °C** is skipped (not an error — wearable exports contain gaps/garbage).
- Duplicate dates: **first occurrence wins** (files are typically chronological; the first reading of a day is the waking temp).
- Every unusable line increments `skipped`; a file with zero usable readings throws `Error('No temperature readings found — expected columns with a date and a temperature.')`.

- [ ] **Step 1: Write the failing tests:**

```ts
import { parseBbtCsv } from './bbt-import';

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
```

- [ ] **Step 2:** Run `npx vitest run src/domain/fertility/bbt-import.test.ts` — FAIL (module not found).
- [ ] **Step 3: Implement.** Sketch (complete the details; keep it one exported function + small helpers):

```ts
import type { ISODate } from '@/src/domain/types';
import type { BbtReading } from './bbt';
import { fToC } from './units';

const ISO_RE = /^(\d{4}-\d{2}-\d{2})/;
const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function parseDate(cell: string): ISODate | null {
  const iso = ISO_RE.exec(cell.trim());
  if (iso) return iso[1];
  const mdy = MDY_RE.exec(cell.trim());
  if (!mdy) return null;
  const [, m, d, y] = mdy;
  const mm = m.padStart(2, '0'), dd = d.padStart(2, '0');
  if (Number(m) > 12 || Number(d) > 31) return null;
  return `${y}-${mm}-${dd}`;
}

function parseTemp(cell: string): number | null {
  const n = Number(cell.trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const c = n >= 45 ? fToC(n) : n;
  return c >= 34 && c <= 42 ? c : null;
}

export function parseBbtCsv(text: string): { readings: BbtReading[]; skipped: number } {
  // ... split lines, detect ';' vs ',', per line find first date cell + first
  // temp cell, first-date-wins dedupe via a Map, count skips, throw if empty.
}
```

Careful: a cell like `2026` must not be read as a °F temperature on a line that has no date — require BOTH a date and a temp on the same line before accepting either. Count the header row as a skip only if it has cells but no reading (the tests pin the exact numbers).

- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ttc): CSV parser for BBT import"`

### Task 2: Merge into daily logs (repository)

**Files:**
- Modify: `src/data/repository.ts`
- Test: `src/data/repository.test.ts`

**Interfaces:**
- Consumes: `parseBbtCsv`'s output; existing `getDailyLog`, `upsertDailyLog`.
- Produces: `export async function importBbtReadings(readings: BbtReading[]): Promise<{ imported: number; skippedExisting: number }>`

- [ ] **Step 1: Failing tests:**

```ts
it('imports into empty days and merges into existing logs without clobbering', async () => {
  await upsertDailyLog({ date: '2026-07-02', symptoms: ['Cramps'], moods: [] });
  const res = await importBbtReadings([
    { date: '2026-07-01', bbt: 36.5 },
    { date: '2026-07-02', bbt: 36.6 },
  ]);
  expect(res).toEqual({ imported: 2, skippedExisting: 0 });
  expect((await getDailyLog('2026-07-01'))?.bbt).toBe(36.5);
  const merged = await getDailyLog('2026-07-02');
  expect(merged?.bbt).toBe(36.6);
  expect(merged?.symptoms).toEqual(['Cramps']); // untouched
});

it('never overwrites a manually logged bbt', async () => {
  await upsertDailyLog({ date: '2026-07-01', symptoms: [], moods: [], bbt: 36.8 });
  const res = await importBbtReadings([{ date: '2026-07-01', bbt: 36.1 }]);
  expect(res).toEqual({ imported: 0, skippedExisting: 1 });
  expect((await getDailyLog('2026-07-01'))?.bbt).toBe(36.8);
});
```

- [ ] **Step 2:** FAIL, then **Step 3: implement:**

```ts
// Bulk-merge imported temperatures. Existing bbt values win: a typed-in waking
// temp is ground truth; an import should fill gaps, not rewrite history.
export async function importBbtReadings(
  readings: BbtReading[],
): Promise<{ imported: number; skippedExisting: number }> {
  let imported = 0;
  let skippedExisting = 0;
  for (const r of readings) {
    const existing = await getDailyLog(r.date);
    if (existing?.bbt !== undefined) {
      skippedExisting++;
      continue;
    }
    await upsertDailyLog({ ...(existing ?? { date: r.date, symptoms: [], moods: [] }), bbt: r.bbt });
    imported++;
  }
  return { imported, skippedExisting };
}
```

(Import `BbtReading` type from `@/src/domain/fertility/bbt`.) Writes route through `upsertDailyLog` → `putRecord`, so encryption-at-rest and sync tracking apply automatically — do not bypass with direct Dexie writes.

- [ ] **Step 4:** PASS; full suite green. **Step 5: Commit** — `git commit -m "feat(ttc): merge imported BBT readings into daily logs"`

### Task 3: Import UI on the Fertility page

**Files:**
- Create: `src/components/BbtImport.tsx`
- Test: `src/components/BbtImport.test.tsx`
- Modify: `app/fertility/page.tsx` (render `<BbtImport />` below the existing BBT chart/section — read the page first and slot it where the BBT content lives)

Behavior:
- A bordered card matching the app's flat content style (see `lumen-ui-taste` note: no hero polish here — plain, minimal, like `DataControls`).
- `<input type="file" accept=".csv,text/csv" aria-label="import temperatures" />` + short helper text: "CSV with a date and a temperature per line. °F is converted automatically. Days you've already logged a temperature keep your value."
- On file pick: `file.text()` → `parseBbtCsv` → `importBbtReadings` → call `refresh()` from `useHealthData()` → show `role="status"` result: "Imported 31 temperatures (2 days skipped — already logged, 4 lines unreadable)." On parse error, show the error message in the standard red error style.
- Component appears only in TTC mode if the page itself isn't already TTC-gated (check `app/fertility/page.tsx` — the nav tile is TTC-only but the route is reachable directly).

- [ ] **Step 1: Failing component test** — render with a mocked `useHealthData` (`refresh` spy), fire a change event with `new File(['date,temp\n2026-07-01,36.5\n'], 't.csv', { type: 'text/csv' })`, `await screen.findByRole('status')`, assert the message contains "Imported 1", assert `refresh` was called, and assert `(await getDailyLog('2026-07-01'))?.bbt === 36.5`. Follow the mocking pattern used in `DataControls.test.tsx` (it already tests a file-import flow — copy its `File`/fireEvent approach).
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS, full suite green.
- [ ] **Step 5:** Update `docs/USER_GUIDE.md` (TTC section: how to export a CSV from common apps + the accepted format) and `docs/COMPETITIVE_BENCHMARKING.md` matrix row "Wearable / temperature import": ❌ → ⚠️ "CSV import (no live device link)".
- [ ] **Step 6: Commit** — `git commit -m "feat(ttc): BBT CSV import on fertility page"`

---

## Edge cases found while exploring (do not skip)

1. **Oura's "Temperature Deviation" column is NOT a temperature.** Oura exports relative deviation (e.g. `+0.3`), not absolute BBT. The 34–42 °C plausibility gate rejects those values automatically — do not "fix" the gate to accept them; converting deviations as temps would corrupt the thermal-shift detection in `bbt.ts`. The user guide should say deviation-only exports can't be imported.
2. **Existing manual BBT always wins** (`existing?.bbt !== undefined` — note `0` is impossible but `undefined` check, not truthiness, is deliberate).
3. **Merging must preserve the rest of the day's log** — `DailyLog` carries symptoms/moods/flow/TTC fields; a naive `putRecord('dailyLogs', date, { date, bbt })` would erase them. Spread the existing log.
4. **Rounding:** `fToC` rounds to 2 dp (`src/domain/fertility/units.ts`) — the parser must convert through it, not inline math, so imported and typed values round identically (the chart and shift detection compare raw numbers).
5. **Encryption/sync come free only via the funnel.** Any direct `db.dailyLogs` write would land plaintext rows on an encrypted device — always go through `upsertDailyLog`.
6. **Timestamps in date cells** (`2026-07-01T06:12:00`) are common in wearable exports — truncate, don't reject; but the timezone is ignored (the date as written wins; documented ceiling).
7. **`M/D/YYYY` vs `D/M/YYYY` is ambiguous** — spec picks US order (M/D) and the guard `Number(m) > 12` at least rejects impossible months. European `D.M.YYYY` files will misparse days ≤12 — accepted ceiling; add a format toggle only if users report it (`ponytail:` comment this in the parser).

## Acceptance criteria

- Importing a well-formed CSV on `/fertility` fills BBT on empty days, skips days with manual temps, reports counts, and the BBT chart re-renders with the imported points (visible via `refresh()`).
- A °F file (values ~97–99) lands as 36–37.x °C values.
- A garbage file shows the friendly error, imports nothing.
- With encryption on, imported rows appear in `db.records` (opaque), not `db.dailyLogs` — verify in the repository test by enabling a vault first (reuse `encryptExistingData` test setup).
- `npm run lint && npx tsc --noEmit && npm test` green.
