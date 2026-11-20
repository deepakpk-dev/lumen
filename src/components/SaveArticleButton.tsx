'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { LumenIcon } from './LumenIcon';

export function SaveArticleButton({ slug }: { slug: string }) {
  const { personalization, updatePersonalization, loading } = useHealthData();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const saved = personalization?.savedArticles ?? [];
  const isSaved = saved.includes(slug);

  async function toggle() {
    setSaving(true);
    setError(false);
    try {
      await updatePersonalization({ savedArticles: isSaved ? saved.filter((item) => item !== slug) : [...saved, slug] });
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={loading || saving} aria-pressed={isSaved} className="lumen-outline" onClick={toggle}>
        <LumenIcon name={isSaved ? 'check' : 'add'} size={17} /> {isSaved ? 'Saved article' : 'Save article'}
      </button>
      {error && <p role="alert" className="lumen-note mt-2">{isSaved ? 'Couldn’t remove the saved article. Try again.' : 'Couldn’t save the article. Try again.'}</p>}
    </div>
  );
}
