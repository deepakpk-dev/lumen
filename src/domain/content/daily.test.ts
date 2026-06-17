// src/domain/content/daily.test.ts
import { describe, it, expect } from 'vitest';
import { selectDailyContent } from './daily';
import type { ScoredArticle, ContentArticle } from './types';

function scored(slug: string): ScoredArticle {
  const article = { slug, title: slug } as unknown as ContentArticle;
  return { article, score: 0, matchReasons: [] };
}

describe('selectDailyContent', () => {
  it('returns null for an empty feed', () => {
    expect(selectDailyContent([], '2026-06-17')).toBeNull();
  });

  it('is stable for the same day', () => {
    const feed = ['a', 'b', 'c', 'd', 'e', 'f'].map(scored);
    const first = selectDailyContent(feed, '2026-06-17');
    const second = selectDailyContent(feed, '2026-06-17');
    expect(first).toBe(second);
  });

  it('only ever picks from the top slice', () => {
    const feed = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(scored);
    const topSlugs = new Set(['a', 'b', 'c', 'd', 'e']);
    for (let d = 1; d <= 28; d++) {
      const day = `2026-06-${String(d).padStart(2, '0')}`;
      const pick = selectDailyContent(feed, day)!;
      expect(topSlugs.has(pick.slug)).toBe(true);
    }
  });

  it('rotates the pick across different days', () => {
    const feed = ['a', 'b', 'c', 'd', 'e'].map(scored);
    const picks = new Set(
      ['2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'].map(
        (d) => selectDailyContent(feed, d)!.slug,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
