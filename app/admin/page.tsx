import type { Metadata } from "next";
import { and, count, eq, gte, sql, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  coinLedger,
  dailyEarnings,
  disputes,
  listings,
  orders,
  reports,
  user,
  wallets,
} from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);

  const [
    [{ userCount }],
    [{ activeListings }],
    [{ completedOrders }],
    [{ escrowOrders }],
    [supply],
    [{ openReports }],
    [{ openDisputes }],
    [{ dau }],
    [{ mau }],
    [minted],
    [spent],
  ] = await Promise.all([
    db.select({ userCount: count() }).from(user),
    db
      .select({ activeListings: count() })
      .from(listings)
      .where(eq(listings.status, "active")),
    db
      .select({ completedOrders: count() })
      .from(orders)
      .where(eq(orders.status, "completed")),
    db
      .select({ escrowOrders: count() })
      .from(orders)
      .where(eq(orders.status, "escrow_held")),
    db
      .select({
        available: sum(wallets.balance),
        escrow: sum(wallets.escrowHeld),
      })
      .from(wallets),
    db
      .select({ openReports: count() })
      .from(reports)
      .where(eq(reports.status, "open")),
    db
      .select({ openDisputes: count() })
      .from(disputes)
      .where(eq(disputes.status, "open")),
    db
      .select({ dau: count() })
      .from(dailyEarnings)
      .where(eq(dailyEarnings.day, today)),
    db
      .select({ dau: count(sql`distinct ${dailyEarnings.userId}`) })
      .from(dailyEarnings)
      .where(gte(dailyEarnings.day, monthAgo.toISOString().slice(0, 10)))
      .then((rows) => [{ mau: rows[0]?.dau ?? 0 }]),
    db
      .select({ total: sum(coinLedger.amount) })
      .from(coinLedger)
      .where(
        and(
          sql`${coinLedger.type} like 'EARN_%'`,
          sql`${coinLedger.userId} is not null`,
          eq(coinLedger.account, "available"),
        ),
      ),
    db
      .select({ total: sum(coinLedger.amount) })
      .from(coinLedger)
      .where(and(eq(coinLedger.type, "ESCROW_HOLD"), eq(coinLedger.account, "available"))),
  ]);

  const stats = [
    { label: "Users", value: userCount },
    { label: "Active listings", value: activeListings },
    { label: "Completed sales", value: completedOrders },
    { label: "Orders in escrow", value: escrowOrders },
    {
      label: "Coin supply",
      value: `${(Number(supply.available) || 0) + (Number(supply.escrow) || 0)}`,
    },
    { label: "Coins earned (all time)", value: Number(minted.total) || 0 },
    { label: "Coins spent on books", value: Math.abs(Number(spent.total) || 0) },
    { label: "DAU / MAU", value: `${dau} / ${mau}` },
    { label: "Open reports", value: openReports },
    { label: "Open disputes", value: openDisputes },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
