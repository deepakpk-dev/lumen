import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConceptionCard } from '@/src/components/ConceptionCard';

describe('ConceptionCard', () => {
  it('renders nothing without guidance', () => {
    const { container } = render(<ConceptionCard guidance={null} confirmation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the conception level, reason, and disclaimer', () => {
    render(
      <ConceptionCard
        guidance={{ date: '2026-06-12', level: 'high', label: 'High chance to conceive', reason: 'You are in your most fertile days.' }}
        confirmation={null}
      />,
    );
    expect(screen.getByText('High chance to conceive')).toBeTruthy();
    expect(screen.getByText(/most fertile days/i)).toBeTruthy();
    expect(screen.getByText(/not a contraceptive/i)).toBeTruthy();
  });

  const guidance = {
    date: '2026-06-12',
    level: 'low' as const,
    label: 'Low chance to conceive',
    reason: 'You are outside your fertile window today.',
  };

  it('does not claim cycle history when there is none', () => {
    render(<ConceptionCard guidance={guidance} confirmation={null} hasCycleHistory={false} />);
    expect(screen.getByText(/typical 28-day cycle/i)).toBeTruthy();
    expect(screen.queryByText(/from your cycle history/i)).toBeNull();
  });

  it('attributes the estimate to cycle history once cycles have been logged', () => {
    render(<ConceptionCard guidance={guidance} confirmation={null} hasCycleHistory />);
    expect(screen.getByText(/from your cycle history/i)).toBeTruthy();
  });
});
