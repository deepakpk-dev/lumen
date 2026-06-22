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
});
