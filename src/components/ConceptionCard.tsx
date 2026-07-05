import type {
  ConceptionGuidance,
  OvulationConfirmation,
} from '@/src/domain/fertility/types';

// Per-level card wash + icon chip, in the soft-gradient language of the
// onboarding screens: rose for the fertile window, amber for near it,
// quiet neutral for the rest of the cycle.
const LEVEL_STYLE: Record<ConceptionGuidance['level'], string> = {
  high: 'border-rose-200/80 bg-gradient-to-br from-rose-50 to-pink-50/60 dark:border-rose-900/70 dark:from-rose-950/50 dark:to-pink-950/30',
  medium:
    'border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:border-amber-900/70 dark:from-amber-950/40 dark:to-orange-950/20',
  low: 'border-neutral-200/80 bg-white/70 dark:border-neutral-800 dark:bg-white/[0.04]',
};

const LEVEL_CHIP: Record<ConceptionGuidance['level'], string> = {
  high: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-[0_4px_14px_rgba(225,29,72,0.4)]',
  medium:
    'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)]',
  low: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
};

export function ConceptionCard({
  guidance,
  confirmation,
  hasCycleHistory = true,
}: {
  guidance: ConceptionGuidance | null;
  confirmation: OvulationConfirmation | null;
  // False until at least one full cycle has been logged, so a day-one user
  // isn't told the estimate comes from history they don't have yet.
  hasCycleHistory?: boolean;
}) {
  if (!guidance) return null;
  return (
    <section
      className={`space-y-3 rounded-2xl border p-5 shadow-sm backdrop-blur ${LEVEL_STYLE[guidance.level]}`}
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${LEVEL_CHIP[guidance.level]}`}
        >
          {/* Sprout — the TTC goal's glyph from onboarding */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21v-7" />
            <path d="M12 14c0-3 2-5 5-5 0 3-2 5-5 5z" />
            <path d="M12 14c0-2.6-1.8-4.5-4.5-4.5 0 2.6 1.8 4.5 4.5 4.5z" />
          </svg>
        </span>
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {guidance.label}
          </h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{guidance.reason}</p>
        </div>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        {confirmation
          ? `Ovulation ${confirmation.status === 'confirmed' ? 'confirmed' : 'estimated'} around ${confirmation.ovulationDate}.`
          : hasCycleHistory
            ? 'Ovulation estimated from your cycle history.'
            : 'Based on a typical 28-day cycle — this sharpens as you log periods and temperatures.'}
      </p>
      <p className="border-t border-black/5 pt-2.5 text-[11px] text-neutral-500 dark:border-white/10 dark:text-neutral-400">
        Lumen is not a contraceptive and not a substitute for fertility
        treatment or medical advice.
      </p>
    </section>
  );
}
