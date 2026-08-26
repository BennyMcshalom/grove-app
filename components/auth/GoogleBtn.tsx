export function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-ghost btn-block"
      style={{
        borderColor: "var(--border-2)",
        color: "var(--ink-2)",
        gap: ".7rem",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6c1.9-5.6 7.2-9.8 13.7-9.8Z"
        />
        <path
          fill="#4285F4"
          d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5Z"
        />
        <path
          fill="#FBBC05"
          d="M10.3 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.8-6C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.3l7.8-6Z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.2 0 11.5-2 15.3-5.6l-7.1-5.5c-2 1.4-4.6 2.2-8.2 2.2-6.5 0-11.8-4.2-13.7-9.8l-7.8 6C6.4 42.6 14.6 48 24 48Z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
