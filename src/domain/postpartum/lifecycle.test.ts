import { describe, it, expect } from 'vitest';
import { startPostpartum, setBreastfeeding, editBirthDate, endPostpartum } from './lifecycle';

describe('startPostpartum', () => {
  it('creates an active profile anchored to the birth date', () => {
    const p = startPostpartum({ birthDate: '2026-06-01', today: '2026-06-02', breastfeeding: true });
    expect(p).toMatchObject({
      id: 'current',
      birthDate: '2026-06-01',
      startedAt: '2026-06-02',
      breastfeeding: true,
      status: 'active',
    });
  });
});

describe('mutations', () => {
  const base = startPostpartum({ birthDate: '2026-06-01', today: '2026-06-02' });
  it('toggles breastfeeding', () => {
    expect(setBreastfeeding(base, true).breastfeeding).toBe(true);
  });
  it('edits the birth date', () => {
    expect(editBirthDate(base, '2026-05-30').birthDate).toBe('2026-05-30');
  });
  it('ends and records where the user returned to', () => {
    const p = endPostpartum(base, { returnTo: 'cycle', endDate: '2026-09-01' });
    expect(p.status).toBe('ended');
    expect(p.returnedTo).toBe('cycle');
    expect(p.endDate).toBe('2026-09-01');
  });
});
