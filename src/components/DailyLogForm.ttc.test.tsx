import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { DailyLogForm } from '@/src/components/DailyLogForm';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('DailyLogForm TTC section', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
  });

  it('hides fertility fields in cycle mode', async () => {
    render(<DailyLogForm date="2026-06-12" />);
    await waitFor(() => expect(screen.getByText('Flow')).toBeTruthy());
    expect(screen.queryByText(/Basal body temperature/i)).toBeNull();
  });

  it('shows fertility fields in TTC mode', async () => {
    setLifeStage('ttc', '2026-06-01');
    render(<DailyLogForm date="2026-06-12" />);
    await waitFor(() =>
      expect(screen.getByText(/Basal body temperature/i)).toBeTruthy(),
    );
    expect(screen.getByText(/Cervical mucus/i)).toBeTruthy();
    expect(screen.getByText(/Ovulation test/i)).toBeTruthy();
  });
});
