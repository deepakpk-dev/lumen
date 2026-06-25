import Link from 'next/link';
import { EpdsCheckin } from '@/src/components/EpdsCheckin';

export default function PostpartumCheckinPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mood check-in</h1>
        <Link href="/postpartum" className="text-sm text-rose-600">
          Back
        </Link>
      </div>
      <EpdsCheckin />
    </main>
  );
}
