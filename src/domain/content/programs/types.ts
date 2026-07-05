import type { LifeStage } from '@/src/domain/types';
import type { ContentTopic } from '@/src/domain/content/types';

/**
 * An ordered step in a program. A step reuses an existing content article as
 * its material (referenced by slug), so programs add structure over the corpus
 * without introducing a parallel content model.
 */
export interface ProgramStep {
  articleSlug: string; // must match a ContentArticle.slug
}

/**
 * A bundled, multi-part guided program (a "course"). Static content — only the
 * user's progress through it is persisted (see ProgramProgress).
 */
export interface ContentProgram {
  slug: string; // stable id + URL segment (unique)
  title: string;
  summary: string; // 1–2 sentence teaser
  description: string; // short intro shown on the program page
  lifeStages: LifeStage[]; // stage scoping ([] = universal), same semantics as articles
  topics: ContentTopic[]; // >= 1
  steps: ProgramStep[]; // ordered, >= 1
}

/** A program combined with the user's progress through it (derived, not stored). */
export interface ProgramStatus {
  program: ContentProgram;
  completedSteps: string[]; // article slugs completed (intersected with real steps)
  completedCount: number;
  totalSteps: number;
  percentComplete: number; // 0–100 integer
  isComplete: boolean;
  nextStep: ProgramStep | null; // first incomplete step, null when complete
}
