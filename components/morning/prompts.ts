// ── Reflection prompts — rotate daily, deterministic ─────────────
export const PROMPTS = [
  'What would today look like if you trusted yourself more?',
  'What are you pretending not to know?',
  'Where are you waiting for permission?',
  'What small thing did you do today that no one saw?',
  'What would you do if you weren\'t performing for anyone?',
  'What feeling have you been avoiding naming?',
  'What did yesterday cost you that wasn\'t worth it?',
  'If today had a theme, what would it be?',
  'Who showed up for you recently, and have you told them?',
  'What would your most honest self say about this week?',
  'What are you carrying that isn\'t yours to carry?',
  'What do you keep almost saying?',
  'Where in your life are you still playing small?',
  'What would you regret not starting today?',
];

export const WEEKLY_QUESTIONS = [
  'When did you last feel genuinely proud of yourself, and did you let it land?',
  'What is the honest story underneath the story you\'ve been telling?',
  'What chapter of your life is quietly ending right now?',
  'Who have you been, and who are you becoming?',
  'What is one thing you keep choosing that doesn\'t actually serve you?',
  'What would you do this week if outcome didn\'t matter?',
  'What part of yourself have you been neglecting?',
];

/** Deterministic index based on day-of-year — same question all day, changes daily */
export function dailyIdx(arr: unknown[]) {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day   = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return day % arr.length;
}

/** ISO week number for weekly question rotation */
export function isoWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function fmtDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
