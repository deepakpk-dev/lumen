'use client';

import { useRouter } from 'next/navigation';
import { OnboardingForm } from '@/src/components/OnboardingForm';

export default function OnboardingPage() {
  const router = useRouter();
  return <OnboardingForm onComplete={() => router.push('/')} />;
}
