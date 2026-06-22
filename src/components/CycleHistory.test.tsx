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

  it('labels each cycle with its own length, and the newest cycle as current', () => {
    const threeCycles: Cycle[] = [
      { id: 'a', startDate: '2026-01-01' }, // 28-day cycle (Jan 1 → Jan 29)
      { id: 'b', startDate: '2026-01-29' }, // 30-day cycle (Jan 29 → Feb 28)
      { id: 'c', startDate: '2026-02-28' }, // current cycle (no later start)
    ];
    render(
      <CycleHistory cycles={threeCycles} stats={computeCycleStats(threeCycles)} />,
    );

    const rowFor = (date: string) =>
      screen.getByText(date).closest('li') as HTMLElement;

    expect(rowFor('2026-02-28')).toHaveTextContent('Current cycle');
    expect(rowFor('2026-01-29')).toHaveTextContent('30 day cycle');
    expect(rowFor('2026-01-01')).toHaveTextContent('28 day cycle');
  });
});
