'use client';

import { useRouter } from 'next/navigation';
import { OnboardingForm } from '@/src/components/OnboardingForm';

export default function OnboardingPage() {
  const router = useRouter();
  // Land each goal on its own stage so the first screen matches what the user
  // just set up: pregnant users on the week-by-week page, TTC users on the
  // fertility space. The plain cycle goal has no dedicated screen, so it starts
  // on the home dashboard.
  const destination = { pregnant: '/pregnancy', ttc: '/fertility', cycle: '/' } as const;
  return <OnboardingForm onComplete={(goal) => router.push(destination[goal])} />;
}
