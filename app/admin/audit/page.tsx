import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { auditLog, coinLedger, user } from "@/lib/db/schema";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Admin · Audit log" };

export default async function AdminAuditPage() {
  const [adminActions, ledger] = await Promise.all([
    db
      .select({ entry: auditLog, actor: { name: user.name } })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.actorId, user.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(100),
    db
      .select({ entry: coinLedger, holder: { name: user.name } })
      .from(coinLedger)
      .leftJoin(user, eq(coinLedger.userId, user.id))
      .orderBy(desc(coinLedger.createdAt))
      .limit(200),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <ScrollText className="size-5" /> Audit log
      </h1>
      <Tabs defaultValue="coins">
        <TabsList>
          <TabsTrigger value="coins">Coin ledger</TabsTrigger>
          <TabsTrigger value="admin">Admin actions</TabsTrigger>
        </TabsList>
        <TabsContent value="coins">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Group</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map(({ entry, holder }) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(entry.createdAt, "d MMM h:mm:ss a")}
                    </TableCell>
                    <TableCell>
                      {holder?.name ?? <Badge variant="outline">system</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.type}</TableCell>
                    <TableCell className="text-xs">{entry.account}</TableCell>
                    <TableCell
                      className={`text-right font-semibold ${entry.amount > 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {entry.txGroupId.slice(0, 8)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="admin">
          <div className="divide-y rounded-xl border bg-card">
            {adminActions.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No admin actions recorded yet.
              </p>
            )}
            {adminActions.map(({ entry, actor }) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{entry.action}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.targetType}:{entry.targetId?.slice(0, 8)}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {actor?.name} · {format(entry.createdAt, "d MMM h:mm a")}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
