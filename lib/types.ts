export interface Space {
  id: string;
  emoji: string;
  icon: string;   // Icon component name e.g. 'space-career'
  name: string;
  desc: string;
  color: string;
  ink: string;
}

export interface Person {
  name: string;
  space: string;
  stage: string;
}

export interface Post {
  id: number;
  name?: string;
  anon?: boolean;
  avatarUrl?: string | null;
  userId?: string;
  space: string;
  progress: string;
  time: string;
  doing: string;
  honest: string;
  media?: { type: 'image' | 'video'; src: string; dur?: string };
  roots: number;
  comments: number;
  rooted?: boolean;
  kind?: string;
  caption?: string;
  clock?: string;
  location?: string;
}

export interface Bond {
  name: string;
  space: string;
  stage: string;
  depth: number;
  last: string;
  today: boolean;
  anniv: string;
  formed: string;
}

export interface Group {
  id: string;
  icon: string;
  name: string;
  phase: string;
  color: string;
  desc: string;
  preview: string;
}

export interface ArchiveEntry {
  space: string;
  range: string;
  months: string;
  stages: string[];
  people: string[];
  q1: string;
  q2: string;
  q3: string;
  counts: string;
  release?: string;
}

export interface Notification {
  icon: string;
  unread: boolean;
  text: string;
  time: string;
}

export type AuraKey = 'reflective' | 'open' | 'focus' | 'transition' | 'active';
export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';
export type LogStyle = 'A' | 'B' | 'C';

export interface User {
  id?: string;
  name: string;
  email?: string;
  spaces: string[];
  stageLabels?: Record<string, string>;
  proximity?: boolean;
  deepFocus?: boolean;
  tension?: string;
  sitting?: string;
  open?: string;
  location?: string;
  avatar_url?: string;
  aura?: AuraKey;
  logStyle?: LogStyle;
  onboardingCompleted?: boolean;
}
