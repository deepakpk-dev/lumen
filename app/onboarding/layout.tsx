import type { Viewport } from 'next';

// Tint the PWA / mobile status bar rose so it blends into the welcome screen's
// full-bleed gradient. Overrides the root themeColor for the /onboarding route
// only; width/initialScale/viewportFit are inherited from the root viewport.
export const viewport: Viewport = {
  themeColor: '#e11d48',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
