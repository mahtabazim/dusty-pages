import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { DeleteSavedSearch } from "@/components/search/delete-saved-search";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "Saved searches" };

export default async function SavedSearchesPage() {
  const session = await requireUser();
  const rows = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, session.user.id))
    .orderBy(desc(savedSearches.createdAt));

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-4"><div className="mx-auto max-w-3xl">
        <h1 className="mb-3 flex items-center gap-2 text-xl font-semibold">
          <Search className="size-5" /> Saved searches
        </h1>
        {rows.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>No saved searches</EmptyTitle>
              <EmptyDescription>
                Save a search from the search page and we&apos;ll notify you
                when a matching book is listed.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {rows.map((search) => {
              const filters = (search.filters ?? {}) as Record<string, string>;
              const query = new URLSearchParams(
                Object.fromEntries(
                  Object.entries({ q: search.query ?? undefined, ...filters }).filter(
                    ([, v]) => v,
                  ) as [string, string][],
                ),
              );
              const label = [
                search.query && `"${search.query}"`,
                filters.category,
                filters.city,
                filters.max && `≤${filters.max} coins`,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={search.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/search?${query}`} className="min-w-0 flex-1 hover:underline">
                    <p className="truncate text-sm font-medium">{label || "All books"}</p>
                    <p className="text-xs text-muted-foreground">
                      saved {formatDistanceToNow(search.createdAt, { addSuffix: true })}
                    </p>
                  </Link>
                  <DeleteSavedSearch id={search.id} />
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </main>
    </>
  );
}
