import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightCard } from './InsightCard';
import type { Insight } from '@/src/domain/insights/types';

const base: Insight = {
  id: 'x',
  category: 'pattern',
  severity: 'info',
  priority: 70,
  title: 'Headache often appears in your luteal phase',
  body: 'You logged Headache 3 times.',
};

describe('InsightCard', () => {
  it('renders title and body', () => {
    render(<InsightCard insight={base} />);
    expect(screen.getByText(/headache often appears/i)).toBeInTheDocument();
    expect(screen.getByText(/logged headache 3 times/i)).toBeInTheDocument();
  });

  it('shows a disclaimer and a non-color label for attention insights', () => {
    render(
      <InsightCard
        insight={{ ...base, severity: 'attention', category: 'anomaly' }}
      />,
    );
    expect(screen.getByText(/worth noting/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('omits the disclaimer for info insights', () => {
    render(<InsightCard insight={base} />);
    expect(screen.queryByText(/not medical advice/i)).not.toBeInTheDocument();
  });
});
