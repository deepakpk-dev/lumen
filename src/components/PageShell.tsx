import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared scaffold for the elevated visual language, so every screen reads as
// one product: brand row (back link + wordmark), gradient title, staggered
// entrance — on a clean white background (ambient washes stay on onboarding
// only). Hero cards and CTAs remain per-screen; content sections stay flat.
export function PageShell({
  title,
  subtitle,
  backHref = '/',
  backLabel = 'Home',
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  // null hides the back link (e.g. the home screen has nowhere to go back to).
  backHref?: string | null;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="lumen-page">
      <style>{`
        .lumen-page .lumen-in {
          opacity: 0;
          animation: lumen-page-in 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .lumen-page [data-in='1'] { animation-delay: 0.03s; }
        .lumen-page [data-in='2'] { animation-delay: 0.12s; }
        @keyframes lumen-page-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lumen-page .lumen-in { animation: none; opacity: 1; }
        }
      `}</style>
      <main className="mx-auto max-w-md space-y-6 p-6">
        <div className="lumen-in flex items-center justify-between" data-in="1">
          {backHref ? (
            <Link
              href={backHref}
              className="-ml-2 flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
              {backLabel}
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]"
            />
            <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
              Lumen
            </span>
          </span>
        </div>

        {title && (
          <div className="lumen-in" data-in="1">
            <h1 className="bg-gradient-to-r from-rose-600 via-rose-500 to-pink-500 bg-clip-text text-[28px] font-bold tracking-tight text-transparent dark:from-rose-300 dark:via-rose-300 dark:to-pink-300">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {subtitle}
              </p>
            )}
          </div>
        )}

        <div className="lumen-in space-y-6" data-in="2">{children}</div>
      </main>
    </div>
  );
}

// Nav tile used by stage screens' quick-action grids, in the glassy card style.
export function NavTile({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur transition hover:border-rose-200 hover:shadow-md dark:border-neutral-800 dark:bg-white/[0.04] dark:hover:border-rose-900"
    >
      {children}
    </Link>
  );
}
