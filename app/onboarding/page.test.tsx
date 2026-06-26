import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import OnboardingPage from './page';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

// Capture the onComplete handler the page wires onto the form so we can invoke
// it with a goal, simulating the user finishing setup.
let captured: ((goal: 'cycle' | 'ttc' | 'pregnant') => void) | null = null;
vi.mock('@/src/components/OnboardingForm', () => ({
  OnboardingForm: ({ onComplete }: { onComplete: typeof captured }) => {
    captured = onComplete;
    return null;
  },
}));

beforeEach(() => {
  push.mockReset();
  captured = null;
});

describe('OnboardingPage', () => {
  it('routes a pregnant user to the pregnancy page', () => {
    render(<OnboardingPage />);
    captured!('pregnant');
    expect(push).toHaveBeenCalledWith('/pregnancy');
  });

  it('routes a TTC user to the fertility page', () => {
    render(<OnboardingPage />);
    captured!('ttc');
    expect(push).toHaveBeenCalledWith('/fertility');
  });

  it('routes a plain cycle user to the home dashboard', () => {
    render(<OnboardingPage />);
    captured!('cycle');
    expect(push).toHaveBeenCalledWith('/');
  });
});
