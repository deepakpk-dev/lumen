'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';
import { PregnancyEndFlow } from '@/src/components/PregnancyEndFlow';

type Method = 'due' | 'lmp' | 'cycle';

export function PregnancyControls({ onStarted, onEnded }: { onStarted?: () => void; onEnded?: () => void }) {
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
        <p className="lumen-help">
          Pregnancy mode is on. Due date: <span className="font-medium">{pregnancyProfile.dueDate}</span>.
        </p>
        <div className="lumen-actions items-end">
          <label className="setup-label mb-0">
            Edit due date
            <input
              type="date"
              aria-label="edit due date"
              value={editDue}
              onChange={(e) => setEditDue(e.target.value)}
              className="lumen-field mt-1"
            />
          </label>
          <button
            type="button"
            onClick={() => editDue && updateDueDate(editDue, 'manual')}
            className="lumen-outline"
            disabled={!editDue}
          >
            Save
          </button>
        </div>
        <PregnancyEndFlow onEnded={onEnded} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="min-w-0">
        <legend className="setup-label">How would you like to start?</legend>
        <label className="lumen-choice-row">
          <input
            type="radio"
            name="preg-method"
            className="lumen-check"
            checked={method === 'due'}
            onChange={() => setMethod('due')}
          />
          <span>Enter my due date</span>
        </label>
        <label className="lumen-choice-row">
          <input
            type="radio"
            name="preg-method"
            className="lumen-check"
            checked={method === 'lmp'}
            onChange={() => setMethod('lmp')}
          />
          <span>Enter my last period date (LMP)</span>
        </label>
        <label className="lumen-choice-row">
          <input
            type="radio"
            name="preg-method"
            className="lumen-check"
            checked={method === 'cycle'}
            onChange={() => setMethod('cycle')}
            disabled={!lastPeriodStart}
          />
          <span>Use my last logged period{lastPeriodStart ? ` (${lastPeriodStart})` : ' (none yet)'}</span>
        </label>
      </fieldset>

      {method !== 'cycle' && (
        <label className="setup-label">
          {method === 'due' ? 'Due date' : 'Last period start'}
          <input
            type="date"
            aria-label={method === 'due' ? 'due date' : 'last period start'}
            max={method === 'lmp' ? todayISO() : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="lumen-field mt-1"
          />
        </label>
      )}

      <button type="button" onClick={start} disabled={method === 'cycle' ? !lastPeriodStart : !value} className="lumen-button w-full">
        Start pregnancy mode
      </button>
    </div>
  );
}
