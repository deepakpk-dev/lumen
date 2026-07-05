'use client';

import { PageShell } from '@/src/components/PageShell';
import { useHealthData } from '@/src/state/useHealthData';
import { ContentLibrary } from '@/src/components/ContentLibrary';
import { ARTICLES } from '@/src/content';

export default function LibraryPage() {
  const { contentFeed, loading, lifeStage } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  // Browse the reads that belong to the current life stage (plus any universal
  // ones). The "For you" feed is already stage-scoped by the content engine.
  const stageArticles = ARTICLES.filter(
    (a) => a.lifeStages.length === 0 || a.lifeStages.includes(lifeStage),
  );
  return (
    <PageShell title="Library">
      {stageArticles.length > 0 ? (
        <ContentLibrary feed={contentFeed} all={stageArticles} />
      ) : (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          Guidance for this stage is on its way. In the meantime, look for tips
          tailored to where you are on its own screen.
        </p>
      )}
    </PageShell>
  );
}
