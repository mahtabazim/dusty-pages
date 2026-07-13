import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";

// Fraction of MRP a book is worth in coins by condition (1 coin ≈ ₹1).
const CONDITION_FACTOR: Record<string, number> = {
  new: 0.55,
  like_new: 0.45,
  good: 0.32,
  acceptable: 0.2,
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function roundToFive(n: number) {
  return Math.max(5, Math.round(n / 5) * 5);
}

/**
 * Suggests a coin price from the book's MRP, condition, and what comparable
 * copies (same ISBN, sold or active) are priced at. Comparables dominate when
 * available since they reflect real demand.
 */
export async function suggestPrice(opts: {
  isbn?: string | null;
  mrpInr?: number | null;
  condition: string;
}): Promise<{ suggested: number; low: number; high: number } | null> {
  const factor = CONDITION_FACTOR[opts.condition] ?? 0.3;

  let comparable: number | null = null;
  if (opts.isbn) {
    const rows = await db
      .select({ price: listings.priceCoins, status: listings.status })
      .from(listings)
      .where(and(eq(listings.isbn, opts.isbn), isNotNull(listings.priceCoins)))
      .limit(50);
    const sold = rows.filter((r) => r.status === "sold").map((r) => r.price);
    const active = rows.filter((r) => r.status === "active").map((r) => r.price);
    comparable = median(sold.length >= 2 ? sold : [...sold, ...active]);
  }

  const fromMrp = opts.mrpInr ? opts.mrpInr * factor : null;

  let base: number;
  if (comparable && fromMrp) base = comparable * 0.6 + fromMrp * 0.4;
  else if (comparable) base = comparable;
  else if (fromMrp) base = fromMrp;
  else return null; // nothing to go on; let the seller pick

  const suggested = roundToFive(Math.min(2000, base));
  return {
    suggested,
    low: roundToFive(suggested * 0.8),
    high: roundToFive(suggested * 1.2),
  };
}
