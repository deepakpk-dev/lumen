import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgramCard } from './ProgramCard';
import type { ProgramStatus } from '@/src/domain/content/programs/types';

const base: ProgramStatus = {
  program: {
    slug: 'understanding-your-cycle',
    title: 'Understanding your cycle',
    summary: 'A five-part guided tour.',
    description: 'desc',
    lifeStages: ['cycle'],
    topics: ['getting-started'],
    steps: [{ articleSlug: 'how-tracking-works' }, { articleSlug: 'menstrual-phase' }],
  },
  completedSteps: ['how-tracking-works'],
  completedCount: 1,
  totalSteps: 2,
  percentComplete: 50,
  isComplete: false,
  nextStep: { articleSlug: 'menstrual-phase' },
};

describe('ProgramCard', () => {
  it('shows title, step count, and a progress bar', () => {
    render(<ProgramCard status={base} />);
    expect(screen.getByText('Understanding your cycle')).toBeTruthy();
    expect(screen.getByText('1 of 2 steps')).toBeTruthy();
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByRole('link').getAttribute('href')).toBe('/programs/understanding-your-cycle');
  });

  it('shows a Complete badge when finished', () => {
    render(<ProgramCard status={{ ...base, completedCount: 2, percentComplete: 100, isComplete: true }} />);
    expect(screen.getByText('Complete')).toBeTruthy();
  });
});
