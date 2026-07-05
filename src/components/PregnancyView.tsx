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
    <div className="lumen-preg relative isolate">
      <style>{`
        /* Ambient rose wash echoing the onboarding screens, so the pregnancy
           space reads as part of the same world rather than a plain page. */
        .lumen-preg-aurora {
          background:
            radial-gradient(55% 75% at 15% 0%, rgba(244, 63, 94, 0.12), transparent 62%),
            radial-gradient(45% 60% at 85% 4%, rgba(236, 72, 153, 0.08), transparent 60%),
            radial-gradient(70% 55% at 50% -12%, rgba(255, 228, 230, 0.55), transparent 72%);
        }
        @media (prefers-color-scheme: dark) {
          .lumen-preg-aurora {
            background:
              radial-gradient(55% 75% at 15% 0%, rgba(244, 63, 94, 0.14), transparent 62%),
              radial-gradient(45% 60% at 85% 4%, rgba(236, 72, 153, 0.10), transparent 60%);
          }
        }
        /* Staggered entrance matching the setup step's rhythm. */
        .lumen-preg .lumen-in {
          opacity: 0;
          animation: lumen-preg-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .lumen-preg [data-in='1'] { animation-delay: 0.03s; }
        .lumen-preg [data-in='2'] { animation-delay: 0.1s; }
        .lumen-preg [data-in='3'] { animation-delay: 0.18s; }
        .lumen-preg [data-in='4'] { animation-delay: 0.27s; }
        .lumen-preg [data-in='5'] { animation-delay: 0.36s; }
        @keyframes lumen-preg-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lumen-preg .lumen-in { animation: none; opacity: 1; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="lumen-preg-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
      />

      <main className="mx-auto max-w-md space-y-6 p-6">
        {/* Brand row: back-to-home on the left, wordmark on the right, mirroring
            the fertility space so the stages read as one flow. */}
        <div className="lumen-in flex items-center justify-between" data-in="1">
          <Link
            href="/"
            className="-ml-2 flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Home
          </Link>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]"
            />
            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
              Lumen
            </span>
          </span>
        </div>

        <div className="lumen-in" data-in="1">
          <h1 className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 bg-clip-text text-[28px] font-bold tracking-tight text-transparent dark:from-rose-300 dark:via-rose-300 dark:to-pink-300">
            Pregnancy
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            Your week by week, kicks, and contractions.
          </p>
        </div>

        <div className="lumen-in" data-in="2">
          <PregnancyCard
            gestation={gestation}
            trimester={currentTrimester}
            daysToDue={daysToDue}
            week={weekContentToday}
          />
        </div>

        {/* Informational sections stay flat and quiet — elevation is reserved
            for the hero card so the page stays short on phones. */}
        <section className="lumen-in space-y-2" data-in="3">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Baby this week</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {weekContentToday.fetalDevelopment.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="lumen-in space-y-2" data-in="3">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Your body this week</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700 dark:text-neutral-300">
            {weekContentToday.maternalChanges.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <nav className="lumen-in grid grid-cols-2 gap-3 text-center text-sm" data-in="4">
          <Link href="/pregnancy/kicks" className="rounded-xl border border-neutral-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition hover:border-rose-200 hover:shadow-md dark:border-neutral-800 dark:bg-white/[0.04] dark:hover:border-rose-900">
            Kick counter
          </Link>
          <Link href="/pregnancy/contractions" className="rounded-xl border border-neutral-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition hover:border-rose-200 hover:shadow-md dark:border-neutral-800 dark:bg-white/[0.04] dark:hover:border-rose-900">
            Contraction timer
          </Link>
          <Link href="/log" className="rounded-xl border border-neutral-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition hover:border-rose-200 hover:shadow-md dark:border-neutral-800 dark:bg-white/[0.04] dark:hover:border-rose-900">
            Log symptoms
          </Link>
          <Link href="/settings" className="rounded-xl border border-neutral-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition hover:border-rose-200 hover:shadow-md dark:border-neutral-800 dark:bg-white/[0.04] dark:hover:border-rose-900">
            Manage pregnancy
          </Link>
        </nav>

        <section className="lumen-in space-y-1" data-in="5">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Sources</h2>
          <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
            {WEEK_SOURCES[currentTrimester].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        <p className="lumen-in text-[11px] text-neutral-500 dark:text-neutral-400" data-in="5">
          Educational information only — not a substitute for medical advice. Contact your
          provider with any concerns.
        </p>
      </main>
    </div>
  );
}
