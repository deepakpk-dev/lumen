// src/components/ArticleReader.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleReader } from './ArticleReader';
import type { ContentArticle } from '@/src/domain/content/types';

const article: ContentArticle = {
  slug: 'menstrual-phase',
  title: 'Your menstrual phase, explained',
  summary: 'What happens during your period.',
  body: '## What is happening\n\nYour period marks day 1 of your cycle.',
  topics: ['menstruation'],
  phases: ['menstrual'],
  symptoms: ['Cramps'],
  lifeStages: ['cycle'],
  readingMinutes: 2,
  author: 'Lumen Editorial',
  medicalReviewer: 'Aligned with NHS guidance',
  lastReviewed: '2026-06-17',
  sources: [
    { label: 'NHS — Periods', url: 'https://www.nhs.uk/conditions/periods/' },
  ],
};

describe('ArticleReader', () => {
  it('renders the title and markdown body', () => {
    render(<ArticleReader article={article} />);
    expect(
      screen.getByRole('heading', { name: /your menstrual phase, explained/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /what is happening/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/marks day 1 of your cycle/i)).toBeInTheDocument();
  });

  it('shows reviewer line, sources, and the educational disclaimer', () => {
    render(<ArticleReader article={article} />);
    expect(screen.getByText(/aligned with nhs guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/last reviewed/i)).toBeInTheDocument();
    const source = screen.getByRole('link', { name: /nhs — periods/i });
    expect(source).toHaveAttribute('href', 'https://www.nhs.uk/conditions/periods/');
    expect(screen.getByText(/not a substitute for professional medical advice/i)).toBeInTheDocument();
  });
});
