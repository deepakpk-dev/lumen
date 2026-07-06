import { ARTICLES, findArticle } from '@/src/content';
import { ArticleReader } from '@/src/components/ArticleReader';
import { PageShell } from '@/src/components/PageShell';

// All article content ships in the bundle, so prerender every slug. This makes
// the route static, which lets <Link> fully prefetch it — without this, dynamic
// routes skip prefetching and every tap waits on a server round trip.
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = findArticle((await params).slug);

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
