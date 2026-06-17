import { describe, it, expect } from 'vitest';
import {
  CONTENT_TOPICS,
  RECENT_LOG_WINDOW,
  PHASE_MATCH_WEIGHT,
  SYMPTOM_MATCH_WEIGHT,
  IRREGULAR_BOOST,
  GETTING_STARTED_BOOST,
  DAILY_TOP_SLICE,
} from './types';

describe('content types & constants', () => {
  it('exposes the topic vocabulary', () => {
    expect(CONTENT_TOPICS).toContain('getting-started');
    expect(CONTENT_TOPICS).toContain('irregular-cycles');
    expect(new Set(CONTENT_TOPICS).size).toBe(CONTENT_TOPICS.length);
  });

  it('defines positive scoring constants', () => {
    for (const n of [
      RECENT_LOG_WINDOW,
      PHASE_MATCH_WEIGHT,
      SYMPTOM_MATCH_WEIGHT,
      IRREGULAR_BOOST,
      GETTING_STARTED_BOOST,
      DAILY_TOP_SLICE,
    ]) {
      expect(n).toBeGreaterThan(0);
    }
  });
});
