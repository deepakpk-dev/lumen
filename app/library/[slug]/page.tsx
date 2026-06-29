'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { findArticle } from '@/src/content';
import { ArticleReader } from '@/src/components/ArticleReader';

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const article = findArticle(params.slug);

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <Link
        href="/library"
        className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-neutral-500 transition hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-neutral-400 dark:hover:text-rose-300"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to library
      </Link>
      {article ? (
        <ArticleReader article={article} />
      ) : (
        <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          Article not found.
        </p>
      )}
    </main>
  );
}
