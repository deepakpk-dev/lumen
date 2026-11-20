'use client';

import { useMemo, useState } from 'react';
import type { ContentArticle, ScoredArticle } from '@/src/domain/content/types';
import type { CyclePhase } from '@/src/domain/types';
import { ContentCard } from './ContentCard';
import { LumenIcon } from './LumenIcon';

const phases: CyclePhase[] = ['menstrual', 'follicular', 'ovulation', 'luteal'];
const labels: Record<ContentArticle['topics'][number], string> = {
  'getting-started': 'Getting started', menstruation: 'Your cycle', fertility: 'Fertility',
  pms: 'PMS', symptoms: 'Symptoms', 'irregular-cycles': 'Irregular cycles', wellbeing: 'Wellbeing',
  pregnancy: 'Pregnancy', postpartum: 'Postpartum', menopause: 'Perimenopause',
};

export function ContentLibrary({ feed, all, saved = [] }: {
  feed: ScoredArticle[];
  all: ContentArticle[];
  saved?: string[];
}) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [phase, setPhase] = useState('all');
  const topics = useMemo(() => [...new Set(all.flatMap((article) => article.topics))].sort(), [all]);
  const forYou = feed.slice(0, 3);
  const q = query.trim().toLowerCase();
  const browse = all.filter((article) => {
    const matchesTopic = topic === 'all' || (topic === 'saved' ? saved.includes(article.slug) : article.topics.includes(topic as ContentArticle['topics'][number]));
    const matchesPhase = phase === 'all' || article.phases.includes(phase as CyclePhase);
    return matchesTopic && matchesPhase && (article.title.toLowerCase().includes(q) || article.summary.toLowerCase().includes(q));
  });

  return (
    <div className="lumen-stack">
      <div className="lumen-search">
        <LumenIcon name="search" size={19} />
        <label className="sr-only" htmlFor="library-search">Search the library</label>
        <input id="library-search" type="search" className="lumen-field" placeholder="Search articles" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="lumen-filters" aria-label="Article topics" role="group">
        {[['all', 'All'], ...topics.map((key) => [key, labels[key]]), ['saved', 'Saved']].map(([key, label]) => (
          <button type="button" key={key} className="lumen-chip" aria-pressed={topic === key} onClick={() => setTopic(key)}>{label}</button>
        ))}
      </div>
      {all.some((article) => article.phases.length > 0) && (
        <details className="text-sm lumen-muted">
          <summary className="cursor-pointer py-2">Filter by cycle phase{phase !== 'all' ? ` · ${phase}` : ''}</summary>
          <label className="setup-label">Phase
            <select className="lumen-field mt-1" value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option value="all">All phases</option>
              {phases.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
            </select>
          </label>
        </details>
      )}
      {forYou.length > 0 && topic === 'all' && phase === 'all' && (
        <section className="lumen-stack">
          <h2 className="lumen-card-title">For you</h2>
          {forYou.map((entry) => <ContentCard key={entry.article.slug} article={entry.article} reason={entry.matchReasons[0]} />)}
        </section>
      )}
      <section className="lumen-stack">
        <h2 className="lumen-card-title">{topic === 'saved' ? 'Saved articles' : 'Browse articles'}</h2>
        {browse.length === 0 ? (
          <p className="lumen-card lumen-muted wrap-anywhere text-sm" role="status">
            {topic === 'saved' && !q && phase === 'all'
              ? 'No saved articles for this tracking mode. Save an article to find it here.'
              : q ? `No articles match “${query.trim()}”. Try a different search or change your filters.`
                : 'No articles match these filters. Choose another topic or cycle phase.'}
          </p>
        ) : browse.map((article) => <ContentCard key={article.slug} article={article} />)}
      </section>
    </div>
  );
}
