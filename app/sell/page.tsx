import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { MailWarning } from "lucide-react";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { SellWizard } from "@/components/sell/sell-wizard";

export const metadata: Metadata = { title: "Sell a book" };

export default async function SellPage() {
  const session = await requireUser();

  if (!session.user.emailVerified) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-16 text-center">
          <MailWarning className="mx-auto size-12 text-primary" />
          <h1 className="text-xl font-semibold">Verify your email to sell</h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to <strong>{session.user.email}</strong>.
            Once verified, you can list books. Meanwhile, you can{" "}
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              browse and buy
            </Link>
            .
          </p>
        </main>
      </>
    );
  }

  const cats = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder));

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6"><div className="mx-auto max-w-lg md:max-w-none">
        <h1 className="mb-1 text-xl font-semibold">Sell a book</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Scan it, describe it, price it — done in a minute.
        </p>
        <SellWizard categories={cats} />
        </div>
      </main>
    </>
  );
}
