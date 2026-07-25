export const RING_COLORS: Record<string, { light: string; dark: string }> = {
  inner: { light: '#B1454F', dark: '#E0808A' }, // matches --ring-struggling
  middle: { light: '#F3701E', dark: '#F3701E' }, // matches --ember
  outer: { light: '#4E7D5E', dark: '#6AAD82' }, // matches --sage
};

export const RINGS_BASE = [
  { key: 'inner', label: 'Struggling with', field: 'struggling', r: 0.30 },
  { key: 'middle', label: 'Building', field: 'building', r: 0.50 },
  { key: 'outer', label: 'Open to', field: 'openTo', r: 0.70 },
] as const;

export type Ring = (typeof RINGS_BASE)[number] & { color: string };
