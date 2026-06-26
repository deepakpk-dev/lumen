'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataControls } from '@/src/components/DataControls';
import { PasscodeControls } from '@/src/components/PasscodeControls';
import { PostpartumControls } from '@/src/components/PostpartumControls';
import { PregnancyControls } from '@/src/components/PregnancyControls';
import { TtcControls } from '@/src/components/TtcControls';

export default function SettingsPage() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Link href="/" className="text-sm text-neutral-500 dark:text-neutral-400 underline">
          Home
        </Link>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Passcode lock</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Add an app-level passcode gate. Health records stay local on this
          device; the local database is not encrypted.
        </p>
        <PasscodeControls />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Trying to conceive</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Turn on TTC mode to log BBT, LH tests, and cervical mucus, and get daily
          conception guidance. Lumen is not a contraceptive and not a substitute for
          fertility treatment or medical advice.
        </p>
        <TtcControls onEnabled={() => router.push('/')} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Pregnancy</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Switch on pregnancy mode for week-by-week tracking, a kick counter, and a
          contraction timer. Educational only — not a substitute for medical care.
        </p>
        <PregnancyControls onStarted={() => router.push('/')} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Postpartum</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          After birth, Lumen supports your recovery with weekly guidance and a mood check-in.
          This section appears while postpartum mode is active.
        </p>
        <PostpartumControls />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Your data</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Your health data is stored only on this device. We never upload it.
        </p>
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Because it lives only here, clearing your browser data, using private mode, or losing
          this device will erase it. Export regularly to keep a backup.
        </p>
        <DataControls onDeleted={() => router.replace('/onboarding')} />
      </section>
    </main>
  );
}
