// src/content/index.test.ts
import { describe, it, expect } from 'vitest';
import { ARTICLES, findArticle } from './index';
import { CONTENT_TOPICS } from '@/src/domain/content/types';
import { SYMPTOM_OPTIONS, MOOD_OPTIONS } from '@/src/domain/log-options';

const PHASES = ['menstrual', 'follicular', 'ovulation', 'luteal'];
const LIFE_STAGES = ['cycle', 'ttc', 'pregnancy', 'menopause'];
const SYMPTOM_TAGS = new Set([...SYMPTOM_OPTIONS, ...MOOD_OPTIONS]);

describe('content corpus integrity', () => {
  it('has a healthy number of articles', () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique slugs', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('findArticle resolves by slug', () => {
    expect(findArticle('period-cramps')?.title).toBe('Managing period cramps');
    expect(findArticle('does-not-exist')).toBeUndefined();
  });

  it('every article is well-formed', () => {
    for (const a of ARTICLES) {
      expect(a.title.trim()).not.toBe('');
      expect(a.summary.trim()).not.toBe('');
      expect(a.body.trim().length).toBeGreaterThan(40);
      expect(a.author).toBe('Lumen Editorial');
      expect(a.medicalReviewer.trim()).not.toBe('');
      expect(a.readingMinutes).toBeGreaterThan(0);
      expect(a.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(a.lastReviewed))).toBe(false);

      expect(a.topics.length).toBeGreaterThan(0);
      for (const t of a.topics) expect(CONTENT_TOPICS).toContain(t);
      for (const p of a.phases) expect(PHASES).toContain(p);
      for (const l of a.lifeStages) expect(LIFE_STAGES).toContain(l);
      for (const s of a.symptoms) expect(SYMPTOM_TAGS.has(s)).toBe(true);

      expect(a.sources.length).toBeGreaterThan(0);
      for (const src of a.sources) {
        expect(src.label.trim()).not.toBe('');
        expect(src.url).toMatch(/^https?:\/\//);
      }
    }
  });
});
