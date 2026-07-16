import Link from "next/link";
import { desc, eq, sql, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { banners, categories, listings } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { LISTING_GRID, ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  BookOpen,
  Coins,
  Flame,
  GraduationCap,
  HandCoins,
  Sparkles,
  Star,
} from "lucide-react";
import { BrowseSelect } from "@/components/browse-select";
import { IdeaIllustration } from "@/components/idea-illustration";

const COLLECTIONS = [
  { label: "Under 50 coins", icon: Coins, href: "/search?max=50&sort=price_asc" },
  { label: "Like-new picks", icon: Sparkles, href: "/search?condition=like_new" },
  { label: "Exam season", icon: GraduationCap, href: "/search?category=competitive-exams" },
  { label: "Textbooks", icon: BookOpen, href: "/search?category=academic" },
  { label: "Most wanted", icon: Flame, href: "/search?sort=popular" },
];

const IDEA_STEPS = [
  { icon: BookOpen, label: "List a book in about a minute" },
  { icon: HandCoins, label: "Earn coins when it sells" },
  { icon: Star, label: "Meet nearby, scan, done" },
];

export default async function HomePage() {
  const session = await getSession();
  const userCity = session?.user.city ?? null;

  const [cats, activeBanners, feed] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder)),
    db
      .select()
      .from(banners)
      .where(eq(banners.active, true))
      .orderBy(asc(banners.sortOrder))
      .limit(5),
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
      })
      .from(listings)
      .where(eq(listings.status, "active"))
      .orderBy(
          sql`CASE WHEN ${listings.city} = ${userCity} THEN 0 ELSE 1 END`,
        desc(listings.createdAt),
      )
      .limit(24),
  ]);

  return (
    <>
      <TopBar />
      
      <main className="mx-auto max-w-6xl space-y-10 px-4 py-6">
        {!session && (
          <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-primary-foreground md:px-12 md:py-20">
            {/* Soft radial wash keeps the large flat fill from reading as a
                solid block without adding an image request. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-primary-foreground/5 blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl space-y-5 text-center">
              <Badge
                variant="secondary"
                className="border-0 bg-primary-foreground/15 text-primary-foreground backdrop-blur-sm"
              >
                No money. Just books &amp; coins.
              </Badge>
              <h1 className="text-balance text-headline md:text-display">
                Swap your finished books for your next great read
              </h1>
              <p className="text-pretty text-sm/relaxed opacity-90 md:text-base/relaxed">
                Sell used books to readers near you, earn coins, and spend them
                on books from the community — with escrow-protected meetups.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="lg" variant="secondary" render={<Link href="/signup" />}>
                  Join free — get 100 coins
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  render={<Link href="/search" />}
                >
                  Browse books
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs opacity-90 md:text-sm">
                <span className="flex flex-col items-center gap-1">
                  <BookOpen className="size-5" /> List in 1 minute
                </span>
                <span className="flex flex-col items-center gap-1">
                  <HandCoins className="size-5" /> Earn coins selling
                </span>
                <span className="flex flex-col items-center gap-1">
                  <Star className="size-5" /> Trusted local meetups
                </span>
              </div>
            </div>
          </section>
        )}

        {activeBanners.length > 0 && (
          <div className="flex gap-3 overflow-x-auto ">
            {activeBanners.map((b) => (
              <Link
                key={b.id}
                href={b.url ?? "#"}
                className="min-w-[280px] flex-1 rounded-xl bg-accent px-5 py-4 font-medium"
              >
                {b.title}
              </Link>
            ))}
          </div>
        )}

        {/* The idea, in one line — shown to everyone, since signed-in users
            never see the marketing hero above. */}
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-surface-2">
          <div className="grid items-center gap-8 p-6 md:grid-cols-[1.35fr_1fr] md:p-8">
            <div className="space-y-4">
              <Badge variant="secondary">How DustyPages works</Badge>
              <h2 className="text-balance text-title md:text-headline">
                Your shelf is someone else&apos;s wishlist
              </h2>
              <p className="text-pretty text-sm/relaxed text-muted-foreground">
                List a book you&apos;ve finished and earn coins when a reader
                near you picks it up. Spend those coins on their books. No cash
                changes hands — just books moving between people who&apos;ll
                actually read them.
              </p>
              {/* Stacked, not a 3-up grid: in this column each cell was ~150px
                  wide, so every label broke mid-phrase ("List a book in about
                  a / minute"). Stacking also gives the column enough height to
                  meet the illustration, which is what left the dead band. */}
              <ul className="space-y-2.5">
                {IDEA_STEPS.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <s.icon className="size-4" />
                    </span>
                    <span className="text-label">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Capped on every breakpoint. Uncapped (md:max-w-none) the 260×200
                artwork filled the 1fr column at ~480px wide / ~370px tall and
                became the row's height driver — a decorative SVG must never
                set the layout height. */}
            <IdeaIllustration className="mx-auto w-full max-w-[280px]" />
          </div>
        </section>

        {/* Sits under the hero banner and directly above the feed it filters.
            No section heading: the two placeholders ("Browse by category",
            "Jump to a collection") already say what this is, and a label above
            them only adds chrome. */}
        <section>
          <BrowseSelect
            categories={cats.map((c) => ({ value: c.slug, label: c.name }))}
            collections={COLLECTIONS.map((c) => ({
              value: c.href,
              label: c.label,
            }))}
          />
        </section>

        <section>
          <h2 className="mb-4 text-title">
            {userCity ? `Books near ${userCity}` : "Fresh arrivals"}
          </h2>
          {feed.length === 0 ? (
            <Empty className="border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>No books listed yet</EmptyTitle>
                <EmptyDescription>
                  Be the first — <Link href="/sell">sell a book</Link> and earn
                  bonus coins!
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className={LISTING_GRID}>
              {feed.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
