import Link from 'next/link';
import { PageShell } from '@/src/components/PageShell';

export const metadata = {
  title: 'Privacy & your data — Lumen',
};

export default function PrivacyPage() {
  return (
    <PageShell
      title={<>Privacy &amp; your data</>}
      subtitle="Lumen is private by design."
      backLabel="Back to Lumen"
    >
      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Where your data lives</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Everything you log — cycles, symptoms, moods, pregnancy, postpartum recovery, and
          mood check-ins — is stored on this device, in your browser&apos;s local database. By
          default it stays here and is never uploaded to any server. The only way your data leaves
          this device is if you turn on sync yourself (see below).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Optional passcode encryption</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          You can set a passcode in{' '}
          <Link href="/settings" className="underline">
            Settings
          </Link>{' '}
          to encrypt your on-device records with AES-256. Once it&apos;s on, your data is
          unreadable at rest without the passcode, and even the dates and life stages you have data
          for are hidden. Without a passcode, your records are stored unencrypted in the browser
          database — anyone with access to this device or browser profile can read them.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Optional sync across devices</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Sync is off unless you turn it on. When you do, your data is encrypted on this device with
          a key derived from your recovery phrase <em>before</em> it is uploaded. The server stores
          only ciphertext, under an opaque identifier — there is no account, no email, and nothing
          linking the data to you. The key never leaves your device, so a stolen copy of the
          server&apos;s database is just unreadable ciphertext. The server can still see when you
          sync and roughly how many records you have, but never their contents.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">The honest caveat</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          One thing we won&apos;t overstate: Lumen runs in your browser, and the code that does the
          encrypting is served by us each time you load it. So the guarantees above hold against
          anyone who steals the server&apos;s stored data — but they still rely on us, and our
          hosting, to serve honest app code that we haven&apos;t tampered with. We don&apos;t have
          your recovery phrase and never will, so we can&apos;t decrypt what&apos;s already stored;
          an installed app, which we plan to offer, would remove even this last bit of trust in the
          browser delivery.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">What we don&apos;t collect</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          No accounts, no tracking, no analytics, and no advertising SDKs. We don&apos;t know who
          you are and we don&apos;t collect any usage data.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">You&apos;re in control</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          You can export all of your data at any time, or permanently delete everything, from{' '}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
        <h2 className="text-sm font-medium text-amber-900 dark:text-amber-200">Keep a backup</h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Because your data lives on this device, clearing your browser data, using private/incognito
          mode, or losing this device will erase the local copy. Export regularly to keep a backup
          you can restore from. If you use sync, keep your recovery phrase somewhere safe — it is the
          only thing that can decrypt your synced data, and no one, including us, can recover it for
          you.
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
