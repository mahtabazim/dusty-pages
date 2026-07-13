import type { Metadata } from "next";
import { ShieldBan } from "lucide-react";

export const metadata: Metadata = { title: "Account suspended" };

export default function BannedPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <ShieldBan className="size-12 text-destructive" />
      <h1 className="text-xl font-semibold">Account suspended</h1>
      <p className="text-sm text-muted-foreground">
        Your account was suspended for violating community guidelines. If you
        believe this is a mistake, contact support.
      </p>
    </main>
  );
}
