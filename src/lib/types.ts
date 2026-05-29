export interface Space {
  id: string;
  emoji: string;
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
  space: string;
  progress: string;
  time: string;
  doing: string;
  honest: string;
  media?: { type: 'image' | 'video'; src: string; dur?: string };
  roots: number;
  comments: number;
  rooted?: boolean;
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
  emoji: string;
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
  avatar_url?: string;
}
