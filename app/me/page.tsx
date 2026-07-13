import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import {
  BadgeCheck,
  BookMarked,
  ChevronRight,
  Coins,
  Heart,
  Package,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  badges,
  listings,
  orders,
  userBadges,
  wallets,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BadgeIcon } from "@/components/icons";
import { ListingCard } from "@/components/listing-card";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { SignOutButton } from "@/components/profile/sign-out-button";

export const metadata: Metadata = { title: "My profile" };

export default async function MePage() {
  const session = await requireUser();
  const me = session.user;

  const [[wallet], [{ soldCount }], myBadges, myListings] = await Promise.all([
    db.select().from(wallets).where(eq(wallets.userId, me.id)),
    db
      .select({ soldCount: count() })
      .from(orders)
      .where(and(eq(orders.sellerId, me.id), eq(orders.status, "completed"))),
    db
      .select({ badge: badges, awardedAt: userBadges.awardedAt })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeCode, badges.code))
      .where(eq(userBadges.userId, me.id)),
    db
      .select({
        id: listings.id,
        title: listings.title,
        author: listings.author,
        coverUrl: listings.coverUrl,
        priceCoins: listings.priceCoins,
        condition: listings.condition,
        city: listings.city,
        area: listings.area,
        createdAt: listings.createdAt,
        status: listings.status,
      })
      .from(listings)
      .where(eq(listings.sellerId, me.id))
      .orderBy(desc(listings.createdAt))
      .limit(12),
  ]);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl gap-8 px-4 py-4 md:grid md:grid-cols-[320px_1fr] md:items-start lg:grid-cols-[360px_1fr]"><div className="space-y-5">
        <section className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={me.image ?? undefined} />
            <AvatarFallback className="text-lg">
              {me.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-lg font-semibold">
              {me.name}
              {me.emailVerified && <BadgeCheck className="size-4 text-primary" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[me.area, me.city].filter(Boolean).join(", ") || "Location not set"}
            </p>
            <p className="text-xs text-muted-foreground">
              Member since {format(new Date(me.createdAt), "MMM yyyy")} · {soldCount} sold
            </p>
          </div>
          <EditProfileDialog
            initial={{
              name: me.name,
              bio: me.bio ?? "",
              city: me.city ?? "",
              area: me.area ?? "",
            }}
          />
        </section>

        {me.bio && <p className="text-sm text-muted-foreground">{me.bio}</p>}

        {myBadges.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {myBadges.map(({ badge }) => (
              <Badge key={badge.code} variant="outline" title={badge.description}>
                <BadgeIcon code={badge.code} />
                {badge.name}
              </Badge>
            ))}
          </section>
        )}

        <nav className="divide-y rounded-xl border bg-card">
          {[
            { href: "/wallet", icon: Coins, label: `Wallet — ${wallet?.balance ?? 0} coins` },
            { href: "/orders", icon: Package, label: "My orders" },
            { href: "/favorites", icon: Heart, label: "Favorites" },
            { href: "/saved-searches", icon: Search, label: "Saved searches" },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </nav>

          <SignOutButton />
        </div>

        <section className="mt-5 md:mt-0">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <BookMarked className="size-4" /> My listings
          </h2>
          {myListings.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              You haven&apos;t listed any books.{" "}
              <Link href="/sell" className="text-primary underline-offset-4 hover:underline">
                Sell your first one
              </Link>{" "}
              and earn bonus coins!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {myListings.map((l) => (
                <div key={l.id} className="relative">
                  {l.status !== "active" && (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-medium text-background">
                      {l.status.replace("_", " ")}
                    </span>
                  )}
                  <ListingCard listing={l} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
