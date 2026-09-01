import styles from './tagText.module.css';

// Highlight @Name mentions inside a group-chat message.
export function tagText(text: string) {
  const parts = text.split(/(@[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/g);
  return parts.map((p, i) => p.startsWith('@')
    ? <strong key={i} className={styles.mention}>{p}</strong>
    : <span key={i}>{p}</span>);
}
