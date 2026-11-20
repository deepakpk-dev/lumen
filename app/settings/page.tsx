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
import { MenopauseControls } from '@/src/components/MenopauseControls';
import { PersonalizationControls } from '@/src/components/PersonalizationControls';

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
      <div className="lumen-settings">
      <section className="space-y-3">
        <h2>Tracking preferences</h2>
        <PersonalizationControls />
      </section>
      <section className="space-y-3" id="passcode">
        <h2 className="lumen-card-title">Passcode lock</h2>
        <PasscodeControls />
      </section>
      <section className="space-y-3" id="restore">
        <h2 className="lumen-card-title">Sync across devices</h2>
        <p className="lumen-help">
          Sync is optional. Lumen encrypts your records before uploading them.
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
      <section className="space-y-3" id="reminders">
        <h2 className="lumen-card-title">Reminders</h2>
        <p className="lumen-help">
          Reminders appear when you open Lumen. You can also let your browser show them
          as device notifications.
        </p>
          <NotificationControls />
      </section>
      {!inJourney && (
        <section className="space-y-3">
          <h2 className="lumen-card-title">Trying to conceive</h2>
          <p className="lumen-help">
            Log basal body temperature, ovulation test results, and cervical mucus to get daily
            conception guidance. Lumen is not a contraceptive and not a substitute for
            fertility treatment or medical advice.
          </p>
          <TtcControls onEnabled={() => router.push('/')} />
        </section>
      )}
      {!inJourney && (
        <section className="space-y-3">
          <h2 className="lumen-card-title">Perimenopause</h2>
          <p className="lumen-help">
            Log symptoms such as hot flashes and night sweats. Period estimates may be less
            reliable when cycles are irregular. Pregnancy is still possible until you&apos;ve
            gone 12 months without a period.
          </p>
          <MenopauseControls onEnabled={() => router.push('/')} />
        </section>
      )}
      {!isPostpartum && (
        <section className="space-y-3">
          <h2 className="lumen-card-title">Pregnancy</h2>
          <p className="lumen-help">
            Follow your pregnancy week by week, count kicks, and time contractions.
            Use these tools alongside professional medical care.
          </p>
          <PregnancyControls onStarted={() => router.push('/')} onEnded={() => router.push('/')} />
        </section>
      )}
      {isPostpartum && (
        <section className="space-y-3">
          <h2 className="lumen-card-title">Postpartum</h2>
          <p className="lumen-help">
            See weekly recovery guidance and review your mood check-ins.
          </p>
          <PostpartumControls />
        </section>
      )}
      <section className="space-y-3" id="data">
        <h2 className="lumen-card-title">Your data</h2>
        <p className="lumen-note lumen-warning">
          Clearing browser data or losing this device can erase your local records. Export a
          backup, then use “Restore from a backup” to load the file when you need it.
        </p>
        <Link
          href="/report"
          className="lumen-outline w-full"
        >
          View doctor summary
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
      </div>
    </PageShell>
  );
}
