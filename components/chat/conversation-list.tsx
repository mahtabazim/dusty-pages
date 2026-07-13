"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BookOpen, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type ConversationRow = {
  id: string;
  listingTitle: string;
  listingCoverUrl: string | null;
  otherName: string;
  otherImage: string | null;
  unread: number;
  lastBody: string | null;
  lastMessageAt: Date;
};

export function ConversationList({ rows }: { rows: ConversationRow[] }) {
  const pathname = usePathname();

  return (
    <div className="px-4 py-4 md:px-0 md:py-0">
      <h1 className="mb-3 text-xl font-semibold md:border-b md:px-4 md:py-3 md:text-base md:font-semibold md:mb-0">
        Chats
      </h1>
      {rows.length === 0 ? (
        <Empty className="border py-16 md:m-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircle />
            </EmptyMedia>
            <EmptyTitle>No conversations yet</EmptyTitle>
            <EmptyDescription>Find a book and say hi!</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y rounded-xl border bg-card md:rounded-none md:border-0">
          {rows.map((row) => {
            const active = pathname === `/chats/${row.id}`;
            return (
              <li key={row.id}>
                <Link
                  href={`/chats/${row.id}`}
                  className={cn(
                    "flex items-center gap-3 p-3 hover:bg-accent/50",
                    active && "md:bg-accent",
                  )}
                >
                  <Avatar className="size-11">
                    <AvatarImage src={row.otherImage ?? undefined} />
                    <AvatarFallback>
                      {row.otherName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{row.otherName}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(row.lastMessageAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <BookOpen className="size-3 shrink-0" />
                      <span className="truncate">{row.listingTitle}</span>
                    </p>
                    {row.lastBody && (
                      <p className="truncate text-xs text-muted-foreground">
                        {row.lastBody}
                      </p>
                    )}
                  </div>
                  {row.unread > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {row.unread}
                    </span>
                  )}
                  <div className="relative aspect-3/4 w-9 shrink-0 overflow-hidden rounded bg-muted">
                    {row.listingCoverUrl ? (
                      <Image
                        src={row.listingCoverUrl}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="size-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
