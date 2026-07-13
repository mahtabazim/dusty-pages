import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ArrowLeft, BookOpen, Coins } from "lucide-react";
import { db } from "@/lib/db";
import { conversations, listings, user } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { ChatRoom } from "@/components/chat/chat-room";
import { ChatMenu } from "@/components/chat/chat-menu";

export default async function ChatPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await requireUser();

  const buyer = alias(user, "buyer");
  const seller = alias(user, "seller");
  const [row] = await db
    .select({
      conv: conversations,
      listing: {
        id: listings.id,
        title: listings.title,
        coverUrl: listings.coverUrl,
        priceCoins: listings.priceCoins,
        status: listings.status,
        sellerId: listings.sellerId,
      },
      buyer: { id: buyer.id, name: buyer.name, image: buyer.image },
      seller: { id: seller.id, name: seller.name, image: seller.image },
    })
    .from(conversations)
    .innerJoin(listings, eq(conversations.listingId, listings.id))
    .innerJoin(buyer, eq(conversations.buyerId, buyer.id))
    .innerJoin(seller, eq(conversations.sellerId, seller.id))
    .where(eq(conversations.id, id));
  if (!row) notFound();
  const { conv, listing } = row;

  const isBuyer = conv.buyerId === session.user.id;
  const isSeller = conv.sellerId === session.user.id;
  if (!isBuyer && !isSeller) notFound();
  const other = isBuyer ? row.seller : row.buyer;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b bg-card px-3 py-2">
        <Link
          href="/chats"
          aria-label="Back to chats"
          className="rounded-full p-1.5 hover:bg-accent md:hidden"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Link
          href={`/listing/${listing.id}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <div className="relative aspect-3/4 w-8 shrink-0 overflow-hidden rounded bg-muted">
            {listing.coverUrl ? (
              <Image src={listing.coverUrl} alt="" fill sizes="32px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="size-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{other.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {listing.title} ·{" "}
              <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                <Coins className="size-3 text-amber-600" />
                {listing.priceCoins}
              </span>
            </p>
          </div>
        </Link>
        <ChatMenu otherUserId={other.id} otherUserName={other.name} />
      </header>

      <ChatRoom
        conversationId={conv.id}
        meId={session.user.id}
        isSeller={isSeller}
        listingActive={listing.status === "active"}
        listingPrice={listing.priceCoins}
        pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY ?? null}
      />
    </div>
  );
}
