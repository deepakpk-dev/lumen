import type { Trimester } from './gestation';

export interface WeekContent {
  week: number;
  sizeComparison: string;
  fetalDevelopment: string[];
  maternalChanges: string[];
}

// Source-attributed at the trimester level (consistent with the content library).
export const WEEK_SOURCES: Record<Trimester, string[]> = {
  1: ['NHS — Week-by-week guide to pregnancy', 'ACOG — How your fetus grows during pregnancy'],
  2: ['NHS — Week-by-week guide to pregnancy', 'ACOG — How your fetus grows during pregnancy'],
  3: ['NHS — Week-by-week guide to pregnancy', 'ACOG — How your fetus grows during pregnancy'],
};

export const PREGNANCY_WEEKS: WeekContent[] = [
  {
    week: 4,
    sizeComparison: 'a poppy seed',
    fetalDevelopment: ['The embryo implants in the uterine lining.', 'The amniotic sac and placenta begin forming.'],
    maternalChanges: ['A missed period may be your first sign.'],
  },
  {
    week: 5,
    sizeComparison: 'a sesame seed',
    fetalDevelopment: ['The neural tube (brain and spinal cord) starts to form.', 'The heart begins to develop.'],
    maternalChanges: ['Early pregnancy hormones may bring fatigue.'],
  },
  {
    week: 6,
    sizeComparison: 'a lentil',
    fetalDevelopment: ['The heart starts to beat.', 'Tiny buds that become arms and legs appear.'],
    maternalChanges: ['Nausea ("morning sickness") may begin.'],
  },
  {
    week: 7,
    sizeComparison: 'a blueberry',
    fetalDevelopment: ['The brain grows rapidly.', 'Hands and feet begin as paddle-like shapes.'],
    maternalChanges: ['You may need to urinate more often.'],
  },
  {
    week: 8,
    sizeComparison: 'a kidney bean',
    fetalDevelopment: ['Fingers and toes start to form.', 'All major organs have begun developing.'],
    maternalChanges: ['Breasts may feel tender and fuller.'],
  },
  {
    week: 9,
    sizeComparison: 'a grape',
    fetalDevelopment: ['Essential organs continue to grow.', 'Tiny muscles allow first movements (not yet felt).'],
    maternalChanges: ['Mood changes are common as hormones shift.'],
  },
  {
    week: 10,
    sizeComparison: 'a strawberry',
    fetalDevelopment: ['Vital organs are formed and starting to function.', 'Nails begin to develop.'],
    maternalChanges: ['Your waistband may start to feel snug.'],
  },
  {
    week: 11,
    sizeComparison: 'a fig',
    fetalDevelopment: ['The head is about half the body length.', 'Tooth buds and tiny bones appear.'],
    maternalChanges: ['Nausea often begins to ease for some.'],
  },
  {
    week: 12,
    sizeComparison: 'a lime',
    fetalDevelopment: ['Reflexes develop; fingers can open and close.', 'Kidneys begin producing urine.'],
    maternalChanges: ['The uterus rises above the pelvis.'],
  },
  {
    week: 13,
    sizeComparison: 'a pea pod',
    fetalDevelopment: ['Vocal cords begin to form.', 'Fingerprints are forming on tiny fingers.'],
    maternalChanges: ['First-trimester symptoms often start to settle.'],
  },
  {
    week: 14,
    sizeComparison: 'a lemon',
    fetalDevelopment: ['Facial muscles develop; the baby can squint and frown.', 'The liver and spleen begin working.'],
    maternalChanges: ['You may feel more energetic in the second trimester.'],
  },
  {
    week: 15,
    sizeComparison: 'an apple',
    fetalDevelopment: ['Bones are forming and becoming firmer.', 'The baby can sense light through closed eyelids.'],
    maternalChanges: ['You might notice a little more appetite.'],
  },
  {
    week: 16,
    sizeComparison: 'an avocado',
    fetalDevelopment: ['Eyes can make small movements.', 'The heart pumps a notable amount of blood each day.'],
    maternalChanges: ['Some people feel the first flutters of movement.'],
  },
  {
    week: 17,
    sizeComparison: 'a pear',
    fetalDevelopment: ['A protective coating (vernix) begins covering the skin.', 'Body fat starts to develop.'],
    maternalChanges: ['Your center of gravity is starting to shift.'],
  },
  {
    week: 18,
    sizeComparison: 'a bell pepper',
    fetalDevelopment: ['Ears are in position and the baby may hear sounds.', 'Nerves are forming protective coverings.'],
    maternalChanges: ['Backache may begin as your bump grows.'],
  },
  {
    week: 19,
    sizeComparison: 'a mango',
    fetalDevelopment: ['A waxy coating protects developing skin.', 'Sensory areas of the brain develop.'],
    maternalChanges: ['Round ligament pain (side aches) can appear.'],
  },
  {
    week: 20,
    sizeComparison: 'a banana',
    fetalDevelopment: ['The baby is swallowing and producing meconium.', 'You are about halfway through.'],
    maternalChanges: ['The anatomy scan is usually around now.'],
  },
  {
    week: 21,
    sizeComparison: 'a carrot',
    fetalDevelopment: ['Movements grow stronger and more coordinated.', 'Taste buds are forming.'],
    maternalChanges: ['Movements ("quickening") become clearer.'],
  },
  {
    week: 22,
    sizeComparison: 'a papaya',
    fetalDevelopment: ['Eyebrows and lips are more distinct.', 'The inner ear helps with balance.'],
    maternalChanges: ['You may notice stretch marks appearing.'],
  },
  {
    week: 23,
    sizeComparison: 'a grapefruit',
    fetalDevelopment: ['Lungs develop blood vessels in preparation for breathing.', 'The baby responds to sounds.'],
    maternalChanges: ['Swelling in feet and ankles can begin.'],
  },
  {
    week: 24,
    sizeComparison: 'an ear of corn',
    fetalDevelopment: ['The lungs develop branches and surfactant cells.', 'The skin is still thin and translucent.'],
    maternalChanges: ['Glucose screening is usually offered soon.'],
  },
  {
    week: 25,
    sizeComparison: 'a cauliflower',
    fetalDevelopment: ['The baby is gaining fat and looking fuller.', 'Hands are more dexterous.'],
    maternalChanges: ['Hair may feel thicker; energy varies.'],
  },
  {
    week: 26,
    sizeComparison: 'a head of lettuce',
    fetalDevelopment: ['Eyes begin to open.', 'Lungs practice breathing movements.'],
    maternalChanges: ['Braxton Hicks (practice contractions) may start.'],
  },
  {
    week: 27,
    sizeComparison: 'a rutabaga',
    fetalDevelopment: ['Brain activity becomes more complex.', 'The baby may hiccup — you might feel it.'],
    maternalChanges: ['This is the end of the second trimester.'],
  },
  {
    week: 28,
    sizeComparison: 'an eggplant',
    fetalDevelopment: ['Eyes can open and close and sense light.', 'Rapid brain development continues.'],
    maternalChanges: ['Third-trimester appointments become more frequent.'],
  },
  {
    week: 29,
    sizeComparison: 'a butternut squash',
    fetalDevelopment: ['Muscles and lungs keep maturing.', 'Bones are fully developed but still soft.'],
    maternalChanges: ['Shortness of breath can occur as the uterus rises.'],
  },
  {
    week: 30,
    sizeComparison: 'a cabbage',
    fetalDevelopment: ['The brain develops grooves and folds.', 'Bone marrow takes over red blood cell production.'],
    maternalChanges: ['Trouble sleeping and heartburn are common.'],
  },
  {
    week: 31,
    sizeComparison: 'a coconut',
    fetalDevelopment: ['The baby can process information and track light.', 'Rapid weight gain continues.'],
    maternalChanges: ['Braxton Hicks may become more noticeable.'],
  },
  {
    week: 32,
    sizeComparison: 'a squash',
    fetalDevelopment: ['Toenails and fingernails have formed.', 'The baby often settles head-down.'],
    maternalChanges: ['You may feel more pelvic pressure.'],
  },
  {
    week: 33,
    sizeComparison: 'a pineapple',
    fetalDevelopment: ['The immune system is developing.', 'Skull bones stay soft and movable for birth.'],
    maternalChanges: ['Swelling and fatigue may increase.'],
  },
  {
    week: 34,
    sizeComparison: 'a cantaloupe',
    fetalDevelopment: ['Lungs are nearly mature.', 'The protective vernix thickens.'],
    maternalChanges: ['You may feel the baby "drop" lower.'],
  },
  {
    week: 35,
    sizeComparison: 'a honeydew melon',
    fetalDevelopment: ['Most growth now is weight gain.', 'Kidneys are fully developed.'],
    maternalChanges: ['Frequent urination may return as baby drops.'],
  },
  {
    week: 36,
    sizeComparison: 'a romaine lettuce',
    fetalDevelopment: ['The baby is gaining about an ounce a day.', 'Fine body hair (lanugo) is shedding.'],
    maternalChanges: ['Weekly check-ups typically begin.'],
  },
  {
    week: 37,
    sizeComparison: 'a bunch of Swiss chard',
    fetalDevelopment: ['The baby is considered early term.', 'Practice breathing and sucking continue.'],
    maternalChanges: ['Watch for signs of labor; ask your provider what to track.'],
  },
  {
    week: 38,
    sizeComparison: 'a leek',
    fetalDevelopment: ['Organs are ready to function on their own.', 'A firm grasp reflex is present.'],
    maternalChanges: ['Nesting urges and Braxton Hicks may intensify.'],
  },
  {
    week: 39,
    sizeComparison: 'a small watermelon',
    fetalDevelopment: ['The baby is full term.', 'The brain and lungs keep maturing until birth.'],
    maternalChanges: ['Stay in touch with your provider about labor signs.'],
  },
  {
    week: 40,
    sizeComparison: 'a pumpkin',
    fetalDevelopment: ['The baby is ready to be born.', 'Most babies arrive within a week or two of the due date.'],
    maternalChanges: ['If you pass your due date, your provider will discuss next steps.'],
  },
];

const MIN_WEEK = PREGNANCY_WEEKS[0].week; // 4
const MAX_WEEK = PREGNANCY_WEEKS[PREGNANCY_WEEKS.length - 1].week; // 40

export function weekContent(week: number): WeekContent {
  const clamped = Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.round(week)));
  // PREGNANCY_WEEKS is contiguous from MIN_WEEK, so index is deterministic.
  return PREGNANCY_WEEKS[clamped - MIN_WEEK];
}
