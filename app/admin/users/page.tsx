import type { Metadata } from "next";
import { desc, eq, ilike, or } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { user, wallets } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserAdminActions } from "@/components/admin/user-admin-actions";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;

  const rows = await db
    .select({ u: user, balance: wallets.balance })
    .from(user)
    .leftJoin(wallets, eq(wallets.userId, user.id))
    .where(
      q ? or(ilike(user.name, `%${q}%`), ilike(user.email, `%${q}%`)) : undefined,
    )
    .orderBy(desc(user.createdAt))
    .limit(50);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <form>
        <Input name="q" placeholder="Search name or email…" defaultValue={q} className="max-w-sm" />
      </form>
      <div className="divide-y rounded-xl border bg-card">
        {rows.map(({ u, balance }) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar className="size-9">
              <AvatarImage src={u.image ?? undefined} />
              <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {u.name}
                {u.role === "admin" && <Badge variant="secondary">admin</Badge>}
                {u.banned && <Badge variant="destructive">banned</Badge>}
                {u.emailVerified && <Badge variant="outline">verified</Badge>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email} · {balance ?? 0} coins · joined {format(u.createdAt, "d MMM yyyy")}
              </p>
            </div>
            <UserAdminActions userId={u.id} banned={!!u.banned} />
          </div>
        ))}
      </div>
    </div>
  );
}
