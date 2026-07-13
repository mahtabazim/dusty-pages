import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { desc, eq, or } from "drizzle-orm";
import { BookOpen, Coins } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { db } from "@/lib/db";
import { listings, orders } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "My orders" };

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  escrow_held: { label: "Awaiting handover", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
  disputed: { label: "Disputed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
};

export default async function OrdersPage() {
  const session = await requireUser();

  const rows = await db
    .select({ order: orders, listing: listings })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .where(
      or(eq(orders.buyerId, session.user.id), eq(orders.sellerId, session.user.id)),
    )
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl space-y-3 px-4 py-4">
        <h1 className="text-xl font-semibold">My orders</h1>
        {rows.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen />
              </EmptyMedia>
              <EmptyTitle>No orders yet</EmptyTitle>
              <EmptyDescription>
                When you buy or sell a book, it shows up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ order, listing }) => {
            const role = order.buyerId === session.user.id ? "Buying" : "Selling";
            const badge = STATUS_BADGE[order.status];
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <div className="relative aspect-3/4 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {listing.coverUrl ? (
                    <Image src={listing.coverUrl} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="size-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-1 text-sm font-medium">{listing.title}</p>
                  <p className="flex items-center gap-1 text-sm font-semibold text-primary">
                    <Coins className="size-3.5 text-amber-600" /> {order.priceCoins}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {role} · {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={badge.variant} className="self-start">
                  {badge.label}
                </Badge>
              </Link>
            );
          })}
          </div>
        )}
      </main>
    </>
  );
}
