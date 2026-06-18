import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { FertilityView } from '@/src/components/FertilityView';
import { db } from '@/src/data/db';
import { setLifeStage } from '@/src/settings/preferences';

describe('FertilityView', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.cycles.clear();
    await db.dailyLogs.clear();
    setLifeStage('ttc', '2026-06-01');
    await db.cycles.put({ id: 'c1', startDate: '2026-06-01' });
  });

  it('renders the fertility heading and disclaimer', async () => {
    render(<FertilityView />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /Fertility/i })).toBeTruthy()
    );
    expect(screen.getAllByText(/not a contraceptive/i).length).toBeGreaterThan(0);
  });
});
