// src/components/ContentLibrary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentLibrary } from './ContentLibrary';
import type { ContentArticle } from '@/src/domain/content/types';
import type { CyclePhase } from '@/src/domain/types';

function make(slug: string, title: string, topic: ContentArticle['topics'][number], phases: CyclePhase[] = []): ContentArticle {
  return {
    slug,
    title,
    summary: `${title} summary`,
    body: 'x',
    topics: [topic],
    phases,
    symptoms: [],
    lifeStages: ['cycle'],
    readingMinutes: 2,
    author: 'Lumen Editorial',
    medicalReviewer: 'Aligned with NHS guidance',
    lastReviewed: '2026-06-17',
    sources: [{ label: 'NHS', url: 'https://www.nhs.uk/' }],
  };
}

const cramps = make('period-cramps', 'Managing period cramps', 'symptoms');
const ovulation = make('ovulation-fertile-window', 'Ovulation and your fertile window', 'fertility');
const all = [cramps, ovulation];
const feed = [{ article: cramps, score: 5, matchReasons: ['Matches what you logged: Cramps'] }];

describe('ContentLibrary', () => {
  it('shows a personalized "For you" section with reasons', () => {
    render(<ContentLibrary feed={feed} all={all} />);
    expect(screen.getByText(/for you/i)).toBeInTheDocument();
    expect(screen.getByText(/matches what you logged: cramps/i)).toBeInTheDocument();
  });

  it('filters the browse list by search text', () => {
    render(<ContentLibrary feed={feed} all={all} />);
    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: 'ovulation' },
    });
    expect(screen.getByText('Ovulation and your fertile window')).toBeInTheDocument();
    // cramps still appears once in "For you"; in the browse list it is filtered out.
    expect(screen.getAllByText('Managing period cramps').length).toBe(1);
  });

  it('filters the browse list by topic', () => {
    render(<ContentLibrary feed={[]} all={all} />);
    fireEvent.change(screen.getByLabelText(/topic/i), {
      target: { value: 'fertility' },
    });
    expect(screen.getByText('Ovulation and your fertile window')).toBeInTheDocument();
    expect(screen.queryByText('Managing period cramps')).not.toBeInTheDocument();
  });

  it('filters the browse list by phase', () => {
    const lutealArticle = make('luteal-pms', 'PMS and the luteal phase', 'symptoms', ['luteal']);
    const follicularArticle = make('follicular-energy', 'Energy in follicular phase', 'wellbeing', ['follicular']);
    render(<ContentLibrary feed={[]} all={[lutealArticle, follicularArticle]} />);
    fireEvent.change(screen.getByLabelText(/phase/i), {
      target: { value: 'luteal' },
    });
    expect(screen.getByText('PMS and the luteal phase')).toBeInTheDocument();
    expect(screen.queryByText('Energy in follicular phase')).not.toBeInTheDocument();
  });
});
