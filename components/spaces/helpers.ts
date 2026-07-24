export const ANSWER_COLORS = ['var(--sage)', 'var(--slate)', 'var(--ember)', 'var(--c-spiritual)', 'var(--c-wealth)'];

export function daysLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}
