import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContractionTimer } from './ContractionTimer';

const saveContractionSession = vi.fn().mockResolvedValue(undefined);
let contractionSessions: unknown[] = [];
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ saveContractionSession, contractionSessions }),
}));

beforeEach(() => {
  saveContractionSession.mockClear();
  contractionSessions = [];
});

describe('ContractionTimer', () => {
  it('records a contraction start and stop', () => {
    render(<ContractionTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start contraction/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop contraction/i }));
    expect(screen.getByText(/1 contraction/i)).toBeTruthy();
  });

  it('saves the session on save', () => {
    render(<ContractionTimer />);
    fireEvent.click(screen.getByRole('button', { name: /start contraction/i }));
    fireEvent.click(screen.getByRole('button', { name: /stop contraction/i }));
    fireEvent.click(screen.getByRole('button', { name: /save session/i }));
    expect(saveContractionSession).toHaveBeenCalledTimes(1);
  });

  it('uses the singular noun for a session with one contraction', () => {
    contractionSessions = [
      {
        id: 's1',
        date: '2026-06-21',
        contractions: [{ start: '2026-06-21T09:00:00.000Z', end: '2026-06-21T09:01:00.000Z' }],
      },
    ];
    render(<ContractionTimer />);
    expect(screen.getByText('2026-06-21: 1 contraction')).toBeTruthy();
  });
});
