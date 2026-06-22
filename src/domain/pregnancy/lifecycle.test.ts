import { describe, it, expect } from 'vitest';
import {
  startPregnancy,
  editDueDate,
  endByBirth,
  endByLoss,
} from './lifecycle';
import type { PregnancyProfile } from '@/src/domain/types';

describe('startPregnancy', () => {
  it('derives the due date from an LMP', () => {
    const p = startPregnancy({ today: '2026-01-10', lmp: '2026-01-01' });
    expect(p.id).toBe('current');
    expect(p.lmp).toBe('2026-01-01');
    expect(p.dueDate).toBe('2026-10-08');
    expect(p.dueDateSource).toBe('lmp');
    expect(p.startedAt).toBe('2026-01-10');
    expect(p.status).toBe('active');
  });

  it('derives the LMP from a manual due date', () => {
    const p = startPregnancy({ today: '2026-01-10', dueDate: '2026-10-08' });
    expect(p.lmp).toBe('2026-01-01');
    expect(p.dueDateSource).toBe('manual');
  });

  it('honors an explicit source (cycle import) and cycle-length adjustment', () => {
    const p = startPregnancy({
      today: '2026-01-10',
      lmp: '2026-01-01',
      averageCycleLength: 31,
      source: 'cycle',
    });
    expect(p.dueDate).toBe('2026-10-11');
    expect(p.dueDateSource).toBe('cycle');
  });
});

const active: PregnancyProfile = {
  id: 'current',
  dueDate: '2026-10-08',
  lmp: '2026-01-01',
  dueDateSource: 'lmp',
  startedAt: '2026-01-10',
  status: 'active',
};

describe('editDueDate', () => {
  it('updates due date, source, and recomputed LMP', () => {
    const p = editDueDate(active, '2026-10-15', 'manual');
    expect(p.dueDate).toBe('2026-10-15');
    expect(p.dueDateSource).toBe('manual');
    expect(p.lmp).toBe('2026-01-08');
    expect(p.status).toBe('active');
  });
});

describe('end transitions', () => {
  it('ends by birth', () => {
    const p = endByBirth(active, '2026-10-05');
    expect(p.status).toBe('ended');
    expect(p.endReason).toBe('birth');
    expect(p.endDate).toBe('2026-10-05');
  });

  it('ends by loss', () => {
    const p = endByLoss(active, '2026-04-02');
    expect(p.status).toBe('ended');
    expect(p.endReason).toBe('loss');
    expect(p.endDate).toBe('2026-04-02');
  });
});
