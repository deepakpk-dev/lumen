import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KickCounter } from './KickCounter';

const saveKickSession = vi.fn().mockResolvedValue(undefined);
let kickSessions: unknown[] = [];
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({ saveKickSession, kickSessions }),
}));

beforeEach(() => {
  saveKickSession.mockClear();
  kickSessions = [];
});

describe('KickCounter', () => {
  it('starts a session and increments the count on each kick', () => {
    render(<KickCounter />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /record a kick/i }));
    fireEvent.click(screen.getByRole('button', { name: /record a kick/i }));
    expect(screen.getByText(/2 \/ 10/)).toBeTruthy();
  });

  it('saves the session on finish', () => {
    render(<KickCounter />);
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /record a kick/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(saveKickSession).toHaveBeenCalledTimes(1);
  });

  it('uses the singular noun for a session with one kick', () => {
    kickSessions = [
      {
        id: 'k1',
        date: '2026-06-21',
        startedAt: '2026-06-21T10:00:00.000Z',
        kickTimestamps: ['2026-06-21T10:01:00.000Z'],
        endedAt: '2026-06-21T10:02:00.000Z',
      },
    ];
    render(<KickCounter />);
    expect(screen.getByText('2026-06-21: 1 kick')).toBeTruthy();
  });
});
