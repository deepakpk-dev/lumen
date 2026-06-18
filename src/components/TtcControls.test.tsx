import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TtcControls } from '@/src/components/TtcControls';
import { getLifeStage } from '@/src/settings/preferences';

describe('TtcControls', () => {
  beforeEach(() => localStorage.clear());

  it('enables TTC mode when toggled on', () => {
    render(<TtcControls />);
    fireEvent.click(screen.getByRole('button', { name: /turn on ttc mode/i }));
    expect(getLifeStage()).toBe('ttc');
    expect(screen.getByText(/TTC mode is/i).textContent).toMatch(/on/i);
  });
});
