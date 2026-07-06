'use client';

import { useState } from 'react';
import { useHealthData } from '@/src/state/useHealthData';
import { todayISO } from '@/src/domain/dates';

type Screen = 'closed' | 'choose' | 'birth' | 'loss';

// ponytail: DOM + Web Animations API confetti; swap for canvas-confetti if we ever want physics.
function confettiBurst() {
  // Decoration must never block the data write: skip where the Web Animations
  // API / matchMedia don't exist (jsdom, old browsers) instead of throwing.
  if (typeof Element.prototype.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#f43f5e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    const size = 6 + Math.random() * 6;
    Object.assign(piece.style, {
      position: 'fixed',
      left: '50%',
      top: '40%',
      width: `${size}px`,
      height: `${size * 0.6}px`,
      background: colors[i % colors.length],
      borderRadius: '1px',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(piece);
    const angle = Math.random() * 2 * Math.PI;
    const distance = 120 + Math.random() * 260;
    piece
      .animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * distance}px, ${
              Math.sin(angle) * distance + 300
            }px) rotate(${Math.random() * 720 - 360}deg)`,
            opacity: 0,
          },
        ],
        { duration: 1800 + Math.random() * 1200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
      )
      .finished.finally(() => piece.remove());
  }
}

export function PregnancyEndFlow({ onEnded }: { onEnded?: () => void }) {
  const { endPregnancyBirth, endPregnancyLoss } = useHealthData();
  const [screen, setScreen] = useState<Screen>('closed');

  if (screen === 'closed') {
    return (
      <button
        type="button"
        onClick={() => setScreen('choose')}
        className="w-full rounded-md border px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300"
      >
        Manage pregnancy
      </button>
    );
  }

  if (screen === 'choose') {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">Has your pregnancy ended?</p>
        <button type="button" onClick={() => setScreen('birth')} className="w-full rounded-md border px-4 py-2 text-sm">
          Baby arrived
        </button>
        <button type="button" onClick={() => setScreen('loss')} className="w-full rounded-md border px-4 py-2 text-sm">
          My pregnancy has ended
        </button>
        <button type="button" onClick={() => setScreen('closed')} className="w-full rounded-md px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
          Cancel
        </button>
      </div>
    );
  }

  if (screen === 'birth') {
    return (
      <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Congratulations. We&apos;ll switch to postpartum mode to support your recovery — you can
          return to cycle tracking whenever you&apos;re ready.
        </p>
        <button
          type="button"
          onClick={async () => { confettiBurst(); await endPregnancyBirth(todayISO()); onEnded?.(); }}
          className="w-full rounded-md bg-rose-600 px-4 py-2 text-sm text-white"
        >
          Confirm
        </button>
        <button type="button" onClick={() => setScreen('choose')} className="w-full rounded-md px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
          Back
        </button>
      </div>
    );
  }

  // screen === 'loss' — compassionate, no celebratory or period prompts.
  return (
    <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        We&apos;re so sorry for your loss. Take all the time you need — there&apos;s nothing you
        have to do here right now.
      </p>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">
        If it would help, support is available. You don&apos;t have to go through this alone.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
        <li>Reach out to your healthcare provider for care and guidance.</li>
        <li>Consider a pregnancy-loss support line or counseling service in your area.</li>
      </ul>
      <button
        type="button"
        onClick={() => endPregnancyLoss(todayISO())}
        className="w-full rounded-md border px-4 py-2 text-sm"
      >
        Return to cycle mode
      </button>
      <button type="button" onClick={() => setScreen('choose')} className="w-full rounded-md px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400">
        Back
      </button>
    </div>
  );
}
