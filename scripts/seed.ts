import "dotenv/config";
import { db } from "../lib/db";
import { appConfig, badges, categories } from "../lib/db/schema";
import { CONFIG_DEFAULTS } from "../lib/config";

const CATEGORIES = [
  { slug: "fiction", name: "Fiction", sortOrder: 1 },
  { slug: "non-fiction", name: "Non-fiction", sortOrder: 2 },
  { slug: "academic", name: "Academic / Textbooks", sortOrder: 3 },
  { slug: "competitive-exams", name: "Competitive Exams", sortOrder: 4 },
  { slug: "comics-manga", name: "Comics / Manga", sortOrder: 5 },
  { slug: "children", name: "Children's", sortOrder: 6 },
  { slug: "self-help", name: "Self-help", sortOrder: 7 },
  { slug: "hindi", name: "Hindi", sortOrder: 8 },
  { slug: "regional", name: "Regional Languages", sortOrder: 9 },
  { slug: "rare-collectible", name: "Rare / Collectible", sortOrder: 10 },
];

const BADGES = [
  { code: "first_listing", name: "First Listing", description: "Listed your first book" },
  { code: "first_sale", name: "First Sale", description: "Sold your first book" },
  { code: "ten_books_sold", name: "10 Books Sold", description: "Sold 10 books" },
  { code: "first_purchase", name: "First Purchase", description: "Bought your first book" },
  { code: "genre_explorer", name: "Genre Explorer", description: "Bought books from 5 different categories" },
  { code: "bookworm", name: "Bookworm", description: "Wrote 10 book reviews" },
  { code: "trusted_seller", name: "Trusted Seller", description: "Verified email and 3+ successful sales" },
];

async function main() {
  for (const c of CATEGORIES) {
    await db.insert(categories).values(c).onConflictDoNothing();
  }
  for (const b of BADGES) {
    await db.insert(badges).values(b).onConflictDoNothing();
  }
  for (const [key, value] of Object.entries(CONFIG_DEFAULTS)) {
    await db
      .insert(appConfig)
      .values({ key, value, description: `Default for ${key}` })
      .onConflictDoNothing();
  }
  console.log(
    `Seeded ${CATEGORIES.length} categories, ${BADGES.length} badges, ${Object.keys(CONFIG_DEFAULTS).length} config keys.`,
  );
}

main().then(() => process.exit(0));
