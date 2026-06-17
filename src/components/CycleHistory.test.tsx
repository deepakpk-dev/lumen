import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleHistory } from './CycleHistory';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01', endDate: '2026-01-05' },
  { id: 'b', startDate: '2026-01-29', endDate: '2026-02-02' },
];

describe('CycleHistory', () => {
  it('shows average cycle length', () => {
    render(<CycleHistory cycles={cycles} stats={computeCycleStats(cycles)} />);
    expect(screen.getByText(/28 days/i)).toBeInTheDocument();
  });

  it('shows an empty state without data', () => {
    render(<CycleHistory cycles={[]} stats={computeCycleStats([])} />);
    expect(screen.getByText(/no cycles logged yet/i)).toBeInTheDocument();
  });
});
