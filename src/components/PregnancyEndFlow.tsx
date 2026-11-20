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
        className="lumen-outline w-full"
      >
        Manage pregnancy
      </button>
    );
  }

  if (screen === 'choose') {
    return (
      <div className="lumen-panel space-y-3">
        <p className="lumen-help">Has your pregnancy ended?</p>
        <button type="button" onClick={() => setScreen('birth')} className="lumen-outline w-full">
          Baby arrived
        </button>
        <button type="button" onClick={() => setScreen('loss')} className="lumen-outline w-full">
          My pregnancy has ended
        </button>
        <button type="button" onClick={() => setScreen('closed')} className="lumen-text-link w-full justify-center">
          Cancel
        </button>
      </div>
    );
  }

  if (screen === 'birth') {
    return (
      <div className="lumen-panel space-y-3">
        <p className="lumen-help">
          Congratulations. Lumen will record today as the birth date and switch to postpartum recovery.
          You can return to cycle tracking when you’re ready.
        </p>
        <button
          type="button"
          onClick={async () => { confettiBurst(); await endPregnancyBirth(todayISO()); onEnded?.(); }}
          className="lumen-button w-full"
        >
          Start postpartum recovery
        </button>
        <button type="button" onClick={() => setScreen('choose')} className="lumen-text-link w-full justify-center">
          Back
        </button>
      </div>
    );
  }

  // screen === 'loss' — compassionate, no celebratory or period prompts.
  return (
    <div className="lumen-panel space-y-3">
      <p className="lumen-help">
        We&apos;re so sorry for your loss. Take all the time you need — there&apos;s nothing you
        have to do here right now.
      </p>
      <p className="lumen-help">
        If it would help, support is available. You don&apos;t have to go through this alone.
      </p>
      <ul className="lumen-help list-disc space-y-1 pl-5">
        <li>Reach out to your healthcare provider for care and guidance.</li>
        <li>Consider a pregnancy-loss support line or counseling service in your area.</li>
      </ul>
      <button
        type="button"
        onClick={async () => {
          await endPregnancyLoss(todayISO());
          onEnded?.();
        }}
        className="lumen-outline w-full"
      >
        Return to cycle mode
      </button>
      <button type="button" onClick={() => setScreen('choose')} className="lumen-text-link w-full justify-center">
        Back
      </button>
    </div>
  );
}
