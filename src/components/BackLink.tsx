import Link from 'next/link';
import type { ReactNode } from 'react';

// Consistent, polished navigation link used at the top of pages. Chevron +
// label, hover/focus states, and a comfortable touch target.
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-neutral-500 transition hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 dark:text-neutral-400 dark:hover:text-rose-300"
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {children}
    </Link>
  );
}
