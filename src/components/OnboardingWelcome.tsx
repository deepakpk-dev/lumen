import Link from 'next/link';
import type { Ref } from 'react';
import { LumenIcon } from './LumenIcon';

export function OnboardingWelcome({ onStart, headingRef }: { onStart: () => void; headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <main className="welcome-screen" aria-label="Welcome to Lumen">
    <div className="welcome-copy">
      <p className="welcome-kicker">A little closer to you</p>
      <h1 ref={headingRef} tabIndex={-1}>Your body has a<br /> rhythm. Let’s<br /> discover it.</h1>
      <p className="welcome-description">A calmer way to notice patterns, honour changes, and feel more in tune with yourself.</p>
    </div>
    <div className="welcome-art">
      <div className="welcome-orbit" aria-hidden="true"><span></span><span></span></div>
      <div className="welcome-orb" aria-hidden="true"></div>
      <svg className="welcome-petals bottom" viewBox="0 0 130 130" aria-hidden="true">
        <path fill="#f7c5d7" d="M69 113C10 85 16 40 49 22c22 18 34 42 20 91Z"/>
        <path fill="#e889ad" d="M64 114c25-74 58-81 66-67-12 31-36 55-66 67Z"/>
        <path fill="#ef9bb9" d="M70 112C47 39 67 9 91 6c10 36 2 71-21 106Z"/>
      </svg>
      <svg className="welcome-petals top" viewBox="0 0 130 130" aria-hidden="true">
        <path fill="#f7cfdf" d="M65 115C16 79 24 32 53 14c19 25 30 54 12 101Z"/>
        <path fill="#eb9bb9" d="M64 113C58 52 85 8 111 14c9 44-15 78-47 99Z"/>
        <path fill="#db76a2" d="M63 113c21-54 51-65 66-53-12 24-37 42-66 53Z"/>
      </svg>
      <div className="welcome-wordmark">
        <span>One day at a time</span><strong>lumen</strong><small>Find your rhythm</small>
      </div>
      <div className="welcome-callout first">
        <LumenIcon name="heart" /><div><b>Be gentle with yourself</b><small>Every cycle is unique</small></div>
      </div>
      <div className="welcome-callout second">
        <LumenIcon name="calendar" /><div><b>Your cycle, understood</b><small>Without the overwhelm</small></div>
      </div>
    </div>
    <p className="welcome-caption"><LumenIcon name="spark" /> A softer approach to cycle tracking</p>
      <div className="welcome-actions">
        <button type="button" className="lumen-button" onClick={onStart}>
          Get started <LumenIcon name="arrow" size={18} />
        </button>
        <p className="welcome-disclaimer">Your data stays on this device unless you enable encrypted sync. Lumen is for self-tracking and is not medical advice or a contraceptive.</p>
        <Link href="/settings#restore" className="lumen-text-link">Already use Lumen? Restore your data</Link>
        <Link href="/privacy" className="lumen-text-link"><LumenIcon name="shield" size={16} /> Privacy &amp; your data</Link>
      </div>
    </main>
  );
}
