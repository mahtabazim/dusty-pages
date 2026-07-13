import Link from "next/link";
import {
  Coins,
  Flag,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/reports", icon: Flag, label: "Reports" },
  { href: "/admin/disputes", icon: ShieldAlert, label: "Disputes" },
  { href: "/admin/config", icon: Settings, label: "Config" },
  { href: "/admin/monetization", icon: Coins, label: "Monetization" },
  { href: "/admin/audit", icon: ScrollText, label: "Audit log" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-52 shrink-0 border-r bg-card md:block">
        <Link href="/" className="flex items-center gap-2 border-b p-4 font-semibold">
          <Logo className="size-5 text-primary" /> DustyPages
        </Link>
        <nav className="space-y-0.5 p-2">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b bg-card p-2 md:hidden">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
