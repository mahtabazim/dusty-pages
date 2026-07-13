"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getPusherClient } from "@/lib/pusher-client";

type NotificationEvent = {
  type: string;
  title: string;
  body?: string;
  url?: string;
};

/**
 * Subscribes to the signed-in user's personal channel: shows an instant toast
 * for every notification and refreshes server components (bell badge, chat
 * list, wallet balance) with a short debounce.
 */
export function RealtimeListener({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let disposed = false;
    const channelName = `private-user-${userId}`;

    (async () => {
      const pusher = await getPusherClient();
      if (!pusher || disposed) return;
      const channel = pusher.subscribe(channelName);
      channel.bind("notification", (event: NotificationEvent) => {
        // Skip message toasts while the user is already inside that chat.
        const inThatChat =
          event.type === "message" &&
          event.url &&
          pathnameRef.current === event.url;
        if (!inThatChat) {
          toast(event.title, {
            description: event.body,
            action: event.url
              ? { label: "View", onClick: () => router.push(event.url!) }
              : undefined,
          });
        }
        // Debounced refresh keeps badges/lists in sync without hammering.
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => router.refresh(), 400);
      });
    })();

    return () => {
      disposed = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      getPusherClient().then((pusher) => pusher?.unsubscribe(channelName));
    };
  }, [userId, router]);

  return null;
}
