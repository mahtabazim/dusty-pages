"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Profile is intentionally absent: it lives behind the avatar in the top bar.
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle, highlight: true },
  { href: "/chats", label: "Chats", icon: MessageCircle },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // Hide inside an open conversation so the message input sits at the bottom.
  if (pathname.startsWith("/chats/") || pathname.startsWith("/admin")) {
    return null;
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon, ...rest }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const highlight = "highlight" in rest && rest.highlight;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                active ? "text-primary font-medium" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn("size-5", highlight && "size-6 text-primary")}
                strokeWidth={active ? 2.4 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
