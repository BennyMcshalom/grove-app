import { SearchView } from "@/components/app/SearchView";
import { getShellViewer } from "@/lib/auth/viewer";
import { searchEverything } from "@/lib/search";

/** Search — Figma frames 123:10150 (desktop) and 628:35194 (phone). */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  await getShellViewer();
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";
  const results = query.length >= 2 ? await searchEverything(query) : null;

  return <SearchView key={query} initialQuery={query} initialResults={results} />;
}
