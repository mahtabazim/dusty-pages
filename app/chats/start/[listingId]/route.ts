import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, listings } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

/** Find-or-create the conversation between the viewer and a listing's seller. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ listingId: string }> },
) {
  const { listingId } = await ctx.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const [listing] = await db
    .select({ id: listings.id, sellerId: listings.sellerId })
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing) return NextResponse.redirect(new URL("/", req.url));
  if (listing.sellerId === session.user.id) {
    // Sellers land on their own listing instead of chatting with themselves.
    return NextResponse.redirect(new URL(`/listing/${listingId}`, req.url));
  }

  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.listingId, listingId),
        eq(conversations.buyerId, session.user.id),
      ),
    );
  if (existing) {
    return NextResponse.redirect(new URL(`/chats/${existing.id}`, req.url));
  }
  const [created] = await db
    .insert(conversations)
    .values({
      listingId,
      buyerId: session.user.id,
      sellerId: listing.sellerId,
    })
    .returning();
  return NextResponse.redirect(new URL(`/chats/${created.id}`, req.url));
}
