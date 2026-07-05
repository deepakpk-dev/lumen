import { describe, it, expect } from 'vitest';
import { PROGRAMS, findProgram } from './index';
import { ARTICLES } from '@/src/content';
import { CONTENT_TOPICS } from '@/src/domain/content/types';

const LIFE_STAGES = ['cycle', 'ttc', 'pregnancy', 'postpartum', 'menopause'];
const ARTICLE_SLUGS = new Set(ARTICLES.map((a) => a.slug));

describe('program corpus integrity', () => {
  it('has programs', () => {
    expect(PROGRAMS.length).toBeGreaterThanOrEqual(4);
  });

  it('has unique slugs', () => {
    const slugs = PROGRAMS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('findProgram resolves by slug', () => {
    expect(findProgram('understanding-your-cycle')?.title).toBe('Understanding your cycle');
    expect(findProgram('does-not-exist')).toBeUndefined();
  });

  it('every program is well-formed and its steps reference real articles', () => {
    for (const p of PROGRAMS) {
      expect(p.title.trim()).not.toBe('');
      expect(p.summary.trim()).not.toBe('');
      expect(p.description.trim()).not.toBe('');
      expect(p.topics.length).toBeGreaterThan(0);
      for (const t of p.topics) expect(CONTENT_TOPICS).toContain(t);
      for (const l of p.lifeStages) expect(LIFE_STAGES).toContain(l);

      expect(p.steps.length).toBeGreaterThan(0);
      const stepSlugs = p.steps.map((s) => s.articleSlug);
      // Steps reference existing articles…
      for (const slug of stepSlugs) expect(ARTICLE_SLUGS.has(slug)).toBe(true);
      // …and no article is repeated within a program.
      expect(new Set(stepSlugs).size).toBe(stepSlugs.length);
    }
  });

  it('every program step belongs to the same life stage(s) as the program', () => {
    for (const p of PROGRAMS) {
      for (const step of p.steps) {
        const article = ARTICLES.find((a) => a.slug === step.articleSlug)!;
        // A universal program (no stage) accepts any article; otherwise the
        // article must share at least one life stage with the program (or be
        // universal itself), so we never route off-stage material into a course.
        if (p.lifeStages.length === 0 || article.lifeStages.length === 0) continue;
        expect(article.lifeStages.some((l) => p.lifeStages.includes(l))).toBe(true);
      }
    }
  });
});
