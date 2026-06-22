import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PregnancyView } from './PregnancyView';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const base = {
  loading: false,
  isPregnant: true,
  gestation: { weeks: 20, days: 0, totalDays: 140 },
  currentTrimester: 2 as const,
  daysToDue: 140,
  weekContentToday: {
    week: 20,
    sizeComparison: 'a banana',
    fetalDevelopment: ['Baby is swallowing.'],
    maternalChanges: ['Halfway there.'],
  },
};
let mockState = { ...base };
vi.mock('@/src/state/useHealthData', () => ({ useHealthData: () => mockState }));

beforeEach(() => {
  replace.mockReset();
  mockState = { ...base };
});

describe('PregnancyView', () => {
  it('renders weekly development and maternal content', () => {
    render(<PregnancyView />);
    expect(screen.getByText(/Baby is swallowing/i)).toBeTruthy();
    expect(screen.getByText(/Halfway there/i)).toBeTruthy();
    expect(screen.getByText(/Kick counter/i)).toBeTruthy();
    expect(screen.getByText(/Contraction timer/i)).toBeTruthy();
  });

  it('redirects home when not pregnant', () => {
    mockState = { ...base, isPregnant: false };
    render(<PregnancyView />);
    expect(replace).toHaveBeenCalledWith('/');
  });
});
