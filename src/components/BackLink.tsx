import Link from 'next/link';
import type { ReactNode } from 'react';

// Consistent, polished navigation link used at the top of pages. Chevron +
// label, hover/focus states, and a comfortable touch target.
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="lumen-text-link"
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
