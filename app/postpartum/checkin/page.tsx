import { EpdsCheckin } from '@/src/components/EpdsCheckin';
import { PageShell } from '@/src/components/PageShell';

export default function PostpartumCheckinPage() {
  return (
    <PageShell title="Mood check-in" backHref="/postpartum" backLabel="Postpartum">
      <EpdsCheckin />
    </PageShell>
  );
}
