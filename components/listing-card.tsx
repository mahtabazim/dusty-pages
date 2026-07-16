import Link from "next/link";
import Image from "next/image";
import { BookOpen, Coins, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geo";

/**
 * The grid every full-width listing feed uses (home, search, favorites, seller).
 * Kept in one place because four pages had drifted to different column counts.
 *
 * Tuned so a card lands ~260-290px wide inside the shared max-w-6xl container:
 * past that the cover shrinks and titles wrap to three lines. The container
 * caps at 1152px, so an xl step would only shrink cards, never widen them.
 */
export const LISTING_GRID =
  "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

export const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  acceptable: "Acceptable",
};

export type ListingCardData = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  priceCoins: number;
  condition: string;
  city: string | null;
  area: string | null;
  createdAt: Date;
  distanceKm?: number | null;
};

export function ListingCard({ listing }: { listing: ListingCardData }) {
  return (
    <Link
      href={`/listing/${listing.id}`}
      className=" group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-200 ease-emphasized hover:-translate-y-1 hover:border-border hover:elevation-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* Books are portrait, so the well stays portrait and object-cover fills
          it rather than letterboxing. 4:5 rather than a truer 2:3 — the cover
          drives the card's height, and at 2:3 the wider grid cards got tall
          enough to push the feed below the fold. */}
      <div className="relative aspect-4/5 overflow-hidden bg-surface-3">
        {listing.coverUrl ? (
          <Image
            src={listing.coverUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 280px"
            className="object-cover transition-transform duration-300 ease-emphasized group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="size-8 text-muted-foreground/40" />
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute left-2 top-2 border-0 bg-card/85 text-[10px] font-medium backdrop-blur-sm"
        >
          {CONDITION_LABELS[listing.condition] ?? listing.condition}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <div className="flex items-center gap-1.5 text-sm font-bold tabular-nums">
          <Coins className="size-3.5 shrink-0 text-coin" />
          {listing.priceCoins}
        </div>
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
          {listing.title}
        </p>
        {listing.author && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {listing.author}
          </p>
        )}
        <p className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
          {listing.distanceKm != null ? (
            <>
              <MapPin className="size-3 shrink-0" />
              <span>{formatDistance(listing.distanceKm)}</span>
              <span aria-hidden>·</span>
            </>
          ) : listing.city ? (
            <>
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">
                {listing.area ? `${listing.area}, ` : ""}
                {listing.city}
              </span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span className="whitespace-nowrap">
            {formatDistanceToNow(listing.createdAt, { addSuffix: true })}
          </span>
        </p>
      </div>
    </Link>
  );
}
