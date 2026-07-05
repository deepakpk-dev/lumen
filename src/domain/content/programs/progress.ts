import type { LifeStage } from '@/src/domain/types';
import type { ContentProgram, ProgramStatus } from './types';

/** Programs that belong to the given life stage (plus any universal ones). */
export function programsForStage(
  programs: ContentProgram[],
  lifeStage: LifeStage,
): ContentProgram[] {
  return programs.filter(
    (p) => p.lifeStages.length === 0 || p.lifeStages.includes(lifeStage),
  );
}

/** True when `stepSlug` is in the completed set. */
export function isStepComplete(
  completedSteps: string[],
  stepSlug: string,
): boolean {
  return completedSteps.includes(stepSlug);
}

/**
 * Pure toggle: returns a new completed-set with `stepSlug` added when `done`,
 * removed otherwise. Never mutates the input and never duplicates.
 */
export function toggleStepComplete(
  completedSteps: string[],
  stepSlug: string,
  done: boolean,
): string[] {
  const set = new Set(completedSteps);
  if (done) set.add(stepSlug);
  else set.delete(stepSlug);
  return [...set];
}

/**
 * Derive a program's status from a raw completed-set. Robust to stale slugs:
 * only steps that actually exist in the program count toward progress, so a
 * removed/renamed article can never push completion above 100%.
 */
export function computeProgramStatus(
  program: ContentProgram,
  completedSteps: string[],
): ProgramStatus {
  const stepSlugs = program.steps.map((s) => s.articleSlug);
  const completed = stepSlugs.filter((slug) => completedSteps.includes(slug));
  const totalSteps = stepSlugs.length;
  const completedCount = completed.length;
  const isComplete = totalSteps > 0 && completedCount === totalSteps;
  const nextStep =
    program.steps.find((s) => !completed.includes(s.articleSlug)) ?? null;
  const percentComplete =
    totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);

  return {
    program,
    completedSteps: completed,
    completedCount,
    totalSteps,
    percentComplete,
    isComplete,
    nextStep,
  };
}
