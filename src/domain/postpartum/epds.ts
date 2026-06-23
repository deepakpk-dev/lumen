// Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987).
// Each option carries its scored value; reverse-scored items encode 3→0 directly.

export interface EpdsOption {
  label: string;
  value: 0 | 1 | 2 | 3;
}
export interface EpdsQuestion {
  prompt: string;
  options: EpdsOption[];
}

export const EPDS_QUESTIONS: EpdsQuestion[] = [
  {
    prompt: 'I have been able to laugh and see the funny side of things',
    options: [
      { label: 'As much as I always could', value: 0 },
      { label: 'Not quite so much now', value: 1 },
      { label: 'Definitely not so much now', value: 2 },
      { label: 'Not at all', value: 3 },
    ],
  },
  {
    prompt: 'I have looked forward with enjoyment to things',
    options: [
      { label: 'As much as I ever did', value: 0 },
      { label: 'Rather less than I used to', value: 1 },
      { label: 'Definitely less than I used to', value: 2 },
      { label: 'Hardly at all', value: 3 },
    ],
  },
  {
    prompt: 'I have blamed myself unnecessarily when things went wrong',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, some of the time', value: 2 },
      { label: 'Not very often', value: 1 },
      { label: 'No, never', value: 0 },
    ],
  },
  {
    prompt: 'I have been anxious or worried for no good reason',
    options: [
      { label: 'No, not at all', value: 0 },
      { label: 'Hardly ever', value: 1 },
      { label: 'Yes, sometimes', value: 2 },
      { label: 'Yes, very often', value: 3 },
    ],
  },
  {
    prompt: 'I have felt scared or panicky for no very good reason',
    options: [
      { label: 'Yes, quite a lot', value: 3 },
      { label: 'Yes, sometimes', value: 2 },
      { label: 'No, not much', value: 1 },
      { label: 'No, not at all', value: 0 },
    ],
  },
  {
    prompt: 'Things have been getting on top of me',
    options: [
      { label: "Yes, most of the time I haven't been able to cope at all", value: 3 },
      { label: "Yes, sometimes I haven't been coping as well as usual", value: 2 },
      { label: 'No, most of the time I have coped quite well', value: 1 },
      { label: 'No, I have been coping as well as ever', value: 0 },
    ],
  },
  {
    prompt: 'I have been so unhappy that I have had difficulty sleeping',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, sometimes', value: 2 },
      { label: 'Not very often', value: 1 },
      { label: 'No, not at all', value: 0 },
    ],
  },
  {
    prompt: 'I have felt sad or miserable',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, quite often', value: 2 },
      { label: 'Not very often', value: 1 },
      { label: 'No, not at all', value: 0 },
    ],
  },
  {
    prompt: 'I have been so unhappy that I have been crying',
    options: [
      { label: 'Yes, most of the time', value: 3 },
      { label: 'Yes, quite often', value: 2 },
      { label: 'Only occasionally', value: 1 },
      { label: 'No, never', value: 0 },
    ],
  },
  {
    prompt: 'The thought of harming myself has occurred to me',
    options: [
      { label: 'Yes, quite often', value: 3 },
      { label: 'Sometimes', value: 2 },
      { label: 'Hardly ever', value: 1 },
      { label: 'Never', value: 0 },
    ],
  },
];

export const EPDS_SOURCE =
  'Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987)';

export type EpdsBand = 'low' | 'possible' | 'probable';

export interface EpdsResult {
  total: number;
  band: EpdsBand;
  riskFlag: boolean;
  bandText: string;
}

const BAND_TEXT: Record<EpdsBand, string> = {
  low: 'Your score is in the lower range. This is a screening tool, not a diagnosis — if you have any concerns about how you are feeling, please talk to your healthcare provider.',
  possible:
    'Your score suggests you may be experiencing some symptoms of postnatal depression. Please share this result with your healthcare provider.',
  probable:
    'Your score suggests you may be experiencing symptoms of postnatal depression. Please contact your healthcare provider soon to talk about how you are feeling.',
};

export function scoreEpds(responses: number[]): EpdsResult {
  if (responses.length !== 10) {
    throw new Error('EPDS requires exactly 10 responses');
  }
  for (const v of responses) {
    if (!Number.isInteger(v) || v < 0 || v > 3) {
      throw new Error('EPDS responses must be integers 0..3');
    }
  }
  const total = responses.reduce((sum, v) => sum + v, 0);
  const band: EpdsBand = total >= 13 ? 'probable' : total >= 10 ? 'possible' : 'low';
  const riskFlag = total >= 13 || responses[9] > 0;
  return { total, band, riskFlag, bandText: BAND_TEXT[band] };
}
