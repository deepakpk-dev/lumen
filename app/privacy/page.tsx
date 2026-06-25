import Link from 'next/link';

export const metadata = {
  title: 'Privacy & your data — Lumen',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Privacy &amp; your data</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Lumen is private by design.</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Where your data lives</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Everything you log — cycles, symptoms, moods, pregnancy, postpartum recovery, and
          mood check-ins — is stored only on this device, in your browser&apos;s local database.
          It never leaves your device and is never uploaded to any server.
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
          Because your data is stored only on this device, clearing your browser data, using
          private/incognito mode, or losing this device will erase it. Export regularly to keep a
          backup you can restore from. An optional passcode adds an app-level lock, but the local
          database itself is not encrypted.
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

      <Link href="/" className="block text-sm text-neutral-500 underline dark:text-neutral-400">
        ← Back to Lumen
      </Link>
    </main>
  );
}
