import { describe, it, expect } from 'vitest';
import {
  CRISIS_RESOURCES,
  detectRegion,
  resourcesForRegion,
} from './crisis-resources';

describe('detectRegion', () => {
  it('extracts the region subtag from a BCP 47 locale', () => {
    expect(detectRegion('en-IN')).toBe('IN');
    expect(detectRegion('en-US')).toBe('US');
    expect(detectRegion('en-GB')).toBe('GB');
  });

  it('returns empty string when the locale has no region', () => {
    expect(detectRegion('en')).toBe('');
  });

  it('returns empty string for garbage input', () => {
    expect(detectRegion('')).toBe('');
    expect(detectRegion('not a locale!!')).toBe('');
  });
});

describe('resourcesForRegion', () => {
  it('returns the matching region entry', () => {
    expect(resourcesForRegion('US')?.country).toBe('United States');
    expect(resourcesForRegion('IN')?.country).toBe('India');
  });

  it('returns undefined for unlisted regions', () => {
    expect(resourcesForRegion('FR')).toBeUndefined();
    expect(resourcesForRegion('')).toBeUndefined();
  });
});

describe('CRISIS_RESOURCES data integrity', () => {
  it('every entry has a 2-letter region, a country, and at least one line with name and contact', () => {
    for (const r of CRISIS_RESOURCES) {
      expect(r.region).toMatch(/^[A-Z]{2}$/);
      expect(r.country.length).toBeGreaterThan(0);
      expect(r.lines.length).toBeGreaterThan(0);
      for (const line of r.lines) {
        expect(line.name.length).toBeGreaterThan(0);
        expect(line.contact.length).toBeGreaterThan(0);
      }
    }
  });

  it('has no duplicate regions', () => {
    const regions = CRISIS_RESOURCES.map((r) => r.region);
    expect(new Set(regions).size).toBe(regions.length);
  });
});
