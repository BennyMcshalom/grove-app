"use client";

import Link from "next/link";
import { GrouvHero, GrouvPage, GrouvTabs } from "@/components/app/GrouvProfile";
import { GrouvRings, type RingPrompts } from "@/components/app/GrouvRings";
import { useViewer } from "@/components/app/ViewerProvider";
import { cn } from "@/lib/cn";
import type { LogEntry } from "@/lib/log";
import type { FeedPage } from "@/lib/posts";
import type { LogVisibility } from "@/lib/profile";
import { PREVIEW_AS, visibleTo, type PreviewAs, type ProfileAudiences } from "@/lib/profile-audience";

/**
 * Profile Preview — Figma 1680:42043. Your Grouv page (the same components as
 * /people/<id>) with your own data, filtered the way the database filters it
 * for someone else: field audiences (profile_for), the ring words for Bonds
 * only (profile_prompts RLS), posts by audience and moments by log
 * visibility. Posts open in the post modal (1680:42094 / 1763:26754).
 */
export function ProfilePreviewView({
  as,
  bio,
  birthday,
  audiences,
  prompts,
  logVisibility,
  posts,
  logs,
}: {
  as: PreviewAs;
  bio: string | null;
  birthday: string | null;
  audiences: ProfileAudiences;
  prompts: RingPrompts;
  logVisibility: LogVisibility;
  posts: FeedPage;
  logs: LogEntry[];
}) {
  const viewer = useViewer();
  const label = PREVIEW_AS.find((p) => p.value === as)?.label.toLowerCase() ?? "a stranger";

  // Named posts only. Open Grouv reaches strangers in the Space; "Everyone"
  // is your circle and Bonds. Selected-Bonds posts depend on who you picked.
  const shownPosts = posts.posts.filter(
    (p) => !p.anonymous && (p.openGrove || (as !== "stranger" && p.audience === "everyone")),
  );
  const shownLogs = logs.filter((e) => visibleTo(e.visibility ?? logVisibility, as));

  return (
    <GrouvPage
      title="Profile"
      back="/settings/privacy"
      hero={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-sans text-sm text-ink-400">
              This is how your profile looks to <span className="font-medium text-ink-700">{label}</span>.
            </p>
            <div role="tablist" aria-label="Preview as" className="flex shrink-0 rounded-full bg-ivory-400 p-1">
              {PREVIEW_AS.map((option) => (
                <Link
                  key={option.value}
                  href={`/settings/preview?as=${option.value}`}
                  replace
                  scroll={false}
                  role="tab"
                  aria-selected={as === option.value}
                  className={cn(
                    "rounded-full px-3 py-1 font-ui text-sm font-medium whitespace-nowrap transition-colors",
                    as === option.value ? "bg-surface text-ink-700 shadow-sm" : "text-ink-400 hover:text-ink-600",
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          <GrouvHero banner={viewer.banner} seed={viewer.id}>
            <GrouvRings
              subject={{
                id: viewer.id,
                name: viewer.firstName,
                avatarUrl: viewer.avatarUrl,
                aura: viewer.aura,
                locationLabel: visibleTo(audiences.location, as) ? viewer.locationLabel : null,
                chapters: visibleTo(audiences.chapter, as)
                  ? viewer.chapters.map((c) => ({ slug: c.slug, phase: c.phase }))
                  : [],
                bio: visibleTo(audiences.bio, as) ? bio : null,
                birthday: visibleTo(audiences.birthday, as) ? birthday : null,
                self: false,
              }}
              people={[]}
              prompts={as === "bond" ? prompts : { struggling: null, building: null, open: null }}
              promptsHidden={as !== "bond"}
              label={as === "bond" ? "Bonded" : as === "circle" ? "In your circle" : null}
            />
          </GrouvHero>
        </div>
      }
    >
      <GrouvTabs
        labels={["Posts", "Grouv Logs"]}
        postsQuery={{ scope: "mine" }}
        posts={{ posts: shownPosts, nextCursor: null }}
        postsEmpty={<Empty>Nothing you&rsquo;ve posted reaches {label} yet.</Empty>}
        logs={shownLogs}
        logsEmpty={<Empty>Your Grouv Log is hidden from {label}.</Empty>}
      />
    </GrouvPage>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl bg-surface px-4 py-10 text-center font-sans text-sm text-ink-300">{children}</p>;
}
