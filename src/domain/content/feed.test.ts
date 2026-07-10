import { describe, it, expect } from 'vitest';
import { buildContentFeed } from './feed';
import type { ContentArticle, ContentContext } from './types';

function article(over: Partial<ContentArticle>): ContentArticle {
  return {
    slug: 'a',
    title: 'A',
    summary: 's',
    body: 'b',
    topics: ['menstruation'],
    phases: [],
    symptoms: [],
    lifeStages: ['cycle'],
    readingMinutes: 2,
    author: 'Lumen Editorial',
    medicalReviewer: 'Aligned with NHS guidance',
    lastReviewed: '2026-06-17',
    sources: [{ label: 'NHS', url: 'https://www.nhs.uk/conditions/periods/' }],
    ...over,
  };
}

const baseCtx: ContentContext = {
  currentPhase: 'luteal',
  recentSymptoms: ['Cramps'],
  isIrregular: false,
  hasData: true,
  lifeStage: 'cycle',
  trimester: null,
};

describe('buildContentFeed', () => {
  it('ranks phase + symptom matches above unmatched articles', () => {
    const phaseHit = article({ slug: 'luteal', phases: ['luteal'] });
    const symptomHit = article({ slug: 'cramps', symptoms: ['Cramps'] });
    const miss = article({ slug: 'misc', phases: ['follicular'] });

    const feed = buildContentFeed([miss, symptomHit, phaseHit], baseCtx);
    const order = feed.map((f) => f.article.slug);
    expect(order[0]).toBe('luteal'); // +10 phase
    expect(order[1]).toBe('cramps'); // +5 symptom
    expect(order[2]).toBe('misc'); // 0
  });

  it('excludes articles whose life stage does not match', () => {
    const pregnancyOnly = article({ slug: 'preg', lifeStages: ['pregnancy'] });
    const universal = article({ slug: 'uni', lifeStages: [] });
    const feed = buildContentFeed([pregnancyOnly, universal], baseCtx);
    expect(feed.map((f) => f.article.slug)).toEqual(['uni']);
  });

  it('boosts irregular-cycle content when the user is irregular', () => {
    const irr = article({ slug: 'irr', topics: ['irregular-cycles'] });
    const other = article({ slug: 'oth', topics: ['menstruation'] });
    const feed = buildContentFeed([other, irr], {
      ...baseCtx,
      currentPhase: null,
      recentSymptoms: [],
      isIrregular: true,
    });
    expect(feed[0].article.slug).toBe('irr');
    expect(feed[0].matchReasons).toContain('Relevant to your irregular cycles');
  });

  it('surfaces getting-started content when there is no data', () => {
    const start = article({ slug: 'start', topics: ['getting-started'] });
    const other = article({ slug: 'oth', topics: ['menstruation'] });
    const feed = buildContentFeed([other, start], {
      currentPhase: null,
      recentSymptoms: [],
      isIrregular: false,
      hasData: false,
      lifeStage: 'cycle',
      trimester: null,
    });
    expect(feed[0].article.slug).toBe('start');
  });

  it('gates trimester-scoped articles to the current trimester', () => {
    const tri1 = article({ slug: 'tri1', lifeStages: ['pregnancy'], trimesters: [1] });
    const tri3 = article({ slug: 'tri3', lifeStages: ['pregnancy'], trimesters: [3] });
    const anytime = article({ slug: 'any', lifeStages: ['pregnancy'] });
    const feed = buildContentFeed([tri1, tri3, anytime], {
      ...baseCtx,
      lifeStage: 'pregnancy',
      trimester: 1,
    });
    expect(feed.map((f) => f.article.slug).sort()).toEqual(['any', 'tri1']);
  });

  it('is a deterministic tie-break by lastReviewed then slug', () => {
    const a = article({ slug: 'zzz', lastReviewed: '2026-01-01' });
    const b = article({ slug: 'aaa', lastReviewed: '2026-01-01' });
    const c = article({ slug: 'mmm', lastReviewed: '2026-06-01' });
    const feed = buildContentFeed([a, b, c], {
      ...baseCtx,
      currentPhase: null,
      recentSymptoms: [],
    });
    expect(feed.map((f) => f.article.slug)).toEqual(['mmm', 'aaa', 'zzz']);
  });
});
