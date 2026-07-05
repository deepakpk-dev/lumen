import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgramsPage from './page';
import type { ProgramStatus } from '@/src/domain/content/programs/types';

let mockState: Record<string, unknown>;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => mockState,
}));

const status: ProgramStatus = {
  program: {
    slug: 'understanding-your-cycle',
    title: 'Understanding your cycle',
    summary: 'A five-part guided tour.',
    description: 'desc',
    lifeStages: ['cycle'],
    topics: ['getting-started'],
    steps: [{ articleSlug: 'how-tracking-works' }],
  },
  completedSteps: [],
  completedCount: 0,
  totalSteps: 5,
  percentComplete: 0,
  isComplete: false,
  nextStep: { articleSlug: 'how-tracking-works' },
};

beforeEach(() => {
  mockState = { programs: [status], loading: false };
});

describe('ProgramsPage', () => {
  it('lists the programs for the current stage', () => {
    render(<ProgramsPage />);
    expect(screen.getByRole('heading', { name: /programs/i })).toBeTruthy();
    expect(screen.getByText('Understanding your cycle')).toBeTruthy();
  });

  it('shows a friendly message when no program is available', () => {
    mockState = { programs: [], loading: false };
    render(<ProgramsPage />);
    expect(screen.getByText(/on its way/i)).toBeTruthy();
  });
});
