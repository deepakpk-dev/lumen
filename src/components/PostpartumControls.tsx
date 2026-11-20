'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';

export function PostpartumControls() {
  const {
    isPostpartum, postpartumProfile, epdsEntries,
    setPostpartumBreastfeeding, updateBirthDate, endPostpartumMode,
  } = useHealthData();
  const [editBirth, setEditBirth] = useState(postpartumProfile?.birthDate ?? '');
  const [ending, setEnding] = useState(false);

  if (!isPostpartum || !postpartumProfile) return null;

  return (
    <div className="space-y-4">
      <label className="lumen-choice-row">
        <input
          type="checkbox"
          className="lumen-check"
          checked={postpartumProfile.breastfeeding ?? false}
          onChange={(e) => setPostpartumBreastfeeding(e.target.checked)}
        />
        I am breastfeeding
      </label>

      <div className="lumen-actions items-end">
        <label className="setup-label mb-0">
          Edit birth date
          <input
            type="date"
            aria-label="edit birth date"
            value={editBirth}
            onChange={(e) => setEditBirth(e.target.value)}
            className="lumen-field mt-1"
          />
        </label>
        <button
          type="button"
          onClick={() => editBirth && updateBirthDate(editBirth)}
          className="lumen-outline"
          disabled={!editBirth}
        >
          Save
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold">Mood check-in history</h3>
        {epdsEntries.length === 0 ? (
          <p className="lumen-help">No check-ins yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
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
          className="lumen-outline w-full"
        >
          End postpartum mode
        </button>
      ) : (
        <div className="lumen-panel space-y-3">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">Where would you like to go next?</p>
          <button
            type="button"
            onClick={() => endPostpartumMode('cycle')}
            className="lumen-outline w-full"
          >
            Back to cycle tracking
          </button>
          <button
            type="button"
            onClick={() => endPostpartumMode('ttc')}
            className="lumen-outline w-full"
          >
            Start trying to conceive
          </button>
          <button
            type="button"
            onClick={() => setEnding(false)}
            className="lumen-text-link w-full justify-center"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
