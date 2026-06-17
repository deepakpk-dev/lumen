'use client';

import { useEffect, useState } from 'react';
import type { FlowIntensity, ISODate } from '@/src/domain/types';
import { useHealthData } from '@/src/state/useHealthData';
import {
  FLOW_OPTIONS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/src/domain/log-options';

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

export function DailyLogForm({ date }: { date: ISODate }) {
  const { dailyLogs, saveLog, startPeriod, cycles } = useHealthData();
  const existing = dailyLogs.find((l) => l.date === date);

  const [flow, setFlow] = useState<FlowIntensity>('none');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (existing) {
      setFlow(existing.flow ?? 'none');
      setSymptoms(existing.symptoms);
      setMoods(existing.moods);
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function handleSave() {
    await saveLog({ date, flow, symptoms, moods, notes: notes || undefined });
    const hasFlow = flow !== 'none';
    const cycleExists = cycles.some((c) => c.startDate === date);
    if (hasFlow && !cycleExists) await startPeriod(date);
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
