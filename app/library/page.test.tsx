import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import LibraryPage from './page';

let mockState: Record<string, unknown>;
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => mockState,
}));

beforeEach(() => {
  mockState = { contentFeed: [], loading: false, lifeStage: 'cycle' };
});

describe('LibraryPage', () => {
  it('shows the reading library in cycle mode', () => {
    render(<LibraryPage />);
    expect(screen.getByRole('heading', { name: /library/i })).toBeTruthy();
    expect(screen.queryByText(/available in cycle mode/i)).toBeNull();
  });

  it('shows stage-appropriate reads in other life stages', () => {
    mockState = { ...mockState, lifeStage: 'pregnancy' };
    render(<LibraryPage />);
    expect(screen.getByRole('heading', { name: /library/i })).toBeTruthy();
    // The old cycle-only placeholder is gone; pregnancy reads are now browsable.
    expect(screen.queryByText(/available in cycle mode/i)).toBeNull();
    expect(screen.getAllByText(/trimester/i).length).toBeGreaterThan(0);
  });
});
