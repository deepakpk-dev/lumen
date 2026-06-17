import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentCard } from './ContentCard';
import type { ContentArticle } from '@/src/domain/content/types';

const article: ContentArticle = {
  slug: 'period-cramps',
  title: 'Managing period cramps',
  summary: 'Why cramps happen and how to ease them.',
  body: 'x',
  topics: ['symptoms'],
  phases: ['menstrual'],
  symptoms: ['Cramps'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [{ label: 'NHS', url: 'https://www.nhs.uk/' }],
};

describe('ContentCard', () => {
  it('renders the title, summary, and reading time as a link', () => {
    render(<ContentCard article={article} />);
    const link = screen.getByRole('link', { name: /managing period cramps/i });
    expect(link).toHaveAttribute('href', '/library/period-cramps');
    expect(screen.getByText(/why cramps happen/i)).toBeInTheDocument();
    expect(screen.getByText(/2 min read/i)).toBeInTheDocument();
  });

  it('shows a match reason when provided', () => {
    render(<ContentCard article={article} reason="Matches what you logged: Cramps" />);
    expect(
      screen.getByText(/matches what you logged: cramps/i),
    ).toBeInTheDocument();
  });
});
