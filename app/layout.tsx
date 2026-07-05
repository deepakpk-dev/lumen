import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from '@/src/components/ServiceWorkerRegistrar';
import { PasscodeGate } from '@/src/components/PasscodeGate';
import { HealthDataProvider } from '@/src/state/useHealthData';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lumen — Private Cycle & Health Tracker",
    template: "%s · Lumen",
  },
  description:
    "Track your menstrual cycle, symptoms, and health privately. Lumen is offline-first and stores everything on your device — no accounts, no cloud, no data selling.",
  applicationName: "Lumen",
  keywords: [
    "period tracker",
    "cycle tracking",
    "menstrual health",
    "ovulation tracker",
    "fertility",
    "private health app",
    "offline-first",
    "symptom tracker",
  ],
  category: "health",
  authors: [{ name: "Lumen" }],
  creator: "Lumen",
  publisher: "Lumen",
  formatDetection: { email: false, address: false, telephone: false },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Lumen",
    title: "Lumen — Private Cycle & Health Tracker",
    description:
      "Offline-first cycle and health tracking that keeps your data on your device.",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Lumen — Private Cycle & Health Tracker",
    description:
      "Offline-first cycle and health tracking that keeps your data on your device.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Lumen",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let content extend into the notch / home-indicator area so we can pad it
  // back with env(safe-area-inset-*); required for installed (standalone) PWAs.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        <PasscodeGate>
          <HealthDataProvider>{children}</HealthDataProvider>
        </PasscodeGate>
        <footer className="no-print mt-auto border-t border-neutral-200 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <Link href="/privacy" className="underline">
            Privacy &amp; your data
          </Link>
        </footer>
      </body>
    </html>
  );
}
