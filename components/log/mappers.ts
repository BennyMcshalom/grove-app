import type { LogEntry as ApiLogEntry } from '@/lib/api';
import type { LogEntry } from './types';

// ── Map API entries to the local LogEntry shape ───────────────────
export function apiToLocal(r: ApiLogEntry): LogEntry {
  const d = new Date(r.entryDate);
  return {
    id: r.id,
    day: r.dayNumber,
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    text: r.body,
    media: r.mediaUrl ?? undefined,
  };
}

/** Fill gaps between real entries with missed-day placeholders */
export function buildStrip(apiEntries: ApiLogEntry[]): LogEntry[] {
  if (!apiEntries.length) return [];
  const sorted = [...apiEntries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const first = new Date(sorted[0].entryDate);
  const last = new Date();
  const dateMap = new Map(sorted.map(e => [e.entryDate, e]));
  const strip: LogEntry[] = [];
  let day = 1;
  const cur = new Date(first);
  while (cur <= last) {
    const key = cur.toISOString().slice(0, 10);
    const entry = dateMap.get(key);
    if (entry) {
      strip.push(apiToLocal(entry));
    } else {
      strip.push({ day, date: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), missed: true });
    }
    day++;
    cur.setDate(cur.getDate() + 1);
  }
  return strip;
}
