"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

export async function deleteSavedSearch(id: string): Promise<{ error?: string }> {
  const session = await requireUser();
  await db
    .delete(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, session.user.id)));
  return {};
}

export async function saveSearch(
  params: Record<string, string | undefined>,
): Promise<{ error?: string }> {
  const session = await requireUser();
  const { q, ...filters } = params;
  await db.insert(savedSearches).values({
    userId: session.user.id,
    query: q ?? null,
    filters: Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>,
  });
  return {};
}
