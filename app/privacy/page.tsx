import Link from 'next/link';
import { PageShell } from '@/src/components/PageShell';

export const metadata = {
  title: 'Privacy & your data',
};

export default function PrivacyPage() {
  return (
    <PageShell
      title={<>Privacy &amp; your data</>}
      subtitle="Your health data stays on this device by default."
      backLabel="Back to Lumen"
    >
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Where your data lives</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Your logs are stored on this device in your browser. Lumen uploads encrypted health
          records only if you turn on sync across devices.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Passcode lock</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          <Link href="/settings#passcode" className="underline">Set a passcode</Link> to encrypt
          your health records on this device, including their dates. If you leave the passcode
          off, someone with access to this browser profile may be able to read your records.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sync across devices</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Sync is off by default. If you turn it on, Lumen encrypts your records on this device
          before uploading them. Your recovery phrase unlocks synced data on another device.
          The server can see when you sync and roughly how many records you have. It receives
          encrypted records and never receives your recovery phrase.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">How the web app is delivered</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Encryption protects health records stored on the sync server. Your privacy also
          depends on the code Lumen and its web host deliver to your browser. This applies
          when you install Lumen as a web app, too.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Accounts and tracking</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          You can use Lumen and enable sync without an account or email address. Lumen
          doesn&apos;t include advertising trackers or usage analytics.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Export or delete your data</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Use <Link href="/settings#data" className="underline">data settings</Link> to export
          a backup, restore a backup file, or delete your data. If sync is on, deleting your
          data also deletes the encrypted server copy.
        </p>
      </section>

      <section className="lumen-panel lumen-warning space-y-2">
        <h2 className="font-semibold">Keep a backup</h2>
        <p className="text-sm">
          You can lose your local records if you clear browser data, close a private browsing
          session, or lose this device. Export a backup and store it safely. If you use sync,
          save your recovery phrase so you can restore your synced records on another device.
          Lumen can&apos;t recover the phrase for you.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Not medical advice</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Lumen is for general information and self-tracking only. It is not a contraceptive, not a
          diagnostic tool, and not a substitute for professional medical care. The mood check-in is
          a screening tool, not a diagnosis. If you are in crisis or may be in danger, contact your
          healthcare provider or your local emergency services.
        </p>
      </section>
    </PageShell>
  );
}
