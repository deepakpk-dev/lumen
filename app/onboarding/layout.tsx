import type { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#f8eaf0',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
