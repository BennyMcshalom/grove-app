import Image from "next/image";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { RightRail } from "@/components/app/RightRail";
import { TopBar } from "@/components/app/TopBar";
import { ArchiveChapterActions } from "@/components/app/wrapped/ArchiveChapterActions";
import { getShellViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { createClient } from "@/lib/supabase/server";
import { loadChapterWrapIds } from "@/lib/wrapped-server";

/**
 * Life Archive — Figma frames 1466:24512 / 648:36333 (list), 296:11158 (the
 * earlier version) and the "No Archive" empty state.
 *
 * Closed chapters as cards: chapter icon and name, the span and its duration,
 * the phases you moved through as chips, the people you connected with in it,
 * then "View chapter", "View Wrapped" and the ⋯ menu (1466:25032). After the
 * Season Pass ends, a note says everything stays readable (PRD §13).
 */
export default async function ArchivePage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const { data: closed } = await supabase
    .from("user_chapters")
    .select("id, chapter_slug, opened_at, closed_at, user_chapter_phases(phase, started_at)")
    .eq("user_id", viewer.id)
    .eq("status", "closed")
    .order("closed_at", { ascending: false });

  const rows = closed ?? [];
  const [wraps, people] = await Promise.all([
    loadChapterWrapIds(rows.map((r) => r.id)),
    loadChapterPeople(viewer.id, [...new Set(rows.map((r) => r.chapter_slug))]),
  ]);

  const chapters = rows.map((row) => {
    const closedAt = row.closed_at ?? row.opened_at;
    return {
      id: row.id,
      meta: getChapter(row.chapter_slug),
      span: formatSpan(row.opened_at, closedAt),
      duration: formatDuration(row.opened_at, closedAt),
      // The phases in the order they were lived, each once.
      phases: [
        ...new Set(
          [...row.user_chapter_phases]
            .sort((a, b) => a.started_at.localeCompare(b.started_at))
            .map((p) => p.phase),
        ),
      ],
      // People you connected with in this chapter while it was open.
      people: (people.get(row.chapter_slug) ?? [])
        .filter((p) => p.connectedAt >= row.opened_at && p.connectedAt <= closedAt)
        .slice(0, 4),
      wrapId: wraps.get(row.id) ?? null,
    };
  });

  const passEnded = !viewer.hasPass && viewer.subscriptionStatus !== "none";

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Life Archive" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-4 pb-10">
            {passEnded && chapters.length > 0 && (
              <p className="rounded-lg bg-warning-5 px-4 py-4 font-sans text-sm text-primary-700">
                Your Season Pass ended. Every chapter here stays readable. Wrapped exports and new keepsakes need an
                active plan.
              </p>
            )}

            {chapters.length === 0 ? (
              <div className="rounded-3xl bg-surface px-4">
                <EmptyState title="No Archive" body="When you close a chapter, it lands here with its reflection." />
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {chapters.map((chapter) => (
                  <li
                    key={chapter.id}
                    className="flex flex-col gap-4 rounded-lg bg-surface p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {chapter.meta && (
                          <Image src={chapter.meta.icon} alt="" width={56} height={56} className="size-9 shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-sans text-lg font-semibold text-ink-800">
                            {chapter.meta?.name ?? "Chapter"}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-sans text-xs text-ink-400">{chapter.span}</span>
                            <span className="size-1.5 rounded-full bg-primary-500" />
                            <span className="font-sans text-xs text-ink-400">{chapter.duration}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {chapter.phases.map((phase) => (
                          <span
                            key={phase}
                            className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400"
                          >
                            {phase}
                          </span>
                        ))}
                      </div>

                      {chapter.people.length > 0 && (
                        <span className="flex" aria-label={chapter.people.map((p) => p.name).join(", ")}>
                          {chapter.people.map((person, i) => (
                            <span
                              key={person.id}
                              className="rounded-full border-2 border-surface"
                              style={{ marginLeft: i === 0 ? 0 : -8 }}
                            >
                              <Avatar src={person.avatarUrl} name={person.name} userId={person.id} sizes="24px" className="size-6" />
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    <ArchiveChapterActions userChapterId={chapter.id} wrapId={chapter.wrapId} variant="card" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <RightRail />
    </div>
  );
}

type ChapterPerson = { id: string; name: string; avatarUrl: string | null; connectedAt: string };

/** Accepted connections per chapter, with when they began. */
async function loadChapterPeople(userId: string, slugs: string[]) {
  const byChapter = new Map<string, ChapterPerson[]>();
  if (slugs.length === 0) return byChapter;

  const supabase = await createClient();
  const { data: connections } = await supabase
    .from("connections")
    .select("requester_id, addressee_id, chapter_slug, created_at")
    .eq("status", "accepted")
    .in("chapter_slug", slugs)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const rows = connections ?? [];
  const other = (c: (typeof rows)[number]) => (c.requester_id === userId ? c.addressee_id : c.requester_id);
  const ids = [...new Set(rows.map(other))];
  if (ids.length === 0) return byChapter;
  const { data: profiles } = await supabase.from("profiles").select("id, first_name, avatar_url").in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  for (const c of rows) {
    const person = byId.get(other(c));
    if (!person || !c.chapter_slug) continue;
    const list = byChapter.get(c.chapter_slug) ?? [];
    list.push({ id: person.id, name: person.first_name, avatarUrl: person.avatar_url, connectedAt: c.created_at });
    byChapter.set(c.chapter_slug, list);
  }
  return byChapter;
}

const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/** "March 2024 - November 2024". */
function formatSpan(from: string, to: string) {
  return `${monthYear.format(new Date(from))} - ${monthYear.format(new Date(to))}`;
}

/** "8 Months", or days for a chapter shorter than a month. */
function formatDuration(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  if (months >= 1) return `${months} ${months === 1 ? "Month" : "Months"}`;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return `${days} ${days === 1 ? "Day" : "Days"}`;
}
