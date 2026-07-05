import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleCalendar } from './CycleCalendar';

describe('CycleCalendar', () => {
  it('renders the requested month, not necessarily the current one', () => {
    render(
      <CycleCalendar cycles={[]} prediction={null} month="2026-02-10" />,
    );
    // February 2026 has 28 days; day 28 should be present, day 31 absent.
    expect(screen.getByLabelText(/^2026-02-28/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^2026-02-31/)).toBeNull();
  });

  it('marks today within the rendered month', () => {
    render(
      <CycleCalendar
        cycles={[]}
        prediction={null}
        month="2026-02-10"
        today="2026-02-10"
      />,
    );
    const cell = screen.getByLabelText(/2026-02-10, today/);
    expect(cell).toHaveAttribute('aria-current', 'date');
  });

  it('does not mark today when it falls outside the rendered month', () => {
    render(
      <CycleCalendar
        cycles={[]}
        prediction={null}
        month="2026-02-10"
        today="2026-03-10"
      />,
    );
    expect(screen.queryByLabelText(/, today/)).toBeNull();
  });

  it('links past/today cells to the log for that date, but not future cells', () => {
    render(
      <CycleCalendar
        cycles={[]}
        prediction={null}
        month="2026-02-10"
        today="2026-02-10"
      />,
    );
    // A past day is a link to its own log date.
    expect(screen.getByLabelText(/^2026-02-05/)).toHaveAttribute(
      'href',
      '/log?date=2026-02-05',
    );
    // Today is loggable too.
    expect(screen.getByLabelText(/2026-02-10, today/)).toHaveAttribute(
      'href',
      '/log?date=2026-02-10',
    );
    // A future day is not a link.
    expect(screen.getByLabelText(/^2026-02-20/)).not.toHaveAttribute('href');
  });
});
