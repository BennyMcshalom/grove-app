interface IconProps {
  name: string;
  size?: number;
  stroke?: string;
  sw?: number;
}

export function Icon({ name, size = 19, stroke = 'currentColor', sw = 1.7 }: IconProps) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':    return <svg {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>;
    case 'spaces':  return <svg {...p}><path d="M12 22V12"/><path d="M12 12c0-3 1.8-5 4.5-5 0 3-1.8 5-4.5 5Z"/><path d="M12 14c0-3-1.8-5-4.5-5 0 3 1.8 5 4.5 5Z"/><path d="M8 22h8"/></svg>;
    case 'bonds':   return <svg {...p}><path d="m12 4 1.8 3.9 4.2.5-3.1 2.9.9 4.2L12 13.8 8.2 15.4l.9-4.2L6 8.4l4.2-.5L12 4Z"/></svg>;
    case 'sun':     return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case 'pin':     return <svg {...p}><path d="M12 21s-6.5-5.5-6.5-10.5A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.5C18.5 15.5 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.3"/></svg>;
    case 'archive': return <svg {...p}><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></svg>;
    case 'stats':   return <svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case 'search':  return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>;
    case 'bell':    return <svg {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>;
    case 'gear':    return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg>;
    case 'mic':     return <svg {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'dots':    return <svg {...p}><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>;
    case 'back':    return <svg {...p}><path d="M15 19 8 12l7-7"/></svg>;
    case 'arrow':   return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'plus':    return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'close':   return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case 'check':   return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
    case 'lock':    return <svg {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>;
    case 'eye':     return <svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
    case 'moon':    return <svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>;
    // Timer/hourglass — used for Deep Focus (distinct from moon = dark mode)
    case 'focus':   return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>;
    case 'sprout':  return <svg {...p}><path d="M12 21v-9"/><path d="M12 12c0-3.3 2.5-6 6-6 0 3.3-2.5 6-6 6Z"/><path d="M12 13C9 13 6 11 6 7c3 0 6 2 6 6Z"/></svg>;
    case 'comment': return <svg {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l1.9-5.3A8.5 8.5 0 1 1 21 11.5Z"/></svg>;
    case 'share':   return <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>;
    case 'play':    return <svg {...p} fill={stroke} stroke="none"><path d="M7 5v14l11-7z"/></svg>;
    case 'video':   return <svg {...p}><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m16 10 5.5-3v10L16 14"/></svg>;
    case 'phone':   return <svg {...p}><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>;
    case 'send':     return <svg {...p}><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>;
    case 'envelope': return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>;
    case 'moon-full':return <svg {...p} fill={stroke} stroke="none"><circle cx="12" cy="12" r="9"/></svg>;
    case 'dot':      return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill={stroke}/></svg>;
    case 'image':    return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m21 16-5-5L5 20"/></svg>;
    case 'book':       return <svg {...p}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 4.5v15"/><path d="M9 7h7M9 11h5"/></svg>;
    case 'heart':      return <svg {...p} fill={stroke} stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'thumbs-up':  return <svg {...p}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.3a2 2 0 0 0 2-1.7l1.4-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>;
    case 'fire':       return <svg {...p}><path d="M12 21c-4.4 0-8-3.6-8-8 0-3.6 2-5.8 3.5-7.5.8-1 1.5-1.8 1.5-3 1.5 1.5 1.5 3 1.5 3s1-2.5 3-3.5c0 2 1 3.5 2 4.5C17 8.5 20 11 20 13c0 4.4-3.6 8-8 8z"/></svg>;
    case 'suitcase':   return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
    case 'baby':       return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/><path d="M9 10.5c0 0 1 1.5 3 1.5s3-1.5 3-1.5"/></svg>;
    case 'wave':       return <svg {...p}><path d="M7.5 7.5c.83-1.17 1.83-1.5 3-1.5 1.8 0 3 1.2 3 3 0 1.35-.56 2.37-2.2 4.2C9.5 15.2 8 18 8 18M14 13c.83-1.17 1.83-1.5 3-1.5 1.8 0 3 1.2 3 3 0 2.5-2 5.5-5 5.5M4 7.5C4.83 6.33 5.83 6 7 6"/><path d="M4 11.5c0-1.2.5-2 1.5-2.5"/></svg>;
    case 'map':        return <svg {...p}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>;
    case 'strong':     return <svg {...p}><path d="M14.5 9.5 12 12l-2.5-2.5"/><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/><circle cx="12" cy="12" r="9"/></svg>;
    // Group icons
    case 'group-founders':  return <svg {...p}><path d="M12 2 9.5 8.5 3 9.3l5 4.8-1.5 6.7L12 17l5.5 3.8-1.5-6.7 5-4.8-6.5-.8L12 2z"/></svg>;
    case 'group-relocate':  return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M8 14h.01M12 14h4"/></svg>;
    case 'group-parent':    return <svg {...p}><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="5" r="2" fill={stroke} stroke="none" opacity=".4"/></svg>;
    case 'group-burnout':   return <svg {...p}><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-8-8-1 2-.5 4 1 5-3 0-5-2-5-2C6 12.5 3.5 16 5 19.5A7.97 7.97 0 0 0 12 22z"/></svg>;
    case 'group-creative':  return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="7" strokeDasharray="2 3" opacity=".4"/></svg>;
    // ── Space icons ──────────────────────────────────────────────────────────
    case 'space-career':   return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/><path d="M2 12h20"/></svg>;
    case 'space-creative': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="7" strokeDasharray="2 3" opacity=".4"/></svg>;
    case 'space-health':   return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case 'space-spiritual':return <svg {...p}><path d="M12 21.7C17.3 17 22 13 22 8.5a5.5 5.5 0 0 0-11 0 5.5 5.5 0 0 0-11 0C0 13 4.7 17 10 21.7"/><path d="M12 3v5m0 0c.9-1.4 2-2 2-2" opacity=".5"/></svg>;
    case 'space-wealth':   return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'space-adventure':return <svg {...p}><circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/></svg>;
    case 'space-learning': return <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
    case 'space-relation': return <svg {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    default: return null;
  }
}
