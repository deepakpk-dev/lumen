import Link from 'next/link';
import type { ContentArticle } from '@/src/domain/content/types';

export function ContentCard({
  article,
  reason,
}: {
  article: ContentArticle;
  reason?: string;
}) {
  return (
    <Link
      href={`/library/${article.slug}`}
      className="block rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-rose-300"
    >
      {reason && (
        <p className="mb-1 text-xs font-medium text-rose-600">{reason}</p>
      )}
      <h3 className="font-semibold">{article.title}</h3>
      <p className="mt-1 text-sm text-neutral-700">{article.summary}</p>
      <p className="mt-2 text-xs text-neutral-500">
        {article.readingMinutes} min read
      </p>
    </Link>
  );
}
