"use client";

import type Pusher from "pusher-js";

let client: Pusher | null = null;
let loading: Promise<Pusher> | null = null;

/**
 * Shared browser Pusher connection. Components subscribe/unsubscribe to their
 * own channels but reuse one socket, so navigation doesn't reconnect.
 */
export async function getPusherClient(): Promise<Pusher | null> {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;
  if (client) return client;
  if (!loading) {
    loading = import("pusher-js").then(({ default: PusherJs }) => {
      client = new PusherJs(key, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2",
        channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
      });
      return client;
    });
  }
  return loading;
}
