import { SearchView } from "@/components/app/SearchView";
import { getShellViewer } from "@/lib/auth/viewer";
import { searchEverything, type SearchResult } from "@/lib/search";

/** Search — Figma frames 123:10150 (desktop) and 628:35194 (phone), states 1206:22415–22696. */
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  await getShellViewer();
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";

  let results: SearchResult[] | null = null;
  let failed = false;
  if (query.length >= 2) {
    try {
      results = await searchEverything(query);
    } catch {
      failed = true;
    }
  }

  return <SearchView key={query} initialQuery={query} initialResults={results} initialFailed={failed} />;
}
