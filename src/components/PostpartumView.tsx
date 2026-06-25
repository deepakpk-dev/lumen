'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { PostpartumCard } from '@/src/components/PostpartumCard';
import { POSTPARTUM_SOURCES } from '@/src/domain/postpartum/weeks';

export function PostpartumView() {
  const router = useRouter();
  const {
    loading, isPostpartum, postpartumWeekNumber, recoveryStageToday,
    postpartumContentToday, latestEpds,
  } = useHealthData();

  useEffect(() => {
    if (!loading && !isPostpartum) router.replace('/');
  }, [loading, isPostpartum, router]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (!isPostpartum || postpartumWeekNumber === null || !recoveryStageToday || !postpartumContentToday) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex justify-end">
        <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400 underline">
          Home
        </Link>
      </div>

      <PostpartumCard
        week={postpartumWeekNumber}
        stage={recoveryStageToday}
        latestBand={latestEpds?.band ?? null}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{postpartumContentToday.focus}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
          {postpartumContentToday.notes.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-md border border-neutral-200 p-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">When your cycle returns</h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Your periods may take weeks or many months to return, and breastfeeding can delay them.
          Lumen will not guess a date. When your period comes back, you can switch back to cycle
          tracking from Settings.
        </p>
      </section>

      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/postpartum/checkin" className="rounded-md border px-4 py-3">
          Mood check-in
        </Link>
        <Link href="/log" className="rounded-md border px-4 py-3">
          Log recovery
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Manage postpartum
        </Link>
      </nav>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Sources</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
          {POSTPARTUM_SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
        Educational information only — not a substitute for medical advice. Contact your provider
        with any concerns.
      </p>
    </main>
  );
}
