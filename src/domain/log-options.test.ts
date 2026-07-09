import { describe, it, expect } from 'vitest';
import {
  PREGNANCY_SYMPTOM_OPTIONS,
  MENOPAUSE_SYMPTOM_OPTIONS,
  MENOPAUSE_MOOD_OPTIONS,
} from './log-options';

describe('PREGNANCY_SYMPTOM_OPTIONS', () => {
  it('includes pregnancy-specific symptoms and has no duplicates', () => {
    expect(PREGNANCY_SYMPTOM_OPTIONS).toContain('Nausea');
    expect(PREGNANCY_SYMPTOM_OPTIONS).toContain('Braxton Hicks');
    expect(new Set(PREGNANCY_SYMPTOM_OPTIONS).size).toBe(
      PREGNANCY_SYMPTOM_OPTIONS.length,
    );
  });
});

describe('MENOPAUSE_SYMPTOM_OPTIONS', () => {
  it('includes vasomotor symptoms and has no duplicates', () => {
    expect(MENOPAUSE_SYMPTOM_OPTIONS).toContain('Hot flashes');
    expect(MENOPAUSE_SYMPTOM_OPTIONS).toContain('Night sweats');
    expect(MENOPAUSE_SYMPTOM_OPTIONS.length).toBeGreaterThan(0);
    expect(new Set(MENOPAUSE_SYMPTOM_OPTIONS).size).toBe(
      MENOPAUSE_SYMPTOM_OPTIONS.length,
    );
  });
});

describe('MENOPAUSE_MOOD_OPTIONS', () => {
  it('is non-empty and has no duplicates', () => {
    expect(MENOPAUSE_MOOD_OPTIONS.length).toBeGreaterThan(0);
    expect(new Set(MENOPAUSE_MOOD_OPTIONS).size).toBe(MENOPAUSE_MOOD_OPTIONS.length);
  });
});
