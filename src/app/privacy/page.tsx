import Link from "next/link";

/** Privacy Policy — linked from the sign-up consent line. Content pending. */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[680px] flex-col gap-6 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink-700 lg:text-4xl">
        Privacy Policy
      </h1>
      <p className="font-sans text-base text-ink-400">
        This page is a placeholder. The Privacy Policy copy has not been written yet.
      </p>
      <Link
        href="/sign-up"
        className="font-sans text-base font-semibold text-primary-500 hover:underline"
      >
        Back to sign up
      </Link>
    </main>
  );
}
