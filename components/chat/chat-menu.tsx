"use client";

import { useTransition } from "react";
import { MoreVertical, ShieldBan, Flag } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { blockUser, reportUser } from "@/app/chats/actions";

export function ChatMenu({
  otherUserId,
  otherUserName,
}: {
  otherUserId: string;
  otherUserName: string;
}) {
  const [, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Chat options" />}
      >
        <MoreVertical className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            startTransition(async () => {
              await reportUser(otherUserId, "chat_abuse");
              toast.success(`${otherUserName} reported to moderators.`);
            })
          }
        >
          <Flag className="size-4" /> Report user
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            startTransition(async () => {
              await blockUser(otherUserId);
              toast.success(`${otherUserName} blocked.`);
            })
          }
        >
          <ShieldBan className="size-4" /> Block user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
