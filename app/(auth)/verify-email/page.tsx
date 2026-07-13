import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <div className="space-y-4 text-center">
      <MailCheck className="mx-auto size-12 text-primary" />
      <h1 className="text-xl font-semibold">Check your inbox</h1>
      <p className="text-sm text-muted-foreground">
        We sent you a verification link. You can browse books right away —
        verifying your email unlocks listing books for sale.
      </p>
      <Button className="w-full" render={<Link href="/" />}>
Start browsing
</Button>
    </div>
  );
}
