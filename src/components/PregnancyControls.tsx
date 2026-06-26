'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';
import { PregnancyEndFlow } from '@/src/components/PregnancyEndFlow';

type Method = 'due' | 'lmp' | 'cycle';

export function PregnancyControls({ onStarted }: { onStarted?: () => void }) {
  const { isPregnant, pregnancyProfile, startPregnancyMode, updateDueDate, cycles } =
    useHealthData();
  const [method, setMethod] = useState<Method>('due');
  const [value, setValue] = useState('');
  const [editDue, setEditDue] = useState('');

  const lastPeriodStart = cycles.at(-1)?.startDate ?? null;

  async function start() {
    if (method === 'due') {
      if (!value) return;
      await startPregnancyMode({ dueDate: value });
    } else if (method === 'lmp') {
      if (!value) return;
      await startPregnancyMode({ lmp: value });
    } else {
      if (!lastPeriodStart) return;
      await startPregnancyMode({ lmp: lastPeriodStart, source: 'cycle', useCycleLength: true });
    }
    onStarted?.();
  }

  if (isPregnant && pregnancyProfile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Pregnancy mode is on. Due date: <span className="font-medium">{pregnancyProfile.dueDate}</span>.
        </p>
        <div className="flex items-end gap-2">
          <label className="flex-1 text-sm">
            Edit due date
            <input
              type="date"
              aria-label="edit due date"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
            />
          </label>
          <button
            type="button"
            onClick={() => editDue && updateDueDate(editDue, 'manual')}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Save
          </button>
        </div>
        <PregnancyEndFlow />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2 text-sm">
        <legend className="text-neutral-700 dark:text-neutral-300">How would you like to start?</legend>
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="preg-method"
            aria-label="Enter estimated delivery date"
            checked={method === 'due'}
            onChange={() => setMethod('due')}
          />
          <span>Enter my due date</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="preg-method"
            aria-label="Enter my last period date"
            checked={method === 'lmp'}
            onChange={() => setMethod('lmp')}
          />
          <span>Enter my last period date (LMP)</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="preg-method"
            aria-label={`Use my last logged period${lastPeriodStart ? ` (${lastPeriodStart})` : ' (none yet)'}`}
            checked={method === 'cycle'}
            onChange={() => setMethod('cycle')}
            disabled={!lastPeriodStart}
          />
          <span>Use my last logged period{lastPeriodStart ? ` (${lastPeriodStart})` : ' (none yet)'}</span>
        </div>
      </fieldset>

      {method !== 'cycle' && (
        <label className="block text-sm">
          {method === 'due' ? 'Due date' : 'Last period start'}
          <input
            type="date"
            aria-label={method === 'due' ? 'due date' : 'last period start'}
            max={method === 'lmp' ? todayISO() : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          />
        </label>
      )}

      <button type="button" onClick={start} className="w-full rounded-md bg-rose-600 px-4 py-3 text-white">
        Start pregnancy mode
      </button>
    </div>
  );
}
