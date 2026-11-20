import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./lumen.css";
import "./welcome.css";
import "./onboarding.css";
import { ServiceWorkerRegistrar } from '@/src/components/ServiceWorkerRegistrar';
import { PasscodeGate } from '@/src/components/PasscodeGate';
import { SyncRunner } from '@/src/components/SyncRunner';
import { HealthDataProvider } from '@/src/state/useHealthData';
import { LumenShell } from '@/src/components/LumenShell';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description =
  "Track your cycle, fertility, pregnancy, postpartum recovery, or perimenopause. Your logs stay on this device by default, with optional encrypted sync.";
const socialTitle = "Lumen | Private reproductive health tracking";
const socialImage = { url: "/icon-512.png", width: 512, height: 512, alt: "Lumen logo" };

export const metadata: Metadata = {
  metadataBase: new URL(`https://${process.env.VERCEL_URL ?? "lumen-pi-one.vercel.app"}`),
  title: {
    default: socialTitle,
    template: "%s · Lumen",
  },
  description,
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
    title: socialTitle,
    description,
    images: [socialImage],
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: socialTitle,
    description,
    images: [socialImage],
  },
  icons: {
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
    { media: "(prefers-color-scheme: light)", color: "#faf8f9" },
    { media: "(prefers-color-scheme: dark)", color: "#201820" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        <PasscodeGate>
          <HealthDataProvider>
            <SyncRunner />
            <LumenShell>{children}</LumenShell>
          </HealthDataProvider>
        </PasscodeGate>
      </body>
    </html>
  );
}
