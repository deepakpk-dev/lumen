// src/components/ArticleReader.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ContentArticle } from '@/src/domain/content/types';

export function ArticleReader({ article }: { article: ContentArticle }) {
  return (
    <article className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {article.readingMinutes} min read
        </p>
      </header>

      <div className="space-y-3 text-neutral-800 dark:text-neutral-200">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: (props) => <h2 className="mt-4 text-lg font-semibold" {...props} />,
            p: (props) => <p className="text-sm leading-relaxed" {...props} />,
            ul: (props) => <ul className="list-disc pl-5 text-sm" {...props} />,
            li: (props) => <li className="mt-1" {...props} />,
            a: (props) => (
              <a
                className="text-rose-600 underline"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              />
            ),
          }}
        >
          {article.body}
        </ReactMarkdown>
      </div>

      <section className="rounded-2xl bg-neutral-50 p-4 text-sm dark:bg-neutral-900">
        <h2 className="font-semibold">Sources</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {article.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-600 underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          {article.medicalReviewer} · Last reviewed {article.lastReviewed}
        </p>
      </section>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        This is general education, not a substitute for professional medical
        advice. If you&apos;re concerned about your health, contact a clinician.
      </p>
    </article>
  );
}
