import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostpartumControls } from './PostpartumControls';

const endPostpartumMode = vi.fn();
const setPostpartumBreastfeeding = vi.fn();
const updateBirthDate = vi.fn();

vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    isPostpartum: true,
    postpartumProfile: { id: 'current', birthDate: '2026-06-01', startedAt: '2026-06-01', status: 'active', breastfeeding: false },
    epdsEntries: [{ id: 'a', date: '2026-06-10', responses: Array(10).fill(1), total: 10, band: 'possible' }],
    setPostpartumBreastfeeding, updateBirthDate, endPostpartumMode,
  }),
}));

beforeEach(() => { endPostpartumMode.mockReset(); });

describe('PostpartumControls', () => {
  it('lists EPDS history', () => {
    render(<PostpartumControls />);
    expect(screen.getByText(/10 \/ 30/)).toBeInTheDocument();
  });
  it('ends postpartum mode returning to cycle', () => {
    render(<PostpartumControls />);
    fireEvent.click(screen.getByRole('button', { name: /end postpartum/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to cycle tracking/i }));
    expect(endPostpartumMode).toHaveBeenCalledWith('cycle');
  });
});
