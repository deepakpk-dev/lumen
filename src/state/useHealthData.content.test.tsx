// src/state/useHealthData.content.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useHealthData } from './useHealthData';
import { db } from '@/src/data/db';

describe('useHealthData content', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('exposes a content feed and a daily article', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(Array.isArray(result.current.contentFeed)).toBe(true);
    expect(result.current.contentFeed.length).toBeGreaterThan(0);
    expect(result.current.dailyContent).not.toBeNull();
  });

  it('prioritises getting-started content before any data is logged', async () => {
    const { result } = renderHook(() => useHealthData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const top = result.current.contentFeed[0].article;
    expect(top.topics).toContain('getting-started');
  });
});
