import Image from "next/image";
import Link from "next/link";

/**
 * Right rail — Figma frame 94:2684. 396px column, 332px content, scrolls on
 * its own: Your Circle, Active Bonds, Chapter Groups and Suggested for you.
 */
const CIRCLE = [
  { name: "Jalen Crestwood", status: "Mid-project", src: "/images/people/jalen.png" },
  { name: "Mira Langston", status: "Building a business", src: "/images/people/mira.png" },
  { name: "Evan Thorne", status: "Mid-project", src: "/images/people/evan.png" },
  { name: "Lena Voss", status: "Mid-project", src: "/images/people/lena.png" },
];

const BONDS = [
  { name: "Nina Harper", preview: "Hi Angelina! How are You?", src: "/images/people/nina.png" },
  { name: "John Doe", preview: "Hi Angelina! How are You?", src: "/images/people/john.png" },
  { name: "Dominion Jayden", preview: "Hi Angelina! How are You?", src: "/images/people/dominion.png" },
];

const GROUPS = [
  {
    title: "Relocating solo",
    blurb: "Starting fresh somewhere new",
    // Figma "orange" gradient fill.
    gradient: "linear-gradient(-7deg, #FEE6D7 0%, #FEFBF9 100%)",
  },
  {
    title: "First tech Job",
    blurb: "Starting with no blueprint",
    // Figma "pink grad" fill.
    gradient: "linear-gradient(135deg, #FAE7ED 0%, #F0DDDD 100%)",
  },
];

const SUGGESTED = Array.from({ length: 3 }, () => ({
  name: "Cris Morich",
  reason: "Also in Health",
}));

export function RightRail() {
  return (
    <aside className="hidden w-[396px] shrink-0 overflow-y-auto bg-white shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] xl:block">
      <div className="flex w-[332px] flex-col gap-7 px-8 pt-6 pb-10">
        <Section title="Your circle" action="View all" href="/spaces">
          <ul className="flex flex-col gap-4">
            {CIRCLE.map((p) => (
              <li key={p.name} className="flex items-center gap-6 p-2">
                <Avatar src={p.src} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-sans text-base font-semibold text-ink-700">
                    {p.name}
                  </span>
                  <span className="truncate font-sans text-sm text-ink-300">
                    {p.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Divider />

        <Section title="Active bonds" action="View all" href="/bonds">
          <ul className="flex flex-col gap-5">
            {BONDS.map((p) => (
              <li key={p.name} className="flex items-center gap-4">
                <Avatar src={p.src} ring />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-sans text-base font-semibold text-ink-700">
                    {p.name}
                  </span>
                  <span className="truncate font-sans text-sm text-ink-300">
                    {p.preview}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Divider />

        <Section title="Chapter groups" action="Browse" href="/groups">
          <ul className="flex flex-col gap-2">
            {GROUPS.map((g) => (
              <li
                key={g.title}
                className="flex flex-col gap-2 rounded-lg p-4"
                style={{ backgroundImage: g.gradient }}
              >
                <span className="font-display text-sm font-semibold text-ink-500">
                  {g.title}
                </span>
                <span className="font-sans text-xs text-ink-400">{g.blurb}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Divider />

        <Section title="Suggested for you" action="View all" href="/nearby">
          <ul
            className="flex flex-col gap-4 rounded-2xl p-4"
            style={{ backgroundImage: GROUPS[0].gradient }}
          >
            {SUGGESTED.map((p, i) => (
              <li key={i} className="flex flex-col gap-4">
                {i > 0 && <hr className="border-[#E8EDF1]" />}
                <div className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-100 font-sans text-sm font-semibold text-primary-800">
                      K
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-sans text-sm font-semibold text-ink-700">
                        {p.name}
                      </span>
                      <span className="truncate font-sans text-xs text-ink-300">
                        {p.reason}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-full px-3 py-2.5 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-50"
                  >
                    Invite
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  action,
  href,
  children,
}: {
  title: string;
  action: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-base font-medium tracking-wide text-ink-700 uppercase">
          {title}
        </h2>
        <Link
          href={href}
          className="font-sans text-sm font-medium text-primary-500 hover:underline"
        >
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}

function Avatar({ src, ring = false }: { src: string; ring?: boolean }) {
  return (
    <span className="relative size-12 shrink-0 overflow-hidden rounded-full">
      <Image src={src} alt="" fill sizes="48px" className="object-cover" />
      {ring && (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white ring-inset" />
      )}
    </span>
  );
}

function Divider() {
  return <hr className="border-[#E8EDF1]" />;
}
