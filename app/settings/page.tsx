'use client';

import Link from 'next/link';
import { PageShell } from '@/src/components/PageShell';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { DataControls } from '@/src/components/DataControls';
import { NotificationControls } from '@/src/components/NotificationControls';
import { PasscodeControls } from '@/src/components/PasscodeControls';
import { PostpartumControls } from '@/src/components/PostpartumControls';
import { SyncControls } from '@/src/components/SyncControls';
import { PregnancyControls } from '@/src/components/PregnancyControls';
import { TtcControls } from '@/src/components/TtcControls';

export default function SettingsPage() {
  const router = useRouter();
  const { refresh, refreshSettings, isPregnant, isPostpartum } = useHealthData();
  // Life stages are mutually exclusive, so only offer a switch into a new stage
  // from an uncommitted state. An active pregnancy/postpartum journey must be
  // left through its own end-flow (which cleans up the profile) — otherwise a
  // stray "turn on" here just orphans the still-active profile in storage.
  const inJourney = isPregnant || isPostpartum;
  return (
    <PageShell title="Settings">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Passcode lock</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Encrypt your on-device health records behind a passcode. Everything
          still stays local to this device.
        </p>
        <PasscodeControls />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Sync across devices</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Optional. Your data is encrypted with your recovery phrase before it leaves this device —
          the server stores only ciphertext it can never read.
        </p>
        <SyncControls
          onSynced={async () => {
            refreshSettings();
            await refresh();
          }}
          onRestored={async () => {
            // Restore installs keys and pulls a whole health record — rehydrate
            // the live context, then land on Home like onboarding does.
            refreshSettings();
            await refresh();
            router.push('/');
          }}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Reminders</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Lumen can nudge you about your period, fertile window, and daily logging.
          Because everything stays on this device, notifications appear when you open
          Lumen — there is no server sending you push messages.
        </p>
        <NotificationControls />
      </section>
      {!inJourney && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Trying to conceive</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Turn on TTC mode to log BBT, LH tests, and cervical mucus, and get daily
            conception guidance. Lumen is not a contraceptive and not a substitute for
            fertility treatment or medical advice.
          </p>
          <TtcControls onEnabled={() => router.push('/')} />
        </section>
      )}
      {!isPostpartum && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Pregnancy</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Switch on pregnancy mode for week-by-week tracking, a kick counter, and a
            contraction timer. Educational only — not a substitute for medical care.
          </p>
          <PregnancyControls onStarted={() => router.push('/')} onEnded={() => router.push('/')} />
        </section>
      )}
      {isPostpartum && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Postpartum</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            After birth, Lumen supports your recovery with weekly guidance and a mood check-in.
          </p>
          <PostpartumControls />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Your data</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Your health data lives on this device. Unless you turn on encrypted sync above, nothing
          ever leaves it — and even then the server can only hold ciphertext.
        </p>
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Because it lives only here, clearing your browser data, using private mode, or losing
          this device will erase it. Export regularly, then use “Restore from a backup” on a new
          device or after clearing data.
        </p>
        <Link
          href="/report"
          className="block w-full rounded-md border px-4 py-3 text-center"
        >
          Doctor summary (print / PDF)
        </Link>
        <DataControls
          onDeleted={async () => {
            // The provider outlives this navigation, so reset the live context
            // after a wipe before leaving — otherwise the just-deleted cycles
            // and life stage linger in memory and bleed into the next screen.
            await refresh();
            refreshSettings();
            router.replace('/onboarding');
          }}
          onImported={async () => {
            // Same stale-context reason as onDeleted: pull the restored records
            // and preferences into the live provider so the app reflects them
            // without a reload.
            await refresh();
            refreshSettings();
          }}
        />
      </section>
    </PageShell>
  );
}
