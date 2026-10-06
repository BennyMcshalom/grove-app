"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { grouvHref } from "@/components/app/Avatar";
import { useOptionalViewer } from "@/components/app/ViewerProvider";
import { Linkify } from "@/components/ui/Linkify";
import { cn } from "@/lib/cn";
import { splitMentions, type MentionPerson } from "@/lib/mentions";
import { createClient } from "@/lib/supabase/client";

/** Where the words came from — the table whose `mentions` column names them. */
export type MentionSource = "posts" | "comments" | "messages";

/*
 * Who each post, comment or message mentions, looked up lazily (only for
 * words with an "@" in them) and batched: everything rendered in one tick is
 * one query per table plus one for the names. RLS limits it to rows the
 * viewer can already read.
 */
const resolved = new Map<string, MentionPerson[]>();
const waiting = new Map<string, Promise<MentionPerson[]>>();
const queue: Record<MentionSource, Map<string, (people: MentionPerson[]) => void>> = {
  posts: new Map(),
  comments: new Map(),
  messages: new Map(),
};
let flushing: ReturnType<typeof setTimeout> | null = null;

/** Lets a composer show its own fresh mentions without a round trip. */
export function rememberMentions(source: MentionSource, id: string, people: MentionPerson[]) {
  resolved.set(`${source}:${id}`, people);
}

async function rowsFor(source: MentionSource, ids: string[]) {
  const supabase = createClient();
  const result =
    source === "posts"
      ? await supabase.from("posts").select("id, mentions").in("id", ids)
      : source === "comments"
        ? await supabase.from("comments").select("id, mentions").in("id", ids)
        : await supabase.from("messages").select("id, mentions").in("id", ids);
  return (result.data ?? []) as { id: string; mentions: string[] | null }[];
}

async function flush() {
  flushing = null;
  const batches = (Object.keys(queue) as MentionSource[]).map((source) => {
    const pending = new Map(queue[source]);
    queue[source].clear();
    return { source, pending };
  });

  const rows = await Promise.all(
    batches.map(async ({ source, pending }) => (pending.size ? rowsFor(source, [...pending.keys()]) : [])),
  );
  const userIds = [...new Set(rows.flat().flatMap((r) => r.mentions ?? []))];
  const { data: profiles } = userIds.length
    ? await createClient().from("profiles").select("id, first_name, avatar_url").in("id", userIds)
    : { data: [] as { id: string; first_name: string; avatar_url: string | null }[] };
  const people = new Map((profiles ?? []).map((p) => [p.id, { id: p.id, name: p.first_name, avatarUrl: p.avatar_url }]));

  batches.forEach(({ source, pending }, i) => {
    const byId = new Map(rows[i].map((r) => [r.id, r.mentions ?? []]));
    for (const [id, done] of pending) {
      const found = (byId.get(id) ?? []).flatMap((uid) => people.get(uid) ?? []);
      resolved.set(`${source}:${id}`, found);
      waiting.delete(`${source}:${id}`);
      done(found);
    }
  });
}

function lookup(source: MentionSource, id: string): Promise<MentionPerson[]> {
  const key = `${source}:${id}`;
  const known = waiting.get(key);
  if (known) return known;
  const promise = new Promise<MentionPerson[]>((resolve) => queue[source].set(id, resolve));
  waiting.set(key, promise);
  flushing ??= setTimeout(() => void flush().catch(() => undefined), 0);
  return promise;
}

/**
 * Words with their links and their @mentions: each "@Name" of someone the row
 * mentions is highlighted and opens their Grouv.
 */
export function MentionText({
  text,
  source,
  id,
  className,
  mentionClassName = "font-medium text-primary-600",
}: {
  text: string;
  source: MentionSource;
  id: string;
  /** Classes for web links (as Linkify). */
  className?: string;
  /** Classes for the "@Name" runs; light text on a dark bubble needs its own. */
  mentionClassName?: string;
}) {
  const viewer = useOptionalViewer();
  const key = `${source}:${id}`;
  const hasAt = text.includes("@");
  const [fetched, setFetched] = useState<{ key: string; people: MentionPerson[] } | null>(null);
  const people = resolved.get(key) ?? (fetched?.key === key ? fetched.people : []);

  useEffect(() => {
    if (!hasAt || resolved.has(key)) return;
    let cancelled = false;
    lookup(source, id).then((found) => {
      if (!cancelled) setFetched({ key, people: found });
    });
    return () => {
      cancelled = true;
    };
  }, [hasAt, key, source, id]);

  if (!hasAt || people.length === 0) return <Linkify text={text} className={className} />;

  return (
    <>
      {splitMentions(text, people).map((part, i) =>
        part.kind === "text" ? (
          <Linkify key={i} text={part.text} className={className} />
        ) : (
          <Link
            key={i}
            href={grouvHref(part.person.id, viewer?.id)}
            onClick={(e) => e.stopPropagation()}
            className={cn("hover:underline", mentionClassName)}
          >
            {part.text}
          </Link>
        ),
      )}
    </>
  );
}
