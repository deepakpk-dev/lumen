export interface PostpartumWeekContent {
  week: number;
  focus: string;
  notes: string[];
}

// Mother-focused recovery content. Source-attributed at the dataset level
// (consistent with the content library and pregnancy weeks).
export const POSTPARTUM_SOURCES: string[] = [
  'NHS - Your body after the birth',
  'ACOG - Postpartum care and recovery',
  'Office on Women\'s Health - Recovering from birth',
];

export const POSTPARTUM_WEEKS: PostpartumWeekContent[] = [
  {
    week: 1,
    focus: 'The first days',
    notes: [
      'Bleeding (lochia) is usually heaviest now and may include small clots.',
      'Afterpains - cramping as the uterus shrinks - are common, often while feeding.',
      'Rest whenever you can and accept help with everything else.',
    ],
  },
  {
    week: 2,
    focus: 'Early healing',
    notes: [
      'Lochia usually lightens and changes from red toward pink or brown.',
      'Perineal or C-section soreness is normal; keep the area clean as advised.',
      'Stay on top of any pain relief your provider recommended.',
    ],
  },
  {
    week: 3,
    focus: 'Settling in',
    notes: [
      'Bleeding continues to taper for most.',
      'Night sweats are common as pregnancy hormones fall.',
      'Gentle movement is fine - avoid pushing yourself.',
    ],
  },
  {
    week: 4,
    focus: 'One month',
    notes: [
      'Lochia has stopped for some by now; everyone is different.',
      'Emotional ups and downs are normal - persistent low mood is worth a check.',
      'Consider taking the mood check-in if you have not yet.',
    ],
  },
  {
    week: 5,
    focus: 'Building strength',
    notes: [
      'Gentle pelvic floor exercises can support recovery.',
      'Fatigue is expected; broken sleep adds up.',
      'Keep accepting help with chores and feeding.',
    ],
  },
  {
    week: 6,
    focus: 'Postnatal check',
    notes: [
      'Many providers offer a check around now - a good time to discuss recovery, mood, and contraception.',
      'Only return to exercise once your provider has cleared you.',
      'Bleeding should be near or fully finished for most.',
    ],
  },
  {
    week: 7,
    focus: 'Finding a rhythm',
    notes: [
      'Sleep is still broken for most - short rests count.',
      'Keep an eye on your mood and reach out if things feel heavy.',
      'There is no prize for doing it all alone.',
    ],
  },
  {
    week: 8,
    focus: 'Two months',
    notes: [
      'Energy may slowly start to improve.',
      'Pelvic floor and gentle core work can continue.',
      'Tell your provider if bleeding has returned or never stopped.',
    ],
  },
  {
    week: 9,
    focus: 'Adjusting',
    notes: [
      'Hair shedding can begin around now and is normal and temporary.',
      'Keep hydrated, especially if breastfeeding.',
      'Be patient with your body - recovery is not linear.',
    ],
  },
  {
    week: 10,
    focus: 'Steadier days',
    notes: [
      'Many people feel more like themselves around now.',
      'Persistent low mood, anxiety, or intrusive thoughts deserve professional support.',
      'Asking for help is a strength, not a failure.',
    ],
  },
  {
    week: 11,
    focus: 'Looking after you',
    notes: [
      'Make space for your own rest, food, and support.',
      'Recovery is not only physical - your mental health matters just as much.',
      'Reconnect with people and activities that restore you.',
    ],
  },
  {
    week: 12,
    focus: 'Three months and beyond',
    notes: [
      'Recovery continues well past now for many people.',
      'Your cycle may or may not have returned - breastfeeding can delay it, and there is no set timeline.',
      'Check in with your provider with any concerns, whenever they come up.',
    ],
  },
];

const MIN_WEEK = POSTPARTUM_WEEKS[0].week; // 1
const MAX_WEEK = POSTPARTUM_WEEKS[POSTPARTUM_WEEKS.length - 1].week; // 12

export function postpartumWeekContent(week: number): PostpartumWeekContent {
  const clamped = Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.round(week)));
  return POSTPARTUM_WEEKS[clamped - MIN_WEEK];
}
