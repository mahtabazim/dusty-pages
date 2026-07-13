import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { Flag } from "lucide-react";
import { db } from "@/lib/db";
import { reports, user } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { ReportAdminActions } from "@/components/admin/report-admin-actions";

export const metadata: Metadata = { title: "Admin · Reports" };

export default async function AdminReportsPage() {
  const rows = await db
    .select({ report: reports, reporter: { name: user.name } })
    .from(reports)
    .innerJoin(user, eq(reports.reporterId, user.id))
    .where(eq(reports.status, "open"))
    .orderBy(asc(reports.createdAt))
    .limit(100);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Flag className="size-5" /> Open reports ({rows.length})
      </h1>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          All clear — no open reports.
        </p>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {rows.map(({ report, reporter }) => (
            <div key={report.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{report.targetType}</Badge>
                <span className="text-sm font-medium">{report.reason}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format(report.createdAt, "d MMM, h:mm a")}
                </span>
              </div>
              {report.details && (
                <p className="text-sm text-muted-foreground">{report.details}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Reported by {reporter.name} ·{" "}
                {report.targetType === "listing" ? (
                  <Link
                    href={`/listing/${report.targetId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    view listing
                  </Link>
                ) : report.targetType === "user" ? (
                  <Link
                    href={`/seller/${report.targetId}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    view user
                  </Link>
                ) : (
                  report.targetId
                )}
              </p>
              <ReportAdminActions
                reportId={report.id}
                targetType={report.targetType}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
