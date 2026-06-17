import type { ISODate } from '@/src/domain/types';
import type { ScoredArticle, ContentArticle } from './types';
import { DAILY_TOP_SLICE } from './types';

function dateSeed(date: ISODate): number {
  let sum = 0;
  for (let i = 0; i < date.length; i++) sum += date.charCodeAt(i);
  return sum;
}

export function selectDailyContent(
  feed: ScoredArticle[],
  today: ISODate,
): ContentArticle | null {
  if (feed.length === 0) return null;
  const slice = feed.slice(0, DAILY_TOP_SLICE);
  const index = dateSeed(today) % slice.length;
  return slice[index].article;
}
