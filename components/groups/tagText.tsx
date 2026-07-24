// Highlight @Name mentions inside a group-chat message.
export function tagText(text: string) {
  const parts = text.split(/(@[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/g);
  return parts.map((p, i) => p.startsWith('@')
    ? <strong key={i} style={{ color: 'var(--ember)', fontWeight: 600, background: 'var(--ember-dim)', padding: '0 .3rem', borderRadius: 6 }}>{p}</strong>
    : <span key={i}>{p}</span>);
}
