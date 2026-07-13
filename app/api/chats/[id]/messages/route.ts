import { NextResponse } from "next/server";
import { and, asc, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations, messages, offers } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

/** Messages for a conversation (poll endpoint; ?after=<iso> for increments). */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv || (conv.buyerId !== session.user.id && conv.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const after = new URL(req.url).searchParams.get("after");
  const rows = await db
    .select({
      message: messages,
      offer: offers,
    })
    .from(messages)
    .leftJoin(offers, eq(messages.offerId, offers.id))
    .where(
      after
        ? and(eq(messages.conversationId, id), gt(messages.createdAt, new Date(after)))
        : eq(messages.conversationId, id),
    )
    .orderBy(asc(messages.createdAt))
    .limit(200);

  // Mark the other side's messages as read.
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, id),
        ne(messages.senderId, session.user.id),
        isNull(messages.readAt),
      ),
    );

  return NextResponse.json({ messages: rows });
}
