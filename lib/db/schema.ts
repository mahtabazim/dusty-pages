import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  date,
  doublePrecision,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const bookCondition = pgEnum("book_condition", [
  "new",
  "like_new",
  "good",
  "acceptable",
]);

export const listingStatus = pgEnum("listing_status", [
  "active",
  "reserved", // an order is in escrow
  "sold",
  "deactivated",
  "expired",
  "hidden", // auto-hidden by report threshold or admin, pending review
]);

// Double-entry ledger. Every business event writes a group of entries whose
// amounts sum to zero; the "system" account absorbs mints (bonuses) and burns
// (future commission). PURCHASE_PACK and COMMISSION are reserved for the
// deferred monetization switches.
export const ledgerType = pgEnum("ledger_type", [
  "EARN_SIGNUP",
  "EARN_SALE",
  "EARN_REFERRAL",
  "EARN_FIRST_LISTING",
  "EARN_DAILY_LOGIN",
  "EARN_REVIEW",
  "SPEND_PURCHASE",
  "ESCROW_HOLD",
  "ESCROW_RELEASE",
  "ESCROW_REFUND",
  "ADMIN_ADJUST",
  "PURCHASE_PACK",
  "COMMISSION",
]);

export const ledgerAccount = pgEnum("ledger_account", [
  "available", // spendable balance
  "escrow", // held for an in-flight order
  "system", // mint/burn counterparty (userId null)
]);

export const orderStatus = pgEnum("order_status", [
  "escrow_held",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
]);

export const offerStatus = pgEnum("offer_status", [
  "pending",
  "accepted",
  "rejected",
  "countered",
  "withdrawn",
  "expired",
]);

export const messageType = pgEnum("message_type", [
  "text",
  "image",
  "offer",
  "location",
  "system",
]);

export const reportStatus = pgEnum("report_status", [
  "open",
  "reviewed",
  "dismissed",
  "actioned",
]);

export const disputeStatus = pgEnum("dispute_status", [
  "open",
  "resolved_release", // coins to seller
  "resolved_refund", // coins back to buyer
  "resolved_split",
]);

export const referralStatus = pgEnum("referral_status", [
  "pending",
  "credited",
  "rejected", // abuse detected
]);

/* ------------------------------------------------------------------ */
/* Catalog & listings                                                  */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    author: text("author"),
    isbn: text("isbn"),
    publisher: text("publisher"),
    publishedYear: integer("published_year"),
    edition: text("edition"),
    language: text("language").notNull().default("English"),
    categorySlug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    condition: bookCondition("condition").notNull(),
    description: text("description"),
    coverUrl: text("cover_url"),
    coverSource: text("cover_source").notNull().default("api"), // api | upload
    mrpInr: integer("mrp_inr"), // original printed price, for AI price suggestion
    priceCoins: integer("price_coins").notNull(),
    status: listingStatus("status").notNull().default("active"),
    city: text("city"),
    area: text("area"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    viewCount: integer("view_count").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    renewalReminderSentAt: timestamp("renewal_reminder_sent_at"),
    soldAt: timestamp("sold_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("listings_status_created_idx").on(t.status, t.createdAt),
    index("listings_seller_idx").on(t.sellerId),
    index("listings_category_idx").on(t.categorySlug),
    index("listings_city_idx").on(t.city),
    index("listings_isbn_idx").on(t.isbn),
  ],
);

/* ------------------------------------------------------------------ */
/* Coin economy                                                        */
/* ------------------------------------------------------------------ */

// Cached balances; the ledger is the source of truth. Updated in the same
// transaction as every ledger write.
export const wallets = pgTable("wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  escrowHeld: integer("escrow_held").notNull().default(0),
  // Slot for future purchased-coin accounting (coin packs); always 0 in v1.
  purchasedTotal: integer("purchased_total").notNull().default(0),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const coinLedger = pgTable(
  "coin_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Entries created by one business event share a txGroupId and sum to 0.
    txGroupId: uuid("tx_group_id").notNull(),
    userId: text("user_id").references(() => user.id), // null = system account
    account: ledgerAccount("account").notNull(),
    type: ledgerType("type").notNull(),
    amount: integer("amount").notNull(), // positive credit, negative debit
    orderId: uuid("order_id"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ledger_user_created_idx").on(t.userId, t.createdAt),
    index("ledger_tx_group_idx").on(t.txGroupId),
    index("ledger_order_idx").on(t.orderId),
  ],
);

// Daily earn tracking for caps and login streaks.
export const dailyEarnings = pgTable(
  "daily_earnings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    coinsEarned: integer("coins_earned").notNull().default(0),
    loginBonusClaimed: boolean("login_bonus_claimed").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: text("referrer_id")
      .notNull()
      .references(() => user.id),
    refereeId: text("referee_id")
      .notNull()
      .references(() => user.id),
    status: referralStatus("status").notNull().default("pending"),
    signupIp: text("signup_ip"),
    deviceHash: text("device_hash"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    creditedAt: timestamp("credited_at"),
  },
  (t) => [
    uniqueIndex("referrals_referee_idx").on(t.refereeId),
    index("referrals_referrer_idx").on(t.referrerId),
  ],
);

/* ------------------------------------------------------------------ */
/* Orders, escrow & disputes                                           */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id),
    priceCoins: integer("price_coins").notNull(),
    // Commission actually charged at completion (0 while commission_percent=0).
    commissionCoins: integer("commission_coins").notNull().default(0),
    status: orderStatus("status").notNull().default("escrow_held"),
    // Secret embedded in the seller's handover QR; buyer scan confirms receipt.
    handoverToken: uuid("handover_token").notNull().defaultRandom(),
    autoReleaseAt: timestamp("auto_release_at").notNull(),
    disputeWindowEndsAt: timestamp("dispute_window_ends_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: text("cancelled_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("orders_buyer_idx").on(t.buyerId),
    index("orders_seller_idx").on(t.sellerId),
    index("orders_listing_idx").on(t.listingId),
    index("orders_status_release_idx").on(t.status, t.autoReleaseAt),
  ],
);

