'use client';

import { PageShell } from '@/src/components/PageShell';
import { useHealthData } from '@/src/state/useHealthData';
import { ContentLibrary } from '@/src/components/ContentLibrary';
import { ARTICLES } from '@/src/content';
import Link from 'next/link';
import { LumenIcon } from '@/src/components/LumenIcon';

export default function LibraryPage() {
  const { contentFeed, loading, lifeStage, personalization } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  // Browse the reads that belong to the current life stage (plus any universal
  // ones). The "For you" feed is already stage-scoped by the content engine.
  const stageArticles = ARTICLES.filter(
    (a) => a.lifeStages.length === 0 || a.lifeStages.includes(lifeStage),
  );
  return (
    <PageShell title="Library" subtitle="Browse health articles for your current tracking mode." backHref={null}>
      {stageArticles.length > 0 ? (
        <ContentLibrary feed={contentFeed} all={stageArticles} saved={personalization?.savedArticles} />
      ) : (
        <p className="lumen-card lumen-help">
          There are no articles for this tracking mode yet.
        </p>
      )}
      <Link href="/programs" className="lumen-outline w-full"><LumenIcon name="book" /> Browse programs</Link>
    </PageShell>
  );
}
