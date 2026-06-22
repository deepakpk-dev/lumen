import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyLogForm } from './DailyLogForm';

let isPregnant = false;
const saveLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/src/state/useHealthData', () => ({
  useHealthData: () => ({
    isPregnant,
    saveLog,
    dailyLogs: [],
    lifeStage: isPregnant ? 'pregnancy' : 'cycle',
    bbtUnit: 'C',
  }),
}));

beforeEach(() => {
  isPregnant = false;
});

describe('DailyLogForm pregnancy symptoms', () => {
  it('does not show pregnancy symptoms in cycle mode', () => {
    render(<DailyLogForm date="2026-06-21" />);
    expect(screen.queryByText('Braxton Hicks')).toBeNull();
  });

  it('shows pregnancy symptoms in pregnancy mode', () => {
    isPregnant = true;
    render(<DailyLogForm date="2026-06-21" />);
    expect(screen.getByText('Braxton Hicks')).toBeTruthy();
  });
});
