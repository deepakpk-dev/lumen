'use client';

import { useRouter } from 'next/navigation';
import { DataControls } from '@/src/components/DataControls';

export default function SettingsPage() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
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
