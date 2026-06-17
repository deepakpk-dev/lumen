'use client';

import { useRouter } from 'next/navigation';
import { DataControls } from '@/src/components/DataControls';
import { PasscodeControls } from '@/src/components/PasscodeControls';

export default function SettingsPage() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Passcode lock</h2>
        <p className="text-xs text-neutral-500">
          Protect the app with a numeric passcode stored only on this device.
        </p>
        <PasscodeControls />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-600">Your data</h2>
        <p className="text-xs text-neutral-500">
          Your health data is stored only on this device. We never upload it.
        </p>
        <DataControls onDeleted={() => router.replace('/onboarding')} />
      </section>
    </main>
  );
}
