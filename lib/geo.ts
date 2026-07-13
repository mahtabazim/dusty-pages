import { sql, type SQL } from "drizzle-orm";
import { listings } from "@/lib/db/schema";

/** Great-circle distance in km between two coordinates. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * SQL expression: distance in km from the given point to a listing's
 * coordinates (NULL when the listing has none). Used for nearest sorting.
 */
export function listingDistanceKm(lat: number, lng: number): SQL<number | null> {
  return sql<number | null>`
    case when ${listings.latitude} is not null and ${listings.longitude} is not null then
      6371 * 2 * asin(sqrt(
        pow(sin(radians((${listings.latitude} - ${lat}) / 2)), 2) +
        cos(radians(${lat})) * cos(radians(${listings.latitude})) *
        pow(sin(radians((${listings.longitude} - ${lng}) / 2)), 2)
      ))
    else null end`;
}

export function formatDistance(km: number): string {
  if (km < 1) return "<1 km";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
