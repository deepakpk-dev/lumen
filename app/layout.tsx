import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from '@/src/components/ServiceWorkerRegistrar';
import { PasscodeGate } from '@/src/components/PasscodeGate';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumen — Cycle & Health",
  description: "Private, offline-first cycle and health tracking.",
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
        <PasscodeGate>{children}</PasscodeGate>
        <footer className="mt-auto border-t border-neutral-200 px-6 py-4 text-center text-xs text-neutral-500">
          <Link href="/privacy" className="underline">
            Privacy &amp; your data
          </Link>
        </footer>
      </body>
    </html>
  );
}
