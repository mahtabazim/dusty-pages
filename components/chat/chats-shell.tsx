"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * WhatsApp-style two-panel chats layout: conversation list on the left, the
 * open chat on the right. On mobile only one panel is visible at a time —
 * the list at /chats, the chat full-screen at /chats/[id].
 */
export function ChatsShell({
  list,
  children,
}: {
  list: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const chatOpen = /^\/chats\/[^/]+/.test(pathname);

  return (
    <div className="mx-auto w-full max-w-6xl md:h-[calc(100dvh-3.5rem)] md:px-4 md:py-4">
      <div className="md:flex md:h-full md:overflow-hidden md:rounded-xl md:border md:bg-card">
        <aside
          className={cn(
            "md:flex md:w-80 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r lg:w-96",
            chatOpen && "hidden",
          )}
        >
          {list}
        </aside>
        <div
          className={cn(
            "min-w-0 flex-1 flex-col",
            chatOpen
              ? "fixed inset-x-0 bottom-0 top-14 z-30 flex bg-background md:static md:bg-transparent"
              : "hidden md:flex",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
