import { and, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { conversations, listings, messages, user } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { ChatsShell } from "@/components/chat/chats-shell";
import {
  ConversationList,
  type ConversationRow,
} from "@/components/chat/conversation-list";

export default async function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const me = session.user.id;

  const other = alias(user, "other");
  const rows = await db
    .select({
      conv: conversations,
      listing: { title: listings.title, coverUrl: listings.coverUrl },
      other: { name: other.name, image: other.image },
      unread: sql<number>`(
        select count(*)::int from ${messages}
        where ${messages.conversationId} = ${conversations.id}
          and ${messages.senderId} != ${me}
          and ${messages.readAt} is null
      )`,
      lastBody: sql<string | null>`(
        select coalesce(${messages.body}, ${messages.type}::text) from ${messages}
        where ${messages.conversationId} = ${conversations.id}
        order by ${messages.createdAt} desc limit 1
      )`,
    })
    .from(conversations)
    .innerJoin(listings, eq(conversations.listingId, listings.id))
    .innerJoin(
      other,
      or(
        and(eq(conversations.buyerId, me), eq(other.id, conversations.sellerId)),
        and(eq(conversations.sellerId, me), eq(other.id, conversations.buyerId)),
      ),
    )
    .where(
      and(
        or(eq(conversations.buyerId, me), eq(conversations.sellerId, me)),
        // Hide conversations this user has soft-deleted, unless a newer
        // message has arrived since they deleted it.
        sql`(
          case when ${conversations.buyerId} = ${me}
               then ${conversations.buyerDeletedAt}
               else ${conversations.sellerDeletedAt}
          end
        ) is null or ${conversations.lastMessageAt} > (
          case when ${conversations.buyerId} = ${me}
               then ${conversations.buyerDeletedAt}
               else ${conversations.sellerDeletedAt}
          end
        )`,
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))
    .limit(100);

  const list: ConversationRow[] = rows.map((row) => ({
    id: row.conv.id,
    listingTitle: row.listing.title,
    listingCoverUrl: row.listing.coverUrl,
    otherName: row.other.name,
    otherImage: row.other.image,
    unread: row.unread,
    lastBody: row.lastBody,
    lastMessageAt: row.conv.lastMessageAt,
  }));

  return (
    <>
      <TopBar />
      <ChatsShell list={<ConversationList rows={list} />}>{children}</ChatsShell>
    </>
  );
}
