import Link from "next/link";
import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import {
  Bell,
  Coins,
  MessageCircle,
  PlusCircle,
  Search,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { conversations, messages, notifications, wallets } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMenu } from "@/components/user-menu";
import { RealtimeListener } from "@/components/realtime-listener";

export async function TopBar() {
  const session = await getSession();

  let balance = 0;
  let unreadNotifications = 0;
  let unreadMessages = 0;
  if (session) {
    const me = session.user.id;
    const [[wallet], [notif], [msgs]] = await Promise.all([
      db
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.userId, me)),
      db
        .select({ total: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, me), isNull(notifications.readAt))),
      db
        .select({ total: count() })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            or(eq(conversations.buyerId, me), eq(conversations.sellerId, me)),
            ne(messages.senderId, me),
            isNull(messages.readAt),
          ),
        ),
    ]);
    balance = wallet?.balance ?? 0;
    unreadNotifications = notif.total;
    unreadMessages = msgs.total;
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
      {session && <RealtimeListener userId={session.user.id} />}
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="size-6 text-primary" />
          <span className="text-lg tracking-tight">DustyPages</span>
        </Link>

        {/* Desktop search bar */}
        <form
          action="/search"
          className="mx-8 hidden flex-1 justify-center md:flex"
          role="search"
        >
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search books, authors or ISBN…"
              className="h-9 w-full rounded-full pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          {session ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="hidden md:inline-flex"
                render={<Link href="/sell" />}
              >
                <PlusCircle className="size-4" />
                Sell a book
              </Button>
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/wallet" aria-label={`Wallet: ${balance} coins`} />}
              >
                <Coins className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold">{balance}</span>
              </Button>
              {/* Desktop-only chat icon; mobile uses the bottom nav */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="relative hidden md:inline-flex"
                render={<Link href="/chats" aria-label="Chats" />}
              >
                <MessageCircle className="size-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="relative"
                render={<Link href="/notifications" aria-label="Notifications" />}
              >
                <Bell className="size-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Button>
              <UserMenu
                name={session.user.name}
                email={session.user.email}
                image={session.user.image ?? null}
                isAdmin={session.user.role === "admin"}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Log in
              </Button>
              <Button size="sm" render={<Link href="/signup" />}>
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
