'use client';

import Link from 'next/link';
import { useHealthData } from '@/src/state/useHealthData';
import { ContentLibrary } from '@/src/components/ContentLibrary';
import { ARTICLES } from '@/src/content';

export default function LibraryPage() {
  const { contentFeed, loading } = useHealthData();
  if (loading) return <main className="p-6">Loading…</main>;
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Library</h1>
        <Link href="/" className="text-sm text-neutral-500 underline dark:text-neutral-400">
          Home
        </Link>
      </div>
      <ContentLibrary feed={contentFeed} all={ARTICLES} />
    </main>
  );
}
