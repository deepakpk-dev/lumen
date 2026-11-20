import Link from 'next/link';
import type { ReactNode } from 'react';
import { LumenIcon } from './LumenIcon';

export function PageShell({ title, subtitle, eyebrow, action, backHref = '/', backLabel = 'Today', children }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  backHref?: string | null;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="lumen-page">
      {backHref && (
        <Link href={backHref} className="lumen-text-link mb-3" aria-label={`Back to ${backLabel}`}>
          <LumenIcon name="back" size={16} />{backLabel}
        </Link>
      )}
      {title && (
        <header className="lumen-page-header">
          {eyebrow && <p className="lumen-eyebrow">{eyebrow}</p>}
          <h1 className="lumen-title">{title}</h1>
          {subtitle && <p className="lumen-subtitle">{subtitle}</p>}
          {action && <div className="mt-3">{action}</div>}
        </header>
      )}
      <div className="lumen-stack">{children}</div>
    </main>
  );
}

export function NavTile({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="lumen-outline">{children}</Link>;
}
