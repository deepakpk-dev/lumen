import type { ReactNode } from 'react';

const paths = {
  flower: <><path d="M12 9C5 1 2 6 7 10c-8-1-7 6 0 4-5 6 1 9 4 2 1 8 8 6 4 0 7 4 10-3 2-4 7-4 2-9-3-3 3-8-4-10-2 0Z" /><circle cx="12" cy="12" r="2.3" /></>,
  home: <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18" /></>,
  add: <path d="M12 5v14M5 12h14" />,
  insights: <path d="M4 20v-8m5 8V4m6 16V9m5 11V2" />,
  book: <path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16" />,
  arrow: <path d="M4 12h15m-5-5 5 5-5 5" />,
  back: <path d="M20 12H5m5-5-5 5 5 5" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  left: <path d="m15 5-7 7 7 7" />,
  check: <path d="m5 12 4 4L20 5" />,
  heart: <path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C-1 11 12 20 12 20S25 11 20 5Z" />,
  leaf: <path d="M19 3C7 2 2 8 5 15s15 5 14-12ZM5 19 17 6" />,
  spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 8-3 8-3 10h18c0-2-3-2-3-10ZM10 21h4" />,
  user: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  wave: <path d="M2 8q5-6 10 0t10 0M2 16q5-6 10 0t10 0" />,
  drop: <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13Z" />,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14q4 5 8 0M8 9h.01M16 9h.01" /></>,
  activity: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  search: <><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="16" cy="17" r="3" /></>,
} satisfies Record<string, ReactNode>;

export type LumenIconName = keyof typeof paths;

export function LumenIcon({ name, size = 20 }: { name: LumenIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
