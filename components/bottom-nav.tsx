"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Profile is intentionally absent: it lives behind the avatar in the top bar.
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/sell", label: "Sell", icon: PlusCircle },
  { href: "/chats", label: "Chats", icon: MessageCircle },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  // Hide inside an open conversation so the message input sits at the bottom.
  if (pathname.startsWith("/chats/") || pathname.startsWith("/admin")) {
    return null;
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex min-h-14 flex-col items-center justify-center gap-1 text-label transition-colors duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {/* Pill sits behind the icon and carries the active state, so the
                  target stays a full-height tap area while the affordance reads
                  as a compact indicator. */}
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200 ease-emphasized",
                  active
                    ? "bg-accent scale-100"
                    : "scale-90 bg-transparent group-active:bg-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
              </span>
              <span className={cn(active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
