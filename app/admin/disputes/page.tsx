import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { disputes, listings, orders, user } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { DisputeAdminActions } from "@/components/admin/dispute-admin-actions";

export const metadata: Metadata = { title: "Admin · Disputes" };

export default async function AdminDisputesPage() {
  const rows = await db
    .select({
      dispute: disputes,
      order: { id: orders.id, priceCoins: orders.priceCoins },
      listing: { title: listings.title },
      raisedBy: { name: user.name },
    })
    .from(disputes)
    .innerJoin(orders, eq(disputes.orderId, orders.id))
    .innerJoin(listings, eq(orders.listingId, listings.id))
    .innerJoin(user, eq(disputes.raisedById, user.id))
    .where(eq(disputes.status, "open"))
    .orderBy(asc(disputes.createdAt))
    .limit(100);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <ShieldAlert className="size-5" /> Open disputes ({rows.length})
      </h1>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No open disputes.
        </p>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {rows.map(({ dispute, order, listing, raisedBy }) => (
            <div key={dispute.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{dispute.reason}</span>
                <Badge variant="outline">{order.priceCoins} coins</Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(dispute.createdAt, "d MMM, h:mm a")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                &quot;{listing.title}&quot; · raised by {raisedBy.name} ·{" "}
                <Link
                  href={`/orders/${order.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  view order
                </Link>
              </p>
              {dispute.details && (
                <p className="text-sm text-muted-foreground">{dispute.details}</p>
              )}
              {(dispute.evidenceUrls ?? []).length > 0 && (
                <div className="flex gap-2">
                  {(dispute.evidenceUrls ?? []).map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      evidence
                    </a>
                  ))}
                </div>
              )}
              <DisputeAdminActions disputeId={dispute.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
