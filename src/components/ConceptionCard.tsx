import type {
  ConceptionGuidance,
  OvulationConfirmation,
} from '@/src/domain/fertility/types';

const LEVEL_STYLE: Record<ConceptionGuidance['level'], string> = {
  high: 'border-rose-300 bg-rose-50',
  medium: 'border-amber-300 bg-amber-50',
  low: 'border-neutral-200 bg-neutral-50',
};

export function ConceptionCard({
  guidance,
  confirmation,
}: {
  guidance: ConceptionGuidance | null;
  confirmation: OvulationConfirmation | null;
}) {
  if (!guidance) return null;
  return (
    <section className={`space-y-2 rounded-lg border p-4 ${LEVEL_STYLE[guidance.level]}`}>
      <h2 className="text-base font-semibold">{guidance.label}</h2>
      <p className="text-sm text-neutral-700">{guidance.reason}</p>
      <p className="text-xs text-neutral-600">
        {confirmation
          ? `Ovulation ${confirmation.status === 'confirmed' ? 'confirmed' : 'estimated'} around ${confirmation.ovulationDate}.`
          : 'Ovulation estimated from your cycle history.'}
      </p>
      <p className="text-[11px] text-neutral-500">
        Lumen is not a contraceptive and not a substitute for fertility
        treatment or medical advice.
      </p>
    </section>
  );
}
