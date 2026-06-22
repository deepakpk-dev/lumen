import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PregnancyCard } from './PregnancyCard';

describe('PregnancyCard', () => {
  it('shows the week, trimester, countdown, and size comparison', () => {
    render(
      <PregnancyCard
        gestation={{ weeks: 20, days: 3, totalDays: 143 }}
        trimester={2}
        daysToDue={137}
        week={{ week: 20, sizeComparison: 'a banana', fetalDevelopment: ['x'], maternalChanges: ['y'] }}
      />,
    );
    expect(screen.getByText(/20 weeks/i)).toBeTruthy();
    expect(screen.getByText(/trimester 2/i)).toBeTruthy();
    expect(screen.getByText(/137 days/i)).toBeTruthy();
    expect(screen.getByText(/a banana/i)).toBeTruthy();
  });
});
