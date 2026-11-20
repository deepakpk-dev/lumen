import type {
  ConceptionGuidance,
  OvulationConfirmation,
} from '@/src/domain/fertility/types';
import { LumenIcon } from './LumenIcon';

const LEVEL_STYLE: Record<ConceptionGuidance['level'], string> = {
  high: 'lumen-conception-high',
  medium: 'lumen-conception-medium',
  low: '',
};

export function ConceptionCard({
  guidance,
  confirmation,
  hasCycleHistory = true,
  estimatedCycleLength = 28,
}: {
  guidance: ConceptionGuidance | null;
  confirmation: OvulationConfirmation | null;
  // False until at least one full cycle has been logged, so a day-one user
  // isn't told the estimate comes from history they don't have yet.
  hasCycleHistory?: boolean;
  estimatedCycleLength?: number;
}) {
  if (!guidance) return null;
  return (
    <section
      className={`lumen-card space-y-3 ${LEVEL_STYLE[guidance.level]}`}
    >
      <div className="flex items-start gap-3">
        <span className="lumen-icon-box"><LumenIcon name="heart" /></span>
        <div className="min-w-0">
          <h2 className="lumen-card-title">{guidance.label}</h2>
          <p className="lumen-help">{guidance.reason}</p>
        </div>
      </div>
      <p className="lumen-help">
        {confirmation
          ? `Ovulation ${confirmation.status === 'confirmed' ? 'confirmed' : 'estimated'} around ${confirmation.ovulationDate}.`
          : hasCycleHistory
            ? 'Ovulation estimated from your cycle history.'
            : `Based on a ${estimatedCycleLength}-day cycle estimate. This sharpens as you log periods and temperatures.`}
      </p>
      <p className="lumen-divider lumen-muted border-t pt-2.5 text-xs">
        Lumen is not a contraceptive and not a substitute for fertility
        treatment or medical advice.
      </p>
    </section>
  );
}
