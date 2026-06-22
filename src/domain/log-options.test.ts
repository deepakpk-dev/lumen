import { describe, it, expect } from 'vitest';
import { PREGNANCY_SYMPTOM_OPTIONS } from './log-options';

describe('PREGNANCY_SYMPTOM_OPTIONS', () => {
  it('includes pregnancy-specific symptoms and has no duplicates', () => {
    expect(PREGNANCY_SYMPTOM_OPTIONS).toContain('Nausea');
    expect(PREGNANCY_SYMPTOM_OPTIONS).toContain('Braxton Hicks');
    expect(new Set(PREGNANCY_SYMPTOM_OPTIONS).size).toBe(
      PREGNANCY_SYMPTOM_OPTIONS.length,
    );
  });
});
