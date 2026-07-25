export function Pagination({ page, pageCount, onPrev, onNext }: {
  page: number; pageCount: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <button className="btn btn-soft" disabled={page === 0} onClick={onPrev}
        style={{ opacity: page === 0 ? .4 : 1, fontSize: '.82rem' }}>
        ← Prev
      </button>
      <span style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>Page {page + 1} of {pageCount}</span>
      <button className="btn btn-soft" disabled={page >= pageCount - 1} onClick={onNext}
        style={{ opacity: page >= pageCount - 1 ? .4 : 1, fontSize: '.82rem' }}>
        Next →
      </button>
    </div>
  );
}
