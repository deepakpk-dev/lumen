import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyContentCard } from './DailyContentCard';
import type { ContentArticle } from '@/src/domain/content/types';

const article: ContentArticle = {
  slug: 'menstrual-phase',
  title: 'Your menstrual phase, explained',
  summary: 'What happens during your period.',
  body: 'x',
  topics: ['menstruation'],
  phases: ['menstrual'],
  symptoms: [],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [{ label: 'NHS', url: 'https://www.nhs.uk/' }],
};

describe('DailyContentCard', () => {
  it('renders the labelled daily read', () => {
    render(<DailyContentCard article={article} />);
    expect(screen.getByText(/today.s read/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /your menstrual phase, explained/i }),
    ).toBeInTheDocument();
  });

  it('renders nothing when there is no article', () => {
    const { container } = render(<DailyContentCard article={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
