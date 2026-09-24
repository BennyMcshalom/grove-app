import { notFound } from "next/navigation";
import { IntroduceView } from "@/components/app/IntroduceView";
import { getShellViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * "These two people are in a similar chapter. Want to introduce them?" — where
 * the weekly suggestion lands. No Figma frame. The introducer writes the note
 * and sends it; the engine never connects anyone on its own.
 */
export default async function IntroducePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { a, b } = await searchParams;
  if (typeof a !== "string" || typeof b !== "string" || !UUID.test(a) || !UUID.test(b) || a === b) notFound();

  const viewer = await getShellViewer();
  if (a === viewer.id || b === viewer.id) notFound();

  const supabase = await createClient();
  const { data: people } = await supabase
    .from("profiles")
    .select("id, first_name, avatar_url")
    .in("id", [a, b]);

  const first = people?.find((p) => p.id === a);
  const second = people?.find((p) => p.id === b);
  if (!first || !second) notFound();

  return (
    <IntroduceView
      a={{ id: first.id, name: first.first_name, avatarUrl: first.avatar_url }}
      b={{ id: second.id, name: second.first_name, avatarUrl: second.avatar_url }}
    />
  );
}
