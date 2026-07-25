export const PLAN_FEATURES: [string, string, string][] = [
  ['spaces',  'All four Life Spaces',       'Hold up to four chapters at once'],
  ['bonds',   'Grouv Bonds',                'Up to five deep 1:1 relationships'],
  ['sun',     'Morning Room',               'Daily Curio, prompts & reflections'],
  ['pin',     'Proximity',                  'Find your chapter, right where you are'],
  ['book',    'The Grouv Log',              'Daily ritual + the Artifact at chapter close'],
  ['map',     'The Trail & Life Archive',   'Your living terrain, kept forever'],
];

export const TRIAL_END   = 'June 13, 2026';
export const REMIND_DATE = 'June 11, 2026';

export type Step = 'plan' | 'pay' | 'done';
export type Plan = 'annual' | 'monthly';

export const PRICES: Record<Plan, { amount: string; cadence: string; sub: string }> = {
  annual:  { amount: '$84', cadence: '/year',  sub: 'just $7/month, billed yearly' },
  monthly: { amount: '$10', cadence: '/month', sub: 'billed monthly' },
};
