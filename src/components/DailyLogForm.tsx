'use client';

import { useEffect, useState } from 'react';
import type { FlowIntensity, ISODate, LHResult, MucusType } from '@/src/domain/types';
import { useHealthData } from '@/src/state/useHealthData';
import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  PREGNANCY_SYMPTOM_OPTIONS,
  POSTPARTUM_SYMPTOM_OPTIONS,
  POSTPARTUM_MOOD_OPTIONS,
  MUCUS_OPTIONS,
  LH_OPTIONS,
} from '@/src/domain/log-options';
import { cToF, fToC } from '@/src/domain/fertility/units';
import { daysBetween } from '@/src/domain/dates';

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm ${
        active
          ? 'border-rose-600 bg-rose-600 text-white'
          : 'border-neutral-300 dark:border-neutral-700'
      }`}
    >
      {label}
    </button>
  );
}

function isPeriodFlow(flow: FlowIntensity): boolean {
  return flow === 'light' || flow === 'medium' || flow === 'heavy';
}

// A flow day continues the current period if it lands within this many days of
// the last recorded bleeding day (forgiving a single missed log). A larger gap
// means a new period has started. Anchoring to the last bleeding day — rather
// than the period's start — keeps periods longer than the user's average from
// being split into a phantom new cycle.
const MAX_PERIOD_GAP_DAYS = 2;

export function DailyLogForm({ date }: { date: ISODate }) {
  const {
    dailyLogs,
    saveLog,
    startPeriod,
    endPeriod,
    cycles,
    lifeStage,
    bbtUnit,
    isPregnant,
  } = useHealthData();
  const existing = dailyLogs.find((l) => l.date === date);

  const isPostpartum = lifeStage === 'postpartum';

  const symptomChoices = isPregnant
    ? Array.from(new Set([...SYMPTOM_OPTIONS, ...PREGNANCY_SYMPTOM_OPTIONS]))
    : isPostpartum
      ? POSTPARTUM_SYMPTOM_OPTIONS
      : SYMPTOM_OPTIONS;

  const moodChoices = isPostpartum ? POSTPARTUM_MOOD_OPTIONS : MOOD_OPTIONS;

  const [flow, setFlow] = useState<FlowIntensity>('none');
  const [lochia, setLochia] = useState<FlowIntensity>('none');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  // TTC fields
  const [bbt, setBbt] = useState('');
  const [lh, setLh] = useState<LHResult | undefined>(undefined);
  const [mucus, setMucus] = useState<MucusType | undefined>(undefined);
  const [intercourse, setIntercourse] = useState(false);
  const [protectedSex, setProtectedSex] = useState(false);

  useEffect(() => {
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form fields from the selected date's saved log
      setFlow(existing.flow ?? 'none');
      setLochia(existing.lochia ?? 'none');
      setSymptoms(existing.symptoms);
      setMoods(existing.moods);
      setNotes(existing.notes ?? '');
      setBbt(
        existing.bbt === undefined
          ? ''
          : String(bbtUnit === 'F' ? cToF(existing.bbt) : existing.bbt),
      );
      setLh(existing.lh);
      setMucus(existing.mucus);
      setIntercourse(existing.intercourse ?? false);
      setProtectedSex(existing.intercourseProtected ?? false);
    }
  }, [existing, bbtUnit]);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function handleSave() {
    if (isPostpartum) {
      await saveLog({
        date,
        flow: 'none',
        lochia,
        symptoms,
        moods,
        notes: notes || undefined,
      });
      setSaved(true);
      return;
    }
    const parsedBbt = bbt.trim() === '' ? undefined : Number(bbt);
    const bbtC =
      parsedBbt === undefined
        ? undefined
        : bbtUnit === 'F'
          ? fToC(parsedBbt)
          : parsedBbt;
    await saveLog({
      date,
      flow,
      symptoms,
      moods,
      notes: notes || undefined,
      ...(lifeStage === 'ttc'
        ? {
            bbt: bbtC,
            lh,
            mucus,
            intercourse: intercourse || undefined,
            intercourseProtected: intercourse ? protectedSex : undefined,
          }
        : {}),
    });
    if (isPeriodFlow(flow) && !cycles.some((c) => c.startDate === date)) {
      const previousCycle = [...cycles]
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .filter((c) => c.startDate < date)
        .at(-1);
      const lastBleedDay = previousCycle
        ? previousCycle.endDate ?? previousCycle.startDate
        : undefined;

      if (
        previousCycle &&
        lastBleedDay &&
        daysBetween(lastBleedDay, date) <= MAX_PERIOD_GAP_DAYS
      ) {
        if (date > lastBleedDay) await endPeriod(previousCycle.id, date);
      } else {
        await startPeriod(date);
      }
    }
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      {isPostpartum ? (
        <section>
          <h2 className="mb-2 text-sm font-medium">Lochia (bleeding)</h2>
          <div className="flex flex-wrap gap-2">
            {FLOW_OPTIONS.map((f) => (
              <Chip key={f} label={f} active={lochia === f} onClick={() => setLochia(f)} />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h2 className="mb-2 text-sm font-medium">Flow</h2>
          <div className="flex flex-wrap gap-2">
            {FLOW_OPTIONS.map((f) => (
              <Chip key={f} label={f} active={flow === f} onClick={() => setFlow(f)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium">Symptoms</h2>
        <div className="flex flex-wrap gap-2">
          {symptomChoices.map((s) => (
            <Chip
              key={s}
              label={s}
              active={symptoms.includes(s)}
              onClick={() => setSymptoms((prev) => toggle(prev, s))}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Mood</h2>
        <div className="flex flex-wrap gap-2">
          {moodChoices.map((m) => (
            <Chip
              key={m}
              label={m}
              active={moods.includes(m)}
              onClick={() => setMoods((prev) => toggle(prev, m))}
            />
          ))}
        </div>
      </section>

      <section>
        <label htmlFor="notes" className="mb-2 block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-transparent"
          rows={3}
        />
      </section>

      {lifeStage === 'ttc' && (
        <section className="space-y-4 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <div>
            <label htmlFor="bbt" className="mb-2 block text-sm font-medium">
              Basal body temperature (°{bbtUnit})
            </label>
            <input
              id="bbt"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={bbt}
              onChange={(e) => setBbt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 p-2 dark:border-neutral-700 dark:bg-transparent"
            />
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium">Ovulation test (LH)</h2>
            <div className="flex flex-wrap gap-2">
              {LH_OPTIONS.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  active={lh === o}
                  onClick={() => setLh(lh === o ? undefined : o)}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-medium">Cervical mucus</h2>
            <div className="flex flex-wrap gap-2">
              {MUCUS_OPTIONS.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  active={mucus === o}
                  onClick={() => setMucus(mucus === o ? undefined : o)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={intercourse}
                onChange={(e) => setIntercourse(e.target.checked)}
              />
              Intercourse
            </label>
            {intercourse && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={protectedSex}
                  onChange={(e) => setProtectedSex(e.target.checked)}
                />
                Protected
              </label>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="w-full rounded-md bg-rose-600 px-4 py-3 font-medium text-white"
      >
        Save
      </button>
      {saved && <p className="text-center text-sm text-green-700">Saved</p>}
    </div>
  );
}