export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    raisedById: text("raised_by_id")
      .notNull()
      .references(() => user.id),
    reason: text("reason").notNull(),
    details: text("details"),
    evidenceUrls: jsonb("evidence_urls").$type<string[]>().default([]),
    status: disputeStatus("status").notNull().default("open"),
    resolutionNote: text("resolution_note"),
    resolvedById: text("resolved_by_id").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [uniqueIndex("disputes_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------ */
/* Chat & offers                                                       */
/* ------------------------------------------------------------------ */

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("conversations_listing_buyer_idx").on(t.listingId, t.buyerId),
    index("conversations_buyer_idx").on(t.buyerId),
    index("conversations_seller_idx").on(t.sellerId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: messageType("type").notNull().default("text"),
    body: text("body"),
    imageUrl: text("image_url"),
    offerId: uuid("offer_id"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("messages_conversation_created_idx").on(t.conversationId, t.createdAt)],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    // The user making this offer: buyer for offers, seller for counters.
    offererId: text("offerer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountCoins: integer("amount_coins").notNull(),
    status: offerStatus("status").notNull().default("pending"),
    parentOfferId: uuid("parent_offer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
  },
  (t) => [
    index("offers_listing_idx").on(t.listingId),
    index("offers_conversation_idx").on(t.conversationId),
  ],
);

export const blockedUsers = pgTable(
  "blocked_users",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

/* ------------------------------------------------------------------ */
/* Social: ratings, follows, wishlist, saved searches, book reviews    */
/* ------------------------------------------------------------------ */

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    raterId: text("rater_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rateeId: text("ratee_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stars: integer("stars").notNull(), // 1..5, validated in app code
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ratings_order_rater_idx").on(t.orderId, t.raterId),
    index("ratings_ratee_idx").on(t.rateeId),
  ],
);

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followedId: text("followed_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followedId] }),
    index("follows_followed_idx").on(t.followedId),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.listingId] }),
    index("favorites_listing_idx").on(t.listingId),
  ],
);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    query: text("query"),
    filters: jsonb("filters").$type<Record<string, unknown>>().default({}),
    notify: boolean("notify").notNull().default(true),
    lastNotifiedAt: timestamp("last_notified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)],
);

// Community book reviews (on the book, shown on listings with same ISBN).
export const bookReviews = pgTable(
  "book_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    isbn: text("isbn"),
    bookTitle: text("book_title").notNull(),
    stars: integer("stars").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("book_reviews_isbn_idx").on(t.isbn), index("book_reviews_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Trust & safety                                                      */
/* ------------------------------------------------------------------ */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // listing | user | message
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(), // category slug from config
    details: text("details"),
    status: reportStatus("status").notNull().default("open"),
    reviewedById: text("reviewed_by_id").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("reports_target_idx").on(t.targetType, t.targetId),
    index("reports_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Notifications & gamification                                        */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // message | offer | order | coins | system | ...
    title: text("title").notNull(),
    body: text("body"),
    url: text("url"), // in-app destination
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.readAt, t.createdAt)],
);

export const badges = pgTable("badges", {
  code: text("code").primaryKey(), // first_sale, ten_books_sold, genre_explorer
  name: text("name").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji"),
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeCode: text("badge_code")
      .notNull()
      .references(() => badges.code, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeCode] })],
);

/* ------------------------------------------------------------------ */
/* Admin: config, audit, monetization switches, banners                */
/* ------------------------------------------------------------------ */

// Single source of admin-tunable values (bonus amounts, caps, escrow windows,
// commission percent, feature flags). Values are JSON for flexibility.
export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedById: text("updated_by_id").references(() => user.id),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Future monetization: coin packs, inactive until the feature flag is enabled
// and a payment gateway is plugged in.
export const coinPacks = pgTable("coin_packs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  coins: integer("coins").notNull(),
  priceInrPaise: integer("price_inr_paise").notNull(),
  active: boolean("active").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  imageUrl: text("image_url"),
  url: text("url"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin/moderation action trail. Coin movements are fully audited by
// coin_ledger itself; this covers everything else.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);
