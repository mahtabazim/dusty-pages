import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { format } from "date-fns";
import { alias } from "drizzle-orm/pg-core";
import {
  BookOpen,
  CheckCircle2,
  Coins,
  Hourglass,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/db";
import { disputes, listings, orders, ratings, user } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HandoverQr } from "@/components/orders/handover-qr";
import { BuyerActions } from "@/components/orders/buyer-actions";
import { DisputeDialog } from "@/components/orders/dispute-dialog";
import { RatingForm } from "@/components/orders/rating-form";

export default async function OrderPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await requireUser();

  const buyer = alias(user, "buyer");
  const seller = alias(user, "seller");
  const [row] = await db
    .select({
      order: orders,
      listing: listings,
      buyer: { id: buyer.id, name: buyer.name, image: buyer.image },
      seller: { id: seller.id, name: seller.name, image: seller.image },
    })
    .from(orders)
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .innerJoin(buyer, eq(orders.buyerId, buyer.id))
    .innerJoin(seller, eq(orders.sellerId, seller.id))
    .where(eq(orders.id, id));
  if (!row) notFound();
  const { order, listing } = row;

  const isBuyer = order.buyerId === session.user.id;
  const isSeller = order.sellerId === session.user.id;
  if (!isBuyer && !isSeller && session.user.role !== "admin") notFound();

  const [myRating] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.orderId, id), eq(ratings.raterId, session.user.id)));
  const [dispute] = await db.select().from(disputes).where(eq(disputes.orderId, id));

  const other = isBuyer ? row.seller : row.buyer;

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-4"><div className="mx-auto max-w-xl space-y-4">
        {/* Status banner */}
        {order.status === "escrow_held" && (
          <Alert>
            <Hourglass />
            <AlertTitle>{order.priceCoins} coins are safely in escrow</AlertTitle>
            <AlertDescription>
              Auto-release on {format(order.autoReleaseAt, "d MMM")} if not
              confirmed.
            </AlertDescription>
          </Alert>
        )}
        {order.status === "completed" && (
          <Alert>
            <CheckCircle2 className="text-emerald-600" />
            <AlertTitle>
              Trade completed on {format(order.completedAt!, "d MMM yyyy")}
            </AlertTitle>
          </Alert>
        )}
        {order.status === "cancelled" && (
          <Alert>
            <XCircle />
            <AlertTitle>Order cancelled</AlertTitle>
            <AlertDescription>Coins were refunded to the buyer.</AlertDescription>
          </Alert>
        )}
        {order.status === "disputed" && (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>
              Dispute under review{dispute ? `: "${dispute.reason}"` : ""}
            </AlertTitle>
            <AlertDescription>
              Coins stay frozen until an admin decides.
            </AlertDescription>
          </Alert>
        )}
        {order.status === "refunded" && (
          <Alert>
            <XCircle />
            <AlertTitle>Dispute resolved</AlertTitle>
            <AlertDescription>Coins were refunded to the buyer.</AlertDescription>
          </Alert>
        )}

        {/* Book summary */}
        <Link
          href={`/listing/${listing.id}`}
          className="flex gap-3 rounded-xl border bg-card p-3"
        >
          <div className="relative aspect-3/4 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {listing.coverUrl ? (
              <Image src={listing.coverUrl} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="size-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium">{listing.title}</p>
            <p className="mt-1 flex items-center gap-1 font-semibold text-primary">
              <Coins className="size-4 text-coin" /> {order.priceCoins} coins
            </p>
            <p className="text-xs text-muted-foreground">
              Order placed {format(order.createdAt, "d MMM yyyy, h:mm a")}
            </p>
          </div>
        </Link>

        {/* Counterpart */}
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <Avatar>
            <AvatarImage src={other.image ?? undefined} />
            <AvatarFallback>{other.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{other.name}</p>
            <p className="text-xs text-muted-foreground">
              {isBuyer ? "Seller" : "Buyer"}
            </p>
          </div>
          <Link
            href={`/chats/start/${listing.id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Chat
          </Link>
        </div>

        {order.status === "escrow_held" && (
          <Alert>
            <ShieldAlert />
            <AlertDescription>
              Meet in a public place.{" "}
              {isBuyer
                ? "Check the book carefully before scanning the QR."
                : "Hand over the book only when the buyer confirms in front of you."}
            </AlertDescription>
          </Alert>
        )}

        {/* Role-specific actions */}
        {order.status === "escrow_held" && isSeller && (
          <HandoverQr orderId={order.id} token={order.handoverToken} />
        )}
        {order.status === "escrow_held" && isBuyer && <BuyerActions orderId={order.id} />}
        {order.status === "escrow_held" && (isBuyer || isSeller) && (
          <DisputeDialog orderId={order.id} />
        )}

        {order.status === "completed" && !myRating && (isBuyer || isSeller) && (
          <RatingForm orderId={order.id} rateeName={other.name} />
        )}
        {myRating && (
          <p className="text-center text-sm text-muted-foreground">
            You rated this trade {myRating.stars} stars. Thanks!
          </p>
        )}
        </div>
      </main>
    </>
  );
}
