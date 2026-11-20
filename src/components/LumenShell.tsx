'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { dueReminders } from '@/src/domain/reminders';
import { getReminderPrefs } from '@/src/settings/preferences';
import { LumenBrand } from './LumenBrand';
import { LumenIcon } from './LumenIcon';

const tabs = [
  { href: '/', label: 'Today', icon: 'home' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/log', label: 'Log', icon: 'add' },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/library', label: 'Library', icon: 'book' },
] as const;

export function LumenShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { today, loading, cycles, pregnancyProfile, postpartumProfile, onboardingComplete,
    personalization, prediction, dailyLogs, lifeStage } = useHealthData();
  const onboarding = pathname === '/onboarding';
  const ready = !loading && Boolean(onboardingComplete || cycles.length || pregnancyProfile || postpartumProfile);
  const showTabs = ready && !onboarding && pathname !== '/report';
  const initials = personalization?.preferredName?.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toLocaleUpperCase();
  const reviewed = personalization?.reviewedReminders;
  const hasReminders = ready && dueReminders({ prediction, dailyLogs, lifeStage, today, prefs: getReminderPrefs() })
    .some(({ kind }) => reviewed?.date !== today || !reviewed.kinds.includes(kind));
  const active = pathname === '/history' ? '/insights'
    : pathname.startsWith('/programs') || pathname.startsWith('/library/') ? '/library' : pathname;

  return (
    <div className={`lumen-app${showTabs ? ' has-tabs' : ''}${onboarding ? ' is-onboarding' : ''}`}>
      {!onboarding && (
        <header className="lumen-topbar no-print">
          <LumenBrand />
          {ready && (
            <div className="lumen-header-actions">
              <Link href="/notifications" aria-label="Notifications" className="lumen-icon-button lumen-bell">
                <LumenIcon name="bell" />{hasReminders && <span className="lumen-bell-dot" />}
              </Link>
              <Link href="/profile" aria-label="Profile" className="lumen-icon-button lumen-avatar">
                {initials || <LumenIcon name="user" />}
              </Link>
            </div>
          )}
        </header>
      )}
      {children}
      {!onboarding && (
        <footer className="lumen-footer no-print">
          <Link href="/privacy" className="lumen-text-link"><LumenIcon name="shield" size={15} /> Privacy &amp; your data</Link>
        </footer>
      )}
      {showTabs && (
        <nav className="lumen-nav no-print" aria-label="Main navigation">
          {tabs.map(({ href, label, icon }) => (
            <Link key={href} href={href} className="lumen-tab" aria-current={active === href ? 'page' : undefined}>
              <LumenIcon name={icon} size={21} />{label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
