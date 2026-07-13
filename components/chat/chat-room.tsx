"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Coins, ImagePlus, MapPin, SendHorizonal, ShieldAlert, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { makeOffer, respondToOffer, sendMessage } from "@/app/chats/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getPusherClient } from "@/lib/pusher-client";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

type OfferData = {
  id: string;
  offererId: string;
  amountCoins: number;
  status: string;
} | null;

type MessageRow = {
  message: {
    id: string;
    senderId: string;
    type: "text" | "image" | "offer" | "location" | "system";
    body: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    createdAt: string;
  };
  offer: OfferData;
};

const QUICK_REPLIES = [
  "Is this available?",
  "Last price?",
  "Where can we meet?",
  "Can you share more photos?",
];

export function ChatRoom({
  conversationId,
  meId,
  isSeller,
  listingActive,
  listingPrice,
  pusherKey,
}: {
  conversationId: string;
  meId: string;
  isSeller: boolean;
  listingActive: boolean;
  listingPrice: number;
  pusherKey: string | null;
}) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didInitialScroll = useRef(false);
  const tempSeq = useRef(0);

  // Autofocus the composer on desktop (skipped on mobile: pops the keyboard).
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      inputRef.current?.focus();
    }
  }, [conversationId]);
  const [text, setText] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(listingPrice);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const queryKey = ["chat", conversationId];
  const { data, isLoading } = useQuery<MessageRow[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/chats/${conversationId}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      return (await res.json()).messages;
    },
    // Poll as a fallback; with Pusher connected we still poll slowly to heal
    // any missed events.
    refetchInterval: pusherKey ? 30_000 : 4_000,
  });

  /** Appends a row unless a message with the same id is already present. */
  const appendRow = useCallback(
    (row: MessageRow) => {
      queryClient.setQueryData<MessageRow[]>(queryKey, (rows = []) =>
        rows.some((r) => r.message.id === row.message.id) ? rows : [...rows, row],
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, queryClient],
  );

  // Realtime: incoming events are appended straight into the cache — no
  // refetch round-trip. System messages refetch to refresh offer statuses.
  useEffect(() => {
    let disposed = false;
    const channelName = `private-conv-${conversationId}`;
    (async () => {
      const pusher = await getPusherClient();
      if (!pusher || disposed) return;
      const channel = pusher.subscribe(channelName);
      channel.bind("message", (row: MessageRow) => {
        if (!row?.message) return;
        if (row.message.type === "system") {
          appendRow(row);
          queryClient.invalidateQueries({ queryKey });
          return;
        }
        // Own messages are handled optimistically at send time.
        if (row.message.senderId === meId) return;
        appendRow(row);
      });
    })();
    return () => {
      disposed = true;
      getPusherClient().then((pusher) => pusher?.unsubscribe(channelName));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, meId]);

  const messages = data ?? [];

  // First load jumps straight to the bottom; new messages scroll smoothly,
  // and only when the user is already near the bottom (don't yank them out
  // of reading history).
  useEffect(() => {
    if (messages.length === 0) return;
    const container = scrollRef.current;
    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      bottomRef.current?.scrollIntoView();
      return;
    }
    if (container) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom > 300) return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey });
  }

  function send(body: string) {
    if (!body.trim()) return;
    setText("");
    // Optimistic bubble: shows instantly, swapped for the real row on success.
    tempSeq.current += 1;
    const tempId = `temp-${tempSeq.current}`;
    appendRow({
      message: {
        id: tempId,
        senderId: meId,
        type: "text",
        body: body.trim(),
        imageUrl: null,
        latitude: null,
        longitude: null,
        createdAt: new Date().toISOString(),
      },
      offer: null,
    });
    startTransition(async () => {
      const result = await sendMessage({ conversationId, type: "text", body });
      queryClient.setQueryData<MessageRow[]>(queryKey, (rows = []) => {
        if (result.error || !result.message) {
          return rows.filter((r) => r.message.id !== tempId);
        }
        const real = result.message as unknown as MessageRow["message"];
        if (rows.some((r) => r.message.id === real.id)) {
          return rows.filter((r) => r.message.id !== tempId);
        }
        return rows.map((r) =>
          r.message.id === tempId ? { message: real, offer: null } : r,
        );
      });
      if (result.error) toast.error(result.error);
    });
  }

  async function sendImage(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", "chat");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      const result = await sendMessage({
        conversationId,
        type: "image",
        imageUrl: payload.url,
      });
      if (result.error) toast.error(result.error);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function shareLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        startTransition(async () => {
          const result = await sendMessage({
            conversationId,
            type: "location",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          if (result.error) toast.error(result.error);
          refresh();
        }),
      () => toast.error("Could not get your location."),
    );
  }

  return (
    <>
      {/* Safety banner */}
      <Alert className="rounded-none border-x-0 border-t-0">
        <ShieldAlert />
        <AlertDescription>
          Meet in a public place and inspect the book before confirming. Never
          share passwords or pay outside the app.
        </AlertDescription>
      </Alert>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/20 px-4 py-3">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Say hi and ask about the book!
          </p>
        )}
        {messages.map(({ message, offer }, index) => {
          const mine = message.senderId === meId;
          if (message.type === "system") {
            return (
              <p key={message.id} className="py-2 text-center text-xs text-muted-foreground">
                {message.body}
              </p>
            );
          }
          // Group consecutive messages from the same sender (within 5 min):
          // tighter spacing, one timestamp per group.
          const prev = messages[index - 1]?.message;
          const next = messages[index + 1]?.message;
          const groupGap = 5 * 60 * 1000;
          const groupedWithPrev =
            prev &&
            prev.type !== "system" &&
            prev.senderId === message.senderId &&
            +new Date(message.createdAt) - +new Date(prev.createdAt) < groupGap;
          const groupedWithNext =
            next &&
            next.type !== "system" &&
            next.senderId === message.senderId &&
            +new Date(next.createdAt) - +new Date(message.createdAt) < groupGap;
          const isTemp = message.id.startsWith("temp-");
          return (
            <div
              key={message.id}
              className={cn(
                "flex",
                mine ? "justify-end" : "justify-start",
                groupedWithPrev ? "mt-0.5" : "mt-3",
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine ? "bg-primary text-primary-foreground" : "bg-muted",
                  mine && !groupedWithNext && "rounded-br-md",
                  !mine && !groupedWithNext && "rounded-bl-md",
                  isTemp && "opacity-60",
                )}
              >
                {message.type === "text" && <p className="whitespace-pre-wrap">{message.body}</p>}
                {message.type === "image" && message.imageUrl && (
                  <Image
                    src={message.imageUrl}
                    alt="Shared photo"
                    width={240}
                    height={240}
                    className="max-h-60 w-auto rounded-lg"
                  />
                )}
                {message.type === "location" && message.latitude != null && (
                  <a
                    href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 underline underline-offset-2"
                  >
                    <MapPin className="size-4" /> Meetup location
                  </a>
                )}
                {message.type === "offer" && offer && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <Tag className="size-4" />
                      Offer: {offer.amountCoins} coins
                    </p>
                    {offer.status === "pending" && offer.offererId !== meId && (
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant={mine ? "secondary" : "default"}
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await respondToOffer(offer.id, "accepted");
                              if (result.error) toast.error(result.error);
                              else if (result.orderId) {
                                toast.success("Offer accepted — escrow created!");
                                window.location.href = `/orders/${result.orderId}`;
                              }
                              refresh();
                            })
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await respondToOffer(offer.id, "rejected");
                              if (result.error) toast.error(result.error);
                              refresh();
                            })
                          }
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                    {offer.status !== "pending" && (
                      <p className="text-xs opacity-80">({offer.status})</p>
                    )}
                  </div>
                )}
                {!groupedWithNext && (
                  <p
                    className={cn(
                      "mt-0.5 text-right text-[10px]",
                      mine ? "opacity-70" : "text-muted-foreground",
                    )}
                  >
                    {format(new Date(message.createdAt), "h:mm a")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies: only while the conversation is getting started */}
      {!isLoading && messages.length < 4 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-1.5">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => send(reply)}
              className="whitespace-nowrap rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="flex items-center gap-1.5 border-t bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <label className="cursor-pointer rounded-full p-2 hover:bg-accent" aria-label="Send photo">
          {uploading ? (
            <Spinner className="size-5 text-muted-foreground" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendImage(f);
            }}
          />
        </label>
        <button
          type="button"
          onClick={shareLocation}
          className="rounded-full p-2 hover:bg-accent"
          aria-label="Share location"
        >
          <MapPin className="size-5 text-muted-foreground" />
        </button>
        {!isSeller && listingActive && (
          <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
            <DialogTrigger
              render={
                <button
                  type="button"
                  className="rounded-full p-2 hover:bg-accent"
                  aria-label="Make an offer"
                />
              }
            >
              <Coins className="size-5 text-amber-600" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make a coin offer</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Input
                  type="number"
                  min={1}
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Listed at {listingPrice} coins. If the seller accepts, the
                  coins move to escrow immediately.
                </p>
              </div>
              <DialogFooter>
                <Button
                  disabled={pending || offerAmount < 1}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await makeOffer(conversationId, offerAmount);
                      if (result.error) toast.error(result.error);
                      else {
                        toast.success("Offer sent!");
                        setOfferOpen(false);
                      }
                      refresh();
                    })
                  }
                >
                  Send offer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <form
          className="flex flex-1 gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
          />
          <Button type="submit" size="icon-lg" disabled={pending || !text.trim()} aria-label="Send">
            <SendHorizonal className="size-5" />
          </Button>
        </form>
      </div>
    </>
  );
}
