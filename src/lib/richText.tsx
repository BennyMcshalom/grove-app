export function richText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**')
      ? <strong key={i} style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}
