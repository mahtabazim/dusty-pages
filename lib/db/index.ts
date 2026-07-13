import { drizzle } from "drizzle-orm/neon-serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// WebSocket driver (not neon-http): the coin ledger and escrow flows need
// interactive transactions, which the HTTP driver does not support.
export const db = drizzle({ connection: process.env.DATABASE_URL });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
