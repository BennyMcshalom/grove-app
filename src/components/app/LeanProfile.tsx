"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { FeedList } from "@/components/app/FeedList";
import { useDismiss } from "@/components/app/PostMenu";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { BlockDialog, ReportPersonModal } from "@/components/app/bonds/SafetyDialogs";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/actions";
import { unblockUser } from "@/lib/bond-actions";
import { setFollowing } from "@/lib/follow-actions";
import type { FeedPage, FeedQuery } from "@/lib/posts";
import type { Aura } from "@/lib/profile";

/**
 * The lean profile (2026-11-28), as plain as Home: photo, name, one action,
 * then the posts. Your profile has its own tab (/profile); everyone else's
 * is /people/<id>, with Follow. The full Grouv profile (banner, rings,
 * prompts, Grouv Logs) is hidden behind FEATURES.richProfile, not deleted.
 */
function LeanProfilePage({ title, back, children }: { title: string; back?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title={title} back={back} />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 pb-10">{children}</div>
      </div>
    </div>
  );
}

function LeanProfileHeader({
  userId,
  name,
  avatarUrl,
  aura,
  children,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  aura?: Aura;
  /** The action buttons. */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-4 border-b border-ink-50 pb-6">
      <Avatar src={avatarUrl} name={name} userId={userId} aura={aura} sizes="64px" className="size-14 shrink-0 sm:size-16" />
      <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold text-ink-800">{name}</h1>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}

/** Their posts, newest first, as the same cards Home uses. */
function LeanProfilePosts({
  query,
  posts,
  empty,
}: {
  query: Omit<FeedQuery, "cursor">;
  posts: FeedPage;
  empty: React.ReactNode;
}) {
  return (
    <section aria-label="Posts" className="flex flex-col gap-4">
      <FeedList query={query} initial={posts} empty={empty} />
    </section>
  );
}

/** The "···" menu for the quieter actions. */
function MoreMenu({ items }: { items: { label: string; onSelect: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full border border-ink-100 text-ink-500 transition-colors hover:bg-ivory-200"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-11 right-0 z-20 flex min-w-44 flex-col rounded-xl border border-ink-50 bg-surface p-1.5 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={
                "rounded-lg px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-ivory-200 " +
                (item.danger ? "text-destructive-60" : "text-ink-700")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Your profile: Edit profile, and Sign out in the menu. */
export function YourProfileView({ posts }: { posts: FeedPage }) {
  const viewer = useViewer();
  const [, startTransition] = useTransition();
  return (
    <LeanProfilePage title="Profile">
      <LeanProfileHeader userId={viewer.id} name={viewer.firstName} avatarUrl={viewer.avatarUrl} aura={viewer.aura}>
        <Button variant="secondary" size="sm" href="/settings/edit-profile">
          Edit profile
        </Button>
        <MoreMenu items={[{ label: "Sign out", onSelect: () => startTransition(() => signOut()) }]} />
      </LeanProfileHeader>
      <LeanProfilePosts query={{ scope: "mine" }} posts={posts} empty={<EmptyFeed />} />
    </LeanProfilePage>
  );
}

export interface LeanPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  aura?: Aura;
  following: boolean;
  blocked: boolean;
}

/** Someone else's profile: Follow, with Block and Report in the menu. */
export function PersonProfileView({ person, posts }: { person: LeanPerson; posts: FeedPage }) {
  const toast = useToast();
  const [following, setFollowingState] = useState(person.following);
  const [blocked, setBlocked] = useState(person.blocked);
  const [blocking, setBlocking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggleFollow = () =>
    startTransition(async () => {
      const next = !following;
      setFollowingState(next);
      const result = await setFollowing(person.id, next);
      if (result.error) {
        setFollowingState(!next);
        toast({ title: result.error, tone: "danger" });
      }
    });

  const unblock = () =>
    startTransition(async () => {
      const result = await unblockUser(person.id);
      if (result.error) return void toast({ title: result.error, tone: "danger" });
      setBlocked(false);
      toast({ title: `Unblocked ${person.name}` });
    });

  return (
    <LeanProfilePage title={person.name} back="/home">
      <LeanProfileHeader userId={person.id} name={person.name} avatarUrl={person.avatarUrl} aura={person.aura}>
        {blocked ? (
          <Button variant="secondary" size="sm" onClick={unblock} loading={pending}>
            Unblock
          </Button>
        ) : (
          <Button
            variant={following ? "secondary" : "primary"}
            size="sm"
            onClick={toggleFollow}
            disabled={pending}
            aria-pressed={following}
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
        <MoreMenu
          items={[
            ...(blocked ? [] : [{ label: "Block", onSelect: () => setBlocking(true), danger: true }]),
            { label: "Report", onSelect: () => setReporting(true), danger: true },
          ]}
        />
      </LeanProfileHeader>

      {blocked ? (
        <p className="py-10 text-center font-sans text-sm text-ink-300">You blocked {person.name}. Unblock to see their posts.</p>
      ) : (
        <LeanProfilePosts
          query={{ scope: "person", authorId: person.id }}
          posts={posts}
          empty={<p className="py-10 text-center font-sans text-sm text-ink-300">{person.name} hasn&rsquo;t posted anything yet.</p>}
        />
      )}

      {blocking && (
        <BlockDialog
          userId={person.id}
          name={person.name}
          context="profile"
          onClose={() => setBlocking(false)}
          onBlocked={() => {
            setBlocked(true);
            setFollowingState(false);
          }}
        />
      )}
      {reporting && <ReportPersonModal userId={person.id} what="profile" onClose={() => setReporting(false)} />}
    </LeanProfilePage>
  );
}
