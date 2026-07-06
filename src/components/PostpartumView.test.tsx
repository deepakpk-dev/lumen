// src/components/PostpartumView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostpartumView } from './PostpartumView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
let breastfeeding = false;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    loading: false,
    isPostpartum: true,
    postpartumWeekNumber: 3,
    recoveryStageToday: 'acute',
    postpartumContentToday: { week: 3, focus: 'Settling in', notes: ['Rest when you can.'] },
    latestEpds: null,
    postpartumProfile: { id: 'current', birthDate: '2026-06-15', startedAt: '2026-06-15', status: 'active', breastfeeding },
  }),
}));

describe('PostpartumView', () => {
  it('renders the recovery week and content', () => {
    render(<PostpartumView />);
    expect(screen.getByText(/week 3/i)).toBeInTheDocument();
    expect(screen.getByText(/rest when you can/i)).toBeInTheDocument();
  });
  it('links to the mood check-in', () => {
    render(<PostpartumView />);
    expect(screen.getByRole('link', { name: /check-in/i })).toHaveAttribute('href', '/postpartum/checkin');
  });
  it('tunes the cycle-return copy to the breastfeeding flag', () => {
    breastfeeding = false;
    const { unmount } = render(<PostpartumView />);
    expect(screen.getByText(/often return within about 6–12 weeks/i)).toBeInTheDocument();
    unmount();
    breastfeeding = true;
    render(<PostpartumView />);
    expect(screen.getByText(/while you are breastfeeding/i)).toBeInTheDocument();
  });
});
