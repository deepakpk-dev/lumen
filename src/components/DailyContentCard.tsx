import type { ContentArticle } from '@/src/domain/content/types';
import { ContentCard } from './ContentCard';

export function DailyContentCard({
  article,
}: {
  article: ContentArticle | null;
}) {
  if (!article) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Today&apos;s read
      </h2>
      <ContentCard article={article} />
    </section>
  );
}
