import Pusher from "pusher";

const configured =
  !!process.env.PUSHER_APP_ID &&
  !!process.env.NEXT_PUBLIC_PUSHER_KEY &&
  !!process.env.PUSHER_SECRET;

/** Server-side Pusher client; null when not configured (clients then poll). */
export const pusherServer = configured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap2",
      useTLS: true,
    })
  : null;

export function conversationChannel(conversationId: string) {
  return `private-conv-${conversationId}`;
}

/** Fire-and-forget event trigger; no-op when Pusher is not configured. */
export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown,
) {
  if (!pusherServer) return;
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (err) {
    console.error("[pusher] trigger failed:", err);
  }
}
