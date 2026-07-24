// ── Subscription label helpers ─────────────────────────────────────
export function subLabel(status: string): string {
  const map: Record<string, string> = {
    active:   'Active', trialing: 'Trial', past_due: 'Payment overdue',
    canceled: 'Canceled', incomplete: 'Incomplete', none: 'No active plan',
  };
  return map[status] ?? status;
}

export function subColor(status: string): string {
  if (status === 'active' || status === 'trialing') return 'var(--green)';
  if (status === 'past_due') return 'var(--amber)';
  return 'var(--ink-3)';
}
