// Region-aware crisis helplines for the EPDS risk block. Curated, not exhaustive:
// well-established national lines only, with a universal directory fallback.
// Privacy: region comes from the browser locale (device-local), never from
// geolocation or any network call.

export interface CrisisLine {
  name: string;
  contact: string;
  note?: string;
}

export interface RegionResources {
  region: string; // ISO 3166-1 alpha-2
  country: string;
  lines: CrisisLine[];
}

export const CRISIS_RESOURCES: RegionResources[] = [
  {
    region: 'US',
    country: 'United States',
    lines: [
      { name: 'Suicide & Crisis Lifeline', contact: 'Call or text 988', note: '24/7' },
      {
        name: 'National Maternal Mental Health Hotline',
        contact: 'Call or text 1-833-852-6262 (1-833-TLC-MAMA)',
        note: '24/7',
      },
    ],
  },
  {
    region: 'CA',
    country: 'Canada',
    lines: [{ name: 'Suicide Crisis Helpline', contact: 'Call or text 9-8-8', note: '24/7' }],
  },
  {
    region: 'GB',
    country: 'United Kingdom',
    lines: [
      { name: 'Samaritans', contact: 'Call 116 123', note: 'Free, 24/7' },
      { name: 'NHS urgent mental health support', contact: 'Call 111 and select the mental health option' },
    ],
  },
  {
    region: 'IE',
    country: 'Ireland',
    lines: [{ name: 'Samaritans', contact: 'Call 116 123', note: 'Free, 24/7' }],
  },
  {
    region: 'AU',
    country: 'Australia',
    lines: [
      { name: 'Lifeline', contact: 'Call 13 11 14', note: '24/7' },
      { name: 'PANDA (perinatal anxiety & depression)', contact: 'Call 1300 726 306', note: 'Weekdays' },
    ],
  },
  {
    region: 'NZ',
    country: 'New Zealand',
    lines: [{ name: 'Need to Talk?', contact: 'Call or text 1737', note: '24/7' }],
  },
  {
    region: 'IN',
    country: 'India',
    lines: [
      { name: 'Tele-MANAS', contact: 'Call 14416', note: '24/7, multiple languages' },
      { name: 'KIRAN helpline', contact: 'Call 1800-599-0019', note: '24/7' },
    ],
  },
];

// Directory covering regions we don't list — a plain link, no data leaves the app.
export const HELPLINE_DIRECTORY_URL = 'https://findahelpline.com';

export function resourcesForRegion(region: string): RegionResources | undefined {
  return CRISIS_RESOURCES.find((r) => r.region === region);
}

// Best-effort region from a BCP 47 locale tag (e.g. "en-IN" → "IN").
// Returns '' when the tag has no region — the UI then shows the fallback.
export function detectRegion(locale: string): string {
  try {
    return new Intl.Locale(locale).region ?? '';
  } catch {
    return '';
  }
}
