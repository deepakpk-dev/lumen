import Link from 'next/link';
import type { ContentArticle } from '@/src/domain/content/types';
import { LumenIcon } from './LumenIcon';

export function ArticleArt({ article }: { article: ContentArticle }) {
  const topic = article.topics[0];
  const sage = topic === 'wellbeing' || topic === 'postpartum';
  const lilac = topic === 'menstruation' || topic === 'menopause' || topic === 'pms';
  return (
    <div className={`lumen-article-art${sage ? ' is-sage' : lilac ? ' is-lilac' : ''}`} aria-hidden="true">
      <LumenIcon name={sage ? 'leaf' : lilac ? 'wave' : topic === 'pregnancy' ? 'heart' : 'flower'} size={73} />
    </div>
  );
}

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
      className="lumen-card lumen-reading-card p-0"
    >
      <ArticleArt article={article} />
      <div className="p-4">
      {reason && (
        <p className="lumen-eyebrow">{reason}</p>
      )}
      <h3 className="lumen-editorial-title">{article.title}</h3>
      <p className="lumen-subtitle">{article.summary}</p>
      <p className="lumen-muted mt-4 flex justify-between text-xs">
        {article.readingMinutes} min read <LumenIcon name="arrow" size={15} />
      </p>
      </div>
    </Link>
  );
}
