import { describe, it, expect } from 'vitest';
import {
  programsForStage,
  toggleStepComplete,
  computeProgramStatus,
} from './progress';
import type { ContentProgram } from './types';

function program(over: Partial<ContentProgram> = {}): ContentProgram {
  return {
    slug: 'p',
    title: 'P',
    summary: 's',
    description: 'd',
    lifeStages: ['cycle'],
    topics: ['getting-started'],
    steps: [
      { articleSlug: 'a' },
      { articleSlug: 'b' },
      { articleSlug: 'c' },
    ],
    ...over,
  };
}

describe('programsForStage', () => {
  it('keeps stage-matched and universal programs, drops others', () => {
    const cycle = program({ slug: 'cyc', lifeStages: ['cycle'] });
    const ttc = program({ slug: 'ttc', lifeStages: ['ttc'] });
    const universal = program({ slug: 'uni', lifeStages: [] });
    const out = programsForStage([cycle, ttc, universal], 'ttc');
    expect(out.map((p) => p.slug)).toEqual(['ttc', 'uni']);
  });
});

describe('toggleStepComplete', () => {
  it('adds without duplicating and does not mutate the input', () => {
    const start = ['a'];
    const next = toggleStepComplete(start, 'b', true);
    expect(next.sort()).toEqual(['a', 'b']);
    expect(toggleStepComplete(['a', 'b'], 'b', true).sort()).toEqual(['a', 'b']);
    expect(start).toEqual(['a']); // unchanged
  });

  it('removes when done is false', () => {
    expect(toggleStepComplete(['a', 'b'], 'a', false)).toEqual(['b']);
    expect(toggleStepComplete(['b'], 'a', false)).toEqual(['b']); // no-op when absent
  });
});

describe('computeProgramStatus', () => {
  it('reports zero progress with no completed steps', () => {
    const s = computeProgramStatus(program(), []);
    expect(s.completedCount).toBe(0);
    expect(s.totalSteps).toBe(3);
    expect(s.percentComplete).toBe(0);
    expect(s.isComplete).toBe(false);
    expect(s.nextStep?.articleSlug).toBe('a');
  });

  it('reports partial progress and points to the first incomplete step', () => {
    const s = computeProgramStatus(program(), ['a']);
    expect(s.completedCount).toBe(1);
    expect(s.percentComplete).toBe(33);
    expect(s.nextStep?.articleSlug).toBe('b');
    expect(s.isComplete).toBe(false);
  });

  it('reports completion with no next step when all steps are done', () => {
    const s = computeProgramStatus(program(), ['a', 'b', 'c']);
    expect(s.completedCount).toBe(3);
    expect(s.percentComplete).toBe(100);
    expect(s.isComplete).toBe(true);
    expect(s.nextStep).toBeNull();
  });

  it('ignores stale slugs that are not steps of this program', () => {
    const s = computeProgramStatus(program(), ['a', 'ghost', 'x']);
    expect(s.completedCount).toBe(1);
    expect(s.completedSteps).toEqual(['a']);
    expect(s.percentComplete).toBe(33);
    expect(s.isComplete).toBe(false);
  });
});
