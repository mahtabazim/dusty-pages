import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, listings } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { EditListingForm } from "@/components/listing/edit-listing-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await requireUser();

  const [listing] = await db.select().from(listings).where(eq(listings.id, id));
  if (!listing) notFound();
  if (listing.sellerId !== session.user.id) redirect(`/listing/${id}`);

  const cats = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.sortOrder));

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6"><div className="mx-auto max-w-lg">
        <h1 className="mb-4 text-xl font-semibold">Edit listing</h1>
        <EditListingForm
          listingId={listing.id}
          categories={cats}
          initial={{
            title: listing.title,
            author: listing.author ?? "",
            language: listing.language,
            categorySlug: listing.categorySlug,
            condition: listing.condition,
            description: listing.description ?? "",
            coverUrl: listing.coverUrl,
            priceCoins: listing.priceCoins,
            city: listing.city ?? "",
            area: listing.area ?? "",
          }}
        />
        </div>
      </main>
    </>
  );
}
