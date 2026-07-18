export type Region = 'africa' | 'europe' | 'americas' | 'asia' | 'oceania';

export const REGIONS: { key: Region; label: string; emoji: string }[] = [
  { key: 'africa',   label: 'Africa',   emoji: '🌍' },
  { key: 'europe',   label: 'Europe',   emoji: '🌍' },
  { key: 'americas', label: 'Americas', emoji: '🌎' },
  { key: 'asia',     label: 'Asia',     emoji: '🌏' },
  { key: 'oceania',  label: 'Oceania',  emoji: '🌏' },
];
