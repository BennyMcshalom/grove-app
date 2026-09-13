/** A form-level error above the fields (field errors use Input's `error`). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-destructive-5 px-3.5 py-2.5 font-sans text-sm text-destructive-60"
    >
      {message}
    </p>
  );
}
