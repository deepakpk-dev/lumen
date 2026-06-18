'use client';

import { useEffect, useState } from 'react';
import type { FlowIntensity, ISODate, LHResult, MucusType } from '@/src/domain/types';
import { useHealthData } from '@/src/state/useHealthData';
import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
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
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? 'border-rose-600 bg-rose-600 text-white' : 'border-neutral-300'
      }`}
    >
      {label}
    </button>
  );
}

function isPeriodFlow(flow: FlowIntensity): boolean {
  return flow === 'light' || flow === 'medium' || flow === 'heavy';
}

export function DailyLogForm({ date }: { date: ISODate }) {
  const {
    dailyLogs,
    saveLog,
    startPeriod,
    endPeriod,
    cycles,
    stats,
    lifeStage,
    bbtUnit,
  } = useHealthData();
  const existing = dailyLogs.find((l) => l.date === date);

  const [flow, setFlow] = useState<FlowIntensity>('none');
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
      const end = previousCycle?.endDate ?? previousCycle?.startDate;
      const extendsCurrentPeriod =
        previousCycle !== undefined &&
        end !== undefined &&
        daysBetween(previousCycle.startDate, date) < stats.averagePeriodLength;

      if (extendsCurrentPeriod) {
        if (date > end) await endPeriod(previousCycle.id, date);
      } else {
        await startPeriod(date);
      }
    }
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium">Flow</h2>
        <div className="flex flex-wrap gap-2">
          {FLOW_OPTIONS.map((f) => (
            <Chip key={f} label={f} active={flow === f} onClick={() => setFlow(f)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Symptoms</h2>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_OPTIONS.map((s) => (
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
          {MOOD_OPTIONS.map((m) => (
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
          className="w-full rounded-md border border-neutral-300 p-2"
          rows={3}
        />
      </section>

      {lifeStage === 'ttc' && (
        <section className="space-y-4 rounded-md border border-neutral-200 p-3">
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
              className="w-full rounded-md border border-neutral-300 p-2"
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
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white"
      >
        Save
      </button>
      {saved && <p className="text-center text-sm text-green-700">Saved</p>}
    </div>
  );
}
