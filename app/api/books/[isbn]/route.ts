import { NextResponse } from "next/server";
import { lookupIsbn } from "@/lib/books";
import { suggestPrice } from "@/lib/pricing";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ isbn: string }> },
) {
  const { isbn } = await ctx.params;
  const meta = await lookupIsbn(isbn);
  if (!meta) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }
  const condition =
    new URL(req.url).searchParams.get("condition") ?? "good";
  const pricing = await suggestPrice({
    isbn: meta.isbn,
    mrpInr: meta.mrpInr,
    condition,
  }).catch(() => null);
  return NextResponse.json({ ...meta, pricing });
}
