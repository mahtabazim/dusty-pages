# 📚 BookBarter (dusty-pages)

An OLX-style, mobile-first marketplace **exclusively for used books**, powered by a
closed-loop, **earn-only coin economy**. Users earn coins by selling books, daily
activity, reviews, and referrals — then spend them buying books from other readers.
No real money in v1; fulfillment is **local meetup only** with QR-confirmed handover
and coin escrow.

## Stack

- **Next.js 16** (App Router, Turbopack) — web app, API routes, and admin panel; installable as a PWA
- **Neon Postgres + Drizzle ORM v1** — double-entry coin ledger with interactive transactions (WebSocket driver)
- **Better Auth** — email/password with mandatory email verification for sellers + Google sign-in
- **Pusher Channels** — realtime chat and offers (falls back to polling when unconfigured)
- **Cloudinary** — cover photos, chat images, dispute evidence (falls back to `public/uploads` in dev)
- **Resend** — verification and notification emails (logs to console when unconfigured)
- **@zxing/browser + qrcode** — ISBN barcode scanning and the handover QR
- Tailwind v4 + shadcn/ui (Base UI), React Query, date-fns, Zod

## Getting started

```bash
npm install            # .npmrc already sets legacy-peer-deps
cp .env.example .env   # then fill in at least DATABASE_URL (Neon)
npx drizzle-kit push   # create tables
npx tsx scripts/seed.ts  # categories, badges, default config
npm run dev
```

Only `DATABASE_URL` and `BETTER_AUTH_SECRET` are required to run. Google/Pusher/
Cloudinary/Resend keys unlock their features when added — everything degrades
gracefully without them.

To make a user an admin: `update "user" set role = 'admin' where email = '…';`

### Scheduled maintenance

Point a scheduler (Vercel Cron, GitHub Actions, `curl` in crontab) at
`GET /api/cron/maintenance` (with `Authorization: Bearer $CRON_SECRET` if set).
It auto-releases overdue escrow, expires listings after 60 days, and sends
renewal reminders.

## Coin economy design

- `coin_ledger` is **double-entry**: every business event writes a group of rows
  sharing a `tx_group_id` that sums to zero; a virtual *system* account absorbs
  mints (bonuses) and burns (future commission). `wallets` caches balances and is
  updated in the same transaction.
- **Escrow**: buying moves coins `available → escrow`; the buyer's QR scan (or
  tap-confirm, or auto-release after N days) releases them to the seller.
  Cancellation or dispute refund returns them instantly.
- **Earning**: signup bonus, sale proceeds, first listing, daily login streaks,
  book reviews, referrals (credited only after the referee's first completed
  trade). All amounts, caps, and windows are editable in **Admin → Config**.

## Monetization (built, switched off)

- **Commission % per sale** (`commission_percent`, default 0) — deducted from the
  seller's escrow release as a `COMMISSION` ledger burn once an admin raises it.
- **Coin packs** (`coin_packs_enabled`, default false) — pack CRUD exists in
  Admin → Monetization and the `PURCHASE_PACK` ledger type is reserved; selling
  them additionally requires wiring a payment gateway (Razorpay/Stripe).

## Key directories

| Path | What lives there |
|---|---|
| `lib/db/schema.ts` | Full marketplace schema (auth tables in `auth-schema.ts`) |
| `lib/coins/ledger.ts` | Double-entry ledger: bonuses, escrow hold/release/refund/split |
| `lib/orders.ts` | Order lifecycle: create, complete, cancel, dispute resolution |
| `lib/config.ts` | Admin-tunable defaults (`CONFIG_DEFAULTS`) |
| `app/admin/` | Web admin: dashboard, users, reports, disputes, config, audit |
| `app/api/cron/maintenance` | Escrow auto-release + listing expiry |
