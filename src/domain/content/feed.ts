import type { ContentArticle, ContentContext, ScoredArticle } from './types';
import {
  PHASE_MATCH_WEIGHT,
  SYMPTOM_MATCH_WEIGHT,
  IRREGULAR_BOOST,
  GETTING_STARTED_BOOST,
} from './types';

function scoreArticle(
  article: ContentArticle,
  ctx: ContentContext,
): ScoredArticle {
  let score = 0;
  const matchReasons: string[] = [];

  if (ctx.currentPhase && article.phases.includes(ctx.currentPhase)) {
    score += PHASE_MATCH_WEIGHT;
    matchReasons.push(`Relevant to your ${ctx.currentPhase} phase`);
  }

  const overlap = article.symptoms.filter((s) =>
    ctx.recentSymptoms.includes(s),
  );
  if (overlap.length > 0) {
    score += overlap.length * SYMPTOM_MATCH_WEIGHT;
    matchReasons.push(`Matches what you logged: ${overlap.join(', ')}`);
  }

  if (ctx.isIrregular && article.topics.includes('irregular-cycles')) {
    score += IRREGULAR_BOOST;
    matchReasons.push('Relevant to your irregular cycles');
  }

  if (!ctx.hasData && article.topics.includes('getting-started')) {
    score += GETTING_STARTED_BOOST;
    matchReasons.push('A good place to start');
  }

  return { article, score, matchReasons };
}

export function buildContentFeed(
  articles: ContentArticle[],
  context: ContentContext,
): ScoredArticle[] {
  return articles
    .filter(
      (a) =>
        a.lifeStages.length === 0 || a.lifeStages.includes(context.lifeStage),
    )
    .map((a) => scoreArticle(a, context))
    .sort(
      (x, y) =>
        y.score - x.score ||
        y.article.lastReviewed.localeCompare(x.article.lastReviewed) ||
        x.article.slug.localeCompare(y.article.slug),
    );
}
