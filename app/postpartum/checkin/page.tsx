import { EpdsCheckin } from '@/src/components/EpdsCheckin';
import { BackLink } from '@/src/components/BackLink';

export default function PostpartumCheckinPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <BackLink href="/postpartum">Postpartum</BackLink>
      <h1 className="text-xl font-semibold">Mood check-in</h1>
      <EpdsCheckin />
    </main>
  );
}
