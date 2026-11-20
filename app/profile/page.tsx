'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { LumenIcon, type LumenIconName } from '@/src/components/LumenIcon';
import { PageShell } from '@/src/components/PageShell';
import { useHealthData } from '@/src/state/useHealthData';

const links: { href: string; title: string; description: string; icon: LumenIconName }[] = [
  { href: '/settings', title: 'Settings', description: 'Manage tracking, reminders, and sync', icon: 'settings' },
  { href: '/programs', title: 'Programs', description: 'Read a series of articles on one topic', icon: 'book' },
  { href: '/report', title: 'Doctor summary', description: 'Print or save a PDF for an appointment', icon: 'insights' },
  { href: '/privacy', title: 'Privacy & your data', description: 'See where Lumen stores your data', icon: 'shield' },
];

function NameForm({ initialName }: { initialName: string }) {
  const { updatePersonalization } = useHealthData();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePersonalization({ preferredName: name.trim() || undefined });
      setName(name.trim());
      setStatus('Name saved.');
    } catch {
      setStatus('Couldn’t save your name. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="lumen-card" onSubmit={save}>
      <label className="setup-label">Preferred name (optional)
        <input className="lumen-field mt-1" value={name} maxLength={35} autoComplete="nickname"
          onChange={(event) => { setName(event.target.value); setStatus(''); }} />
      </label>
      <button type="submit" className="lumen-button mt-2" disabled={saving}>Save name</button>
      {status && <p role="status" className="lumen-note mt-3">{status}</p>}
    </form>
  );
}

export default function ProfilePage() {
  const { personalization, loading } = useHealthData();
  return (
    <PageShell title="Profile" backHref={null}>
      {!loading && <NameForm initialName={personalization?.preferredName ?? ''} />}
      <div className="lumen-card py-1">
        {links.map(({ href, title, description, icon }) => (
          <Link key={href} href={href} className="lumen-row">
            <span className="lumen-icon-box"><LumenIcon name={icon} size={18} /></span>
            <span className="lumen-row-copy"><strong>{title}</strong><small className="lumen-muted">{description}</small></span>
            <LumenIcon name="chevron" size={16} />
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
