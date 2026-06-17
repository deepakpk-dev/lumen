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
      <Link href="/library" className="text-sm text-neutral-500 underline">
        ← Back to library
      </Link>
      {article ? (
        <ArticleReader article={article} />
      ) : (
        <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600">
          Article not found.
        </p>
      )}
    </main>
  );
}
