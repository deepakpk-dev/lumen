import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightsList } from './InsightsList';
import type { Insight } from '@/src/domain/insights/types';

const make = (id: string, title: string): Insight => ({
  id,
  category: 'trend',
  severity: 'info',
  priority: 50,
  title,
  body: 'body',
});

describe('InsightsList', () => {
  it('renders a card per insight', () => {
    render(
      <InsightsList
        insights={[make('a', 'First insight'), make('b', 'Second insight')]}
      />,
    );
    expect(screen.getByText('First insight')).toBeInTheDocument();
    expect(screen.getByText('Second insight')).toBeInTheDocument();
  });

  it('shows the empty state when there are no insights', () => {
    render(<InsightsList insights={[]} />);
    expect(screen.getByText(/keep logging to unlock insights/i)).toBeInTheDocument();
  });
});
