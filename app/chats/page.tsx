import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "Chats" };

/** Desktop right-panel placeholder; on mobile only the list is shown. */
export default function ChatsIndexPage() {
  return (
    <div className="hidden h-full items-center justify-center md:flex">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageCircle />
          </EmptyMedia>
          <EmptyTitle>Select a conversation</EmptyTitle>
          <EmptyDescription>
            Pick a chat from the list to see the messages here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
