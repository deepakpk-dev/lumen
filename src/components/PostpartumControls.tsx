'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';

export function PostpartumControls() {
  const {
    isPostpartum, postpartumProfile, epdsEntries,
    setPostpartumBreastfeeding, updateBirthDate, endPostpartumMode,
  } = useHealthData();
  const [editBirth, setEditBirth] = useState('');
  const [ending, setEnding] = useState(false);

  if (!isPostpartum || !postpartumProfile) return null;

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={postpartumProfile.breastfeeding ?? false}
          onChange={(e) => setPostpartumBreastfeeding(e.target.checked)}
        />
        I am breastfeeding
      </label>

      <div className="flex items-end gap-2">
        <label className="flex-1 text-sm">
          Edit birth date
          <input
            type="date"
            aria-label="edit birth date"
            value={editBirth}
            onChange={(e) => setEditBirth(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={() => editBirth && updateBirthDate(editBirth)}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Save
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-neutral-600">Mood check-in history</h3>
        {epdsEntries.length === 0 ? (
          <p className="text-sm text-neutral-500">No check-ins yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700">
            {epdsEntries.map((e) => (
              <li key={e.id}>
                {e.date} — {e.total} / 30 ({e.band})
              </li>
            ))}
          </ul>
        )}
      </div>

      {!ending ? (
        <button
          type="button"
          onClick={() => setEnding(true)}
          className="w-full rounded-md border px-4 py-2 text-sm text-neutral-700"
        >
          End postpartum mode
        </button>
      ) : (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm text-neutral-700">Where would you like to go next?</p>
          <button
            type="button"
            onClick={() => endPostpartumMode('cycle')}
            className="w-full rounded-md border px-4 py-2 text-sm"
          >
            Back to cycle tracking
          </button>
          <button
            type="button"
            onClick={() => endPostpartumMode('ttc')}
            className="w-full rounded-md border px-4 py-2 text-sm"
          >
            Start trying to conceive
          </button>
          <button
            type="button"
            onClick={() => setEnding(false)}
            className="w-full rounded-md px-4 py-2 text-sm text-neutral-500"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
