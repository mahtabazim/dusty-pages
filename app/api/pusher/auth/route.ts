import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { pusherServer } from "@/lib/pusher";

/** Authorizes private conversation channels for their two participants only. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !pusherServer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = new URLSearchParams(await req.text());
  const socketId = body.get("socket_id");
  const channel = body.get("channel_name");
  if (!socketId || !channel) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Personal channel: notifications and badge updates for the signed-in user.
  const userMatch = channel.match(/^private-user-(.+)$/);
  if (userMatch) {
    if (userMatch[1] !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(pusherServer.authorizeChannel(socketId, channel));
  }

  // Conversation channel: only its two participants.
  const convMatch = channel.match(/^private-conv-([0-9a-f-]+)$/);
  if (!convMatch) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convMatch[1]));
  if (!conv || (conv.buyerId !== session.user.id && conv.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(pusherServer.authorizeChannel(socketId, channel));
}
