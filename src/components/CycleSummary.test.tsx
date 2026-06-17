import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleSummary } from './CycleSummary';
import { computeCycleStats } from '@/src/domain/cycle-stats';
import { generatePrediction } from '@/src/domain/prediction';
import type { Cycle } from '@/src/domain/types';

const cycles: Cycle[] = [
  { id: 'a', startDate: '2026-01-01', endDate: '2026-01-05' },
  { id: 'b', startDate: '2026-01-29', endDate: '2026-02-02' },
  { id: 'c', startDate: '2026-02-26', endDate: '2026-03-02' },
];

describe('CycleSummary', () => {
  it('shows the prediction explanation and disclaimer', () => {
    const stats = computeCycleStats(cycles);
    const prediction = generatePrediction(cycles, '2026-03-10')!;
    render(
      <CycleSummary
        prediction={prediction}
        stats={stats}
        lastPeriodStart="2026-02-26"
        today="2026-03-10"
      />,
    );
    expect(screen.getByText(/average 28 days/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('renders an empty state with no prediction', () => {
    render(
      <CycleSummary
        prediction={null}
        stats={computeCycleStats([])}
        lastPeriodStart={null}
        today="2026-03-10"
      />,
    );
    expect(screen.getByText(/log your first period/i)).toBeInTheDocument();
  });
});
