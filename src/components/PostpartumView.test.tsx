// src/components/PostpartumView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostpartumView } from './PostpartumView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    loading: false,
    isPostpartum: true,
    postpartumWeekNumber: 3,
    recoveryStageToday: 'acute',
    postpartumContentToday: { week: 3, focus: 'Settling in', notes: ['Rest when you can.'] },
    latestEpds: null,
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
});
