"use client";

import { Copy, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReferralCard({ code }: { code: string }) {
  if (!code) return null;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${code}`;

  async function share() {
    const text = `Join me on DustyPages — buy & sell used books with coins, no money needed. Sign up with my code ${code} and we both earn bonus coins!`;
    if (navigator.share) {
      await navigator.share({ title: "DustyPages", text, url: link }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${text} ${link}`);
      toast.success("Invite copied to clipboard");
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Users className="size-4 text-primary" /> Invite friends
        </p>
        <p className="text-xs text-muted-foreground">
          Your code: <span className="font-mono font-semibold">{code}</span> — you
          both earn coins on their first trade.
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Copy referral code"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            toast.success("Code copied");
          }}
        >
          <Copy className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Share invite" onClick={share}>
          <Share2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
