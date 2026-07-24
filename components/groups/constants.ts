export const CATEGORIES: { emoji: string; icon: string; label: string }[] = [
  { emoji: '🌱', icon: 'group-founders', label: 'Building something new' },
  { emoji: '🧳', icon: 'group-relocate', label: 'Relocating / starting over' },
  { emoji: '👼', icon: 'group-parent',   label: 'Early parenthood' },
  { emoji: '🥀', icon: 'group-burnout',  label: 'Burned out, searching' },
  { emoji: '🎨', icon: 'group-creative', label: 'Going pro with a craft' },
];
export const COLORS = ['var(--c-career)', 'var(--c-adventure)', 'var(--c-relation)', 'var(--c-health)', 'var(--c-creative)', 'var(--c-spiritual)', 'var(--c-wealth)', 'var(--c-learning)'];

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chapter';
}
