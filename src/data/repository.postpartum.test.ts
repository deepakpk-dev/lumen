import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  savePostpartumProfile,
  getPostpartumProfile,
  deletePostpartumProfile,
  addEpdsEntry,
  getEpdsEntries,
} from './repository';
import type { PostpartumProfile, EpdsEntry } from '@/src/domain/types';

const profile: PostpartumProfile = {
  id: 'current',
  birthDate: '2026-06-01',
  startedAt: '2026-06-01',
  status: 'active',
};

beforeEach(async () => {
  await db.postpartumProfile.clear();
  await db.epdsEntries.clear();
});

describe('postpartum profile repo', () => {
  it('saves, reads, and deletes the singleton', async () => {
    await savePostpartumProfile(profile);
    expect(await getPostpartumProfile()).toMatchObject({ birthDate: '2026-06-01' });
    await deletePostpartumProfile();
    expect(await getPostpartumProfile()).toBeUndefined();
  });
});

describe('EPDS entries repo', () => {
  it('stores entries and returns them newest-first', async () => {
    const a: EpdsEntry = { id: 'a', date: '2026-06-10', responses: Array(10).fill(0), total: 0, band: 'low' };
    const b: EpdsEntry = { id: 'b', date: '2026-06-20', responses: Array(10).fill(1), total: 10, band: 'possible' };
    await addEpdsEntry(a);
    await addEpdsEntry(b);
    expect((await getEpdsEntries()).map((e) => e.id)).toEqual(['b', 'a']);
  });
});
