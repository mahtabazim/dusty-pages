import Link from "next/link";
import Image from "next/image";
import { BookOpen, Coins, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geo";

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
      className="group overflow-hidden rounded-lg border bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-4/3 bg-muted">
        {listing.coverUrl ? (
          <Image
            src={listing.coverUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 180px"
            className="object-contain transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="size-8 text-muted-foreground/40" />
          </div>
        )}
        <Badge variant="secondary" className="absolute left-1.5 top-1.5 bg-card/90 text-[10px]">
          {CONDITION_LABELS[listing.condition] ?? listing.condition}
        </Badge>
      </div>
      <div className="space-y-0.5 p-2">
        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Coins className="size-3.5 text-amber-600 dark:text-amber-400" />
          {listing.priceCoins}
        </div>
        <p className="line-clamp-2 text-[13px] font-medium leading-snug">{listing.title}</p>
        {listing.author && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">{listing.author}</p>
        )}
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {listing.distanceKm != null ? (
            <>
              <MapPin className="size-3" />
              <span>{formatDistance(listing.distanceKm)}</span>
              <span aria-hidden>·</span>
            </>
          ) : listing.city ? (
            <>
              <MapPin className="size-3" />
              <span className="line-clamp-1">
                {listing.area ? `${listing.area}, ` : ""}
                {listing.city}
              </span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {formatDistanceToNow(listing.createdAt, { addSuffix: true })}
        </p>
      </div>
    </Link>
  );
}
