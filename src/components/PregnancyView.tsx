'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { PregnancyCard } from '@/src/components/PregnancyCard';
import { WEEK_SOURCES } from '@/src/domain/pregnancy/weeks';

export function PregnancyView() {
  const router = useRouter();
  const { loading, isPregnant, gestation, currentTrimester, daysToDue, weekContentToday } =
    useHealthData();

  useEffect(() => {
    if (!loading && !isPregnant) router.replace('/');
  }, [loading, isPregnant, router]);

  if (loading) return <main className="p-6">Loading…</main>;
  if (!isPregnant || !gestation || !currentTrimester || daysToDue === null || !weekContentToday) {
    return <main className="p-6">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <PregnancyCard
        gestation={gestation}
        trimester={currentTrimester}
        daysToDue={daysToDue}
        week={weekContentToday}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Baby this week</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {weekContentToday.fetalDevelopment.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-600">Your body this week</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {weekContentToday.maternalChanges.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/pregnancy/kicks" className="rounded-md border px-4 py-3">
          Kick counter
        </Link>
        <Link href="/pregnancy/contractions" className="rounded-md border px-4 py-3">
          Contraction timer
        </Link>
        <Link href="/log" className="rounded-md border px-4 py-3">
          Log symptoms
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Manage pregnancy
        </Link>
      </nav>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-600">Sources</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500">
          {WEEK_SOURCES[currentTrimester].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-neutral-500">
        Educational information only — not a substitute for medical advice. Contact your
        provider with any concerns.
      </p>
    </main>
  );
}
