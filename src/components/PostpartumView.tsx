'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { PageShell, NavTile } from '@/src/components/PageShell';
import { PostpartumCard } from '@/src/components/PostpartumCard';
import { POSTPARTUM_SOURCES } from '@/src/domain/postpartum/weeks';

export function PostpartumView() {
  const router = useRouter();
  const {
    loading, isPostpartum, postpartumWeekNumber, recoveryStageToday,
    postpartumContentToday, latestEpds, postpartumProfile,
  } = useHealthData();

  useEffect(() => {
    if (!loading && !isPostpartum) router.replace('/');
  }, [loading, isPostpartum, router]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (!isPostpartum || postpartumWeekNumber === null || !recoveryStageToday || !postpartumContentToday) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <PageShell title="Postpartum" subtitle="Your recovery, week by week.">
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

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">When your cycle returns</h2>
        {/* Educational copy only, tuned by the breastfeeding flag from Settings —
            never a prediction input. */}
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {postpartumProfile?.breastfeeding
            ? 'While you are breastfeeding, your periods may pause for many months and can return gradually as feeds space out.'
            : 'Your periods often return within about 6–12 weeks, but your own timeline may differ — and breastfeeding, if you start, can delay them.'}{' '}
          Lumen will not guess a date. When your period comes back, you can switch back to cycle
          tracking from Settings.
        </p>
      </section>

      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <NavTile href="/postpartum/checkin">Mood check-in</NavTile>
        <NavTile href="/log">Log recovery</NavTile>
        <NavTile href="/settings">Manage postpartum</NavTile>
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
    </PageShell>
  );
}
