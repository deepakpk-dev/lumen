'use client';

import { useState, type FormEvent } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import type { TrackingGroup } from '@/src/domain/types';
import { TrackingOptions, trackingOptions } from './TrackingOptions';

export function PersonalizationControls() {
  const { loading, lifeStage } = useHealthData();
  if (loading) return null;

  return <PreferencesForm key={lifeStage} />;
}

function PreferencesForm() {
  const { personalization, lifeStage, updatePersonalization } = useHealthData();
  const [cycle, setCycle] = useState(personalization?.cycleLength?.toString() ?? '');
  const [period, setPeriod] = useState(personalization?.periodLength?.toString() ?? '');
  const [tracking, setTracking] = useState<TrackingGroup[]>(personalization?.tracking ?? []);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const cycleStage = lifeStage !== 'pregnancy' && lifeStage !== 'postpartum';

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePersonalization({ tracking, ...(cycleStage ? { cycleLength: cycle ? Number(cycle) : undefined, periodLength: period ? Number(period) : undefined } : {}) });
      setMessage('Preferences saved.');
    } catch {
      setMessage('Preferences couldn’t be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={save}>
      {cycleStage && (
        <>
          <p className="text-xs lumen-muted">Lumen uses these estimates until you have enough logged history.</p>
          <label className="setup-label">Typical cycle length (days)
            <input className="lumen-field mt-1" type="number" min={20} max={45} value={cycle} placeholder="Optional" onChange={(e) => setCycle(e.target.value)} />
          </label>
          <label className="setup-label">Period duration (days)
            <input className="lumen-field mt-1" type="number" min={2} max={8} value={period} placeholder="Optional" onChange={(e) => setPeriod(e.target.value)} />
          </label>
        </>
      )}
      <p className="text-xs lumen-muted">Choose which fields appear first in your daily check-in.</p>
      <TrackingOptions choices={trackingOptions(lifeStage)} selected={tracking} onChange={setTracking} />
      <button type="submit" className="lumen-button" disabled={saving}>Save preferences</button>
      {message && <p className="lumen-note" role="status">{message}</p>}
    </form>
  );
}
