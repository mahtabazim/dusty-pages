import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Average time (minutes) a seller takes to first reply to a buyer's opening
 * message, across their conversations. Null when there's no data yet.
 */
export async function getAvgResponseMinutes(sellerId: string): Promise<number | null> {
  const result = await db.execute(sql`
    select avg(extract(epoch from (s.first_seller - b.first_buyer))) / 60 as avg_minutes
    from conversations c
    cross join lateral (
      select min(created_at) as first_buyer
      from messages where conversation_id = c.id and sender_id = c.buyer_id
    ) b
    cross join lateral (
      select min(created_at) as first_seller
      from messages where conversation_id = c.id and sender_id = c.seller_id
    ) s
    where c.seller_id = ${sellerId}
      and b.first_buyer is not null
      and s.first_seller is not null
      and s.first_seller > b.first_buyer
  `);
  const rows = result.rows as { avg_minutes: string | null }[];
  const avg = rows[0]?.avg_minutes;
  return avg == null ? null : Number(avg);
}

export function formatResponseTime(minutes: number): string {
  if (minutes < 60) return "usually replies within an hour";
  if (minutes < 60 * 6) return "usually replies within a few hours";
  if (minutes < 60 * 24) return "usually replies within a day";
  return "may take over a day to reply";
}
