import Image from 'next/image';
import Link from 'next/link';
import type { Ref } from 'react';
import { LumenIcon } from './LumenIcon';

export function OnboardingWelcome({ onStart, headingRef }: { onStart: () => void; headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <main className="welcome-screen" aria-label="Welcome to Lumen">
      <div className="welcome-brand" aria-hidden="true">
        <Image
          src="/lumen-mark-512.webp"
          alt=""
          width={512}
          height={512}
          className="welcome-logo"
          loading="eager"
          unoptimized
        />
        <span className="welcome-wordmark">Lumen</span>
      </div>
      <div className="welcome-copy">
        <h1 ref={headingRef} tabIndex={-1}>Track your reproductive health</h1>
        <p className="welcome-description">Log periods and symptoms, track fertility or pregnancy, and follow changes after birth or during perimenopause.</p>
      </div>
      <div className="welcome-actions">
        <button type="button" className="lumen-button" onClick={onStart}>
          Get started <LumenIcon name="arrow" size={18} />
        </button>
        <p className="welcome-disclaimer">Your logs stay on this device by default. Sync across devices is optional and encrypted end to end.</p>
        <p className="welcome-disclaimer">Lumen is for self-tracking. It is not medical advice or a contraceptive.</p>
        <Link href="/settings#restore" className="lumen-text-link">Restore from another device</Link>
        <Link href="/privacy" className="lumen-text-link"><LumenIcon name="shield" size={16} /> Privacy &amp; your data</Link>
      </div>
    </main>
  );
}
