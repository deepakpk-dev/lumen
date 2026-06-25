import type { RecoveryStage } from '@/src/domain/postpartum/recovery';
import type { EpdsBand } from '@/src/domain/postpartum/epds';

const STAGE_LABEL: Record<RecoveryStage, string> = {
  acute: 'Early recovery',
  extended: 'Recovering',
  ongoing: 'Ongoing recovery',
};

const BAND_LABEL: Record<EpdsBand, string> = {
  low: 'lower range',
  possible: 'some symptoms — worth sharing with your provider',
  probable: 'please reach out to your provider',
};

export function PostpartumCard({
  week,
  stage,
  latestBand,
}: {
  week: number;
  stage: RecoveryStage;
  latestBand: EpdsBand | null;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
      <h2 className="text-base font-semibold">Postpartum · week {week}</h2>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{STAGE_LABEL[stage]}</p>
      {latestBand && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Last mood check-in: <span className="font-medium">{BAND_LABEL[latestBand]}</span>.
        </p>
      )}
    </section>
  );
}
