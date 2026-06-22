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
});
