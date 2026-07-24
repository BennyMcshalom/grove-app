import type { AuraKey, LogStyle } from '@/lib/types';

export type LogEntry = {
  id?: string;
  day: number;
  date: string;
  text?: string;
  media?: string;
  missed?: boolean;
};

export type OtherLog = {
  name: string;
  avatarUrl?: string | null;
  aura?: AuraKey | null;
  space: string;
  phase: string;
  vis: string;
  when: string;
  style: LogStyle;
  entries: LogEntry[];
};
