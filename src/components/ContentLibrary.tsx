// src/components/ContentLibrary.tsx
'use client';

import { useMemo, useState } from 'react';
import type { ContentArticle, ScoredArticle } from '@/src/domain/content/types';
import type { CyclePhase } from '@/src/domain/types';
import { ContentCard } from './ContentCard';

const CYCLE_PHASES: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];

const FOR_YOU_COUNT = 3;

export function ContentLibrary({
  feed,
  all,
}: {
  feed: ScoredArticle[];
  all: ContentArticle[];
}) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [phase, setPhase] = useState('all');

  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const a of all) for (const t of a.topics) set.add(t);
    return [...set].sort();
  }, [all]);

  const forYou = feed.slice(0, FOR_YOU_COUNT);

  const browse = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      const matchesTopic = topic === 'all' || a.topics.includes(topic as ContentArticle['topics'][number]);
      const matchesPhase = phase === 'all' || a.phases.includes(phase as CyclePhase);
      const matchesQuery =
        q === '' ||
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q);
      return matchesTopic && matchesPhase && matchesQuery;
    });
  }, [all, query, topic, phase]);

  return (
    <div className="space-y-6">
      {forYou.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">For you</h2>
          {forYou.map((f) => (
            <ContentCard
              key={f.article.slug}
              article={f.article}
              reason={f.matchReasons[0]}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Browse</h2>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search articles"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <label className="sr-only" htmlFor="topic-filter">
            Topic
          </label>
          <select
            id="topic-filter"
            aria-label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="all">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="phase-filter">
            Phase
          </label>
          <select
            id="phase-filter"
            aria-label="Phase"
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="all">All phases</option>
            {CYCLE_PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {browse.length === 0 ? (
          <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-600">
            No articles match your search.
          </p>
        ) : (
          <div className="space-y-3">
            {browse.map((a) => (
              <ContentCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
