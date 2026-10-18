import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * The legal documents: Terms of Use, Privacy Policy, and the Refund and
 * Cancellation Policy. Text comes from the client's documents (published
 * 15 October 2026). No Figma frame; built from the app's type and colours.
 */

const DOCS = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refunds & Cancellation" },
] as const;

export const PUBLISHED = "15 October 2026";

export function LegalPage({
  current,
  title,
  intro,
  sections,
  children,
}: {
  current: (typeof DOCS)[number]["href"];
  title: string;
  intro: ReactNode;
  /** Headings for the "On this page" list; each matches a <Section id>. */
  sections: { id: string; title: string }[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ivory-100">
      <header className="border-b border-ivory-300 bg-surface">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Grouv home">
            <Logo className="h-10" priority />
          </Link>
          <Link href="/sign-in" className="font-sans text-sm font-semibold text-primary-500 hover:underline">
            Open Grouv
          </Link>
        </div>
        <nav aria-label="Legal documents" className="mx-auto flex max-w-[1080px] gap-1 overflow-x-auto overflow-y-hidden scrollbar-none px-3 sm:px-6">
          {DOCS.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              aria-current={doc.href === current ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-3 font-sans text-sm font-semibold ${
                doc.href === current ? "border-primary-500 text-ink-700" : "border-transparent text-ink-300 hover:text-ink-500"
              }`}
            >
              {doc.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-[1080px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_240px] lg:py-14">
        <article className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-semibold text-ink-700 sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-3 font-sans text-sm text-ink-300">First published: {PUBLISHED}</p>
          <div className="mt-8 flex flex-col gap-4 font-sans text-base leading-relaxed text-ink-500">{intro}</div>
          <div className="mt-10 flex flex-col gap-10">{children}</div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-8 flex flex-col gap-2">
            <p className="font-sans text-xs font-semibold tracking-wider text-ink-300 uppercase">On this page</p>
            <ul className="flex flex-col gap-1.5 border-l border-ivory-300 pl-4">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="font-sans text-sm text-ink-400 hover:text-primary-500">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      <footer className="border-t border-ivory-300 bg-surface">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-5 py-8 font-sans text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © 2026 Grouv · Lagos, Nigeria · <Mail to="support@grouv.app" /> · <Mail to="info@grouv.app" />
          </p>
          <div className="flex gap-4">
            {DOCS.filter((d) => d.href !== current).map((doc) => (
              <Link key={doc.href} href={doc.href} className="hover:text-primary-500 hover:underline">
                {doc.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-4">
      <h2 id={`${id}-title`} className="font-display text-xl font-semibold text-ink-700 sm:text-2xl">
        {title}
      </h2>
      <div className="flex flex-col gap-4 font-sans text-base leading-relaxed text-ink-500">{children}</div>
    </section>
  );
}

/** A lead-in label inside a paragraph, e.g. "Account and profile." */
export function Lead({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink-700">{children} </strong>;
}

export function Mail({ to }: { to: string }) {
  return (
    <a href={`mailto:${to}`} className="font-semibold text-primary-500 hover:underline">
      {to}
    </a>
  );
}

export function ContactList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-2xl bg-surface p-5 sm:grid-cols-[auto_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-semibold text-ink-700">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
