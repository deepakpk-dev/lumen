'use client';

import { useParams } from 'next/navigation';
import { findArticle } from '@/src/content';
import { ArticleReader } from '@/src/components/ArticleReader';
import { PageShell } from '@/src/components/PageShell';

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const article = findArticle(params.slug);

  return (
    <PageShell backHref="/library" backLabel="Library">
      {article ? (
        <ArticleReader article={article} />
      ) : (
        <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          Article not found.
        </p>
      )}
    </PageShell>
  );
}
