"use client";

import { useOptimistic, useTransition } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/app/seller/actions";

export function FollowButton({
  sellerId,
  following,
}: {
  sellerId: string;
  following: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [isFollowing, setFollowing] = useOptimistic(following);

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setFollowing(!isFollowing);
          const result = await toggleFollow(sellerId);
          if (result.error) toast.error(result.error);
        })
      }
    >
      {isFollowing ? <UserMinus className="size-4" /> : <UserPlus className="size-4" />}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
