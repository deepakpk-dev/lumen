'use client';

import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { ContentLibrary } from '@/src/components/ContentLibrary';
import { ARTICLES } from '@/src/content';

export default function LibraryPage() {
  const { contentFeed, loading, lifeStage } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Library</h1>
        <Link href="/" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Home
        </Link>
      </div>
      {lifeStage === 'cycle' ? (
        <ContentLibrary feed={contentFeed} all={ARTICLES} />
      ) : (
        <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          These reads cover cycle tracking and are available in cycle mode. While
          you&apos;re in your current mode, look for guidance tailored to this
          stage on its own screen.
        </p>
      )}
    </main>
  );
}
