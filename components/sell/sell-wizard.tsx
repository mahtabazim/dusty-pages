"use client";

import { useActionState, useCallback, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Barcode, BookOpen, Camera, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IsbnScanner } from "./isbn-scanner";
import { createListing, type CreateListingState } from "@/app/sell/actions";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryIcon } from "@/components/icons";

type Category = { slug: string; name: string };

type BookDraft = {
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  publishedYear?: number;
  coverUrl?: string;
  coverSource: "api" | "upload";
  categorySlug?: string;
  language: string;
  mrpInr?: number;
};

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "acceptable", label: "Acceptable" },
] as const;

export function SellWizard({ categories }: { categories: Category[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [isbnInput, setIsbnInput] = useState("");
  const [draft, setDraft] = useState<BookDraft>({
    title: "",
    language: "English",
    coverSource: "api",
  });
  const [condition, setCondition] =
    useState<(typeof CONDITIONS)[number]["value"]>("good");
  const [suggestion, setSuggestion] = useState<{
    suggested: number;
    low: number;
    high: number;
  } | null>(null);
  const [state, formAction, pending] = useActionState<CreateListingState, FormData>(
    createListing,
    {},
  );

  const lookup = useCallback(async (isbn: string) => {
    setLooking(true);
    try {
      const res = await fetch(`/api/books/${isbn}`);
      if (!res.ok) {
        toast.info("Book not found — fill in the details manually.");
        setDraft((d) => ({ ...d, isbn }));
        setStep(2);
        return;
      }
      const meta = await res.json();
      setDraft({
        isbn: meta.isbn,
        title: meta.title,
        author: meta.authors?.join(", ") || undefined,
        publisher: meta.publisher ?? undefined,
        publishedYear: meta.publishedYear ?? undefined,
        coverUrl: meta.coverUrl ?? undefined,
        coverSource: "api",
        categorySlug: meta.categoryGuess ?? undefined,
        language: meta.language ?? "English",
        mrpInr: meta.mrpInr ?? undefined,
      });
      if (meta.pricing) setSuggestion(meta.pricing);
      toast.success(`Found: ${meta.title}`);
      setStep(2);
    } finally {
      setLooking(false);
    }
  }, []);

  async function refreshSuggestion(cond: string) {
    if (!draft.isbn && !draft.mrpInr) return;
    const res = await fetch(
      `/api/books/${draft.isbn ?? "0000000000"}?condition=${cond}`,
    ).catch(() => null);
    if (res?.ok) {
      const meta = await res.json();
      if (meta.pricing) setSuggestion(meta.pricing);
    }
  }

  async function uploadCover(file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("folder", "covers");
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    setDraft((d) => ({ ...d, coverUrl: data.url, coverSource: "upload" }));
  }

  /* ---------------- Step 1: scan / enter ---------------- */
  if (step === 1) {
    return (
      <div className="space-y-6 md:grid md:grid-cols-2 md:items-stretch md:gap-10 md:space-y-0">
        {scanning && (
          <IsbnScanner
            onDetected={(isbn) => {
              setScanning(false);
              setIsbnInput(isbn);
              lookup(isbn);
            }}
            onClose={() => setScanning(false)}
          />
        )}
        <Button
          type="button"
          size="lg"
          className="h-auto w-full flex-col gap-2 py-6 md:h-full md:gap-3 md:py-16"
          onClick={() => setScanning(true)}
        >
          <Camera className="size-8 md:size-12" />
          Scan ISBN barcode
          <span className="text-xs font-normal opacity-80">
            Auto-fills title, author, cover & price
          </span>
        </Button>
        <div className="space-y-6 md:flex md:flex-col md:justify-center">
          <div className="flex items-center gap-3 text-xs text-muted-foreground md:hidden">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="isbn">Enter ISBN</Label>
            <div className="flex gap-2">
              <Input
                id="isbn"
                value={isbnInput}
                onChange={(e) => setIsbnInput(e.target.value)}
                placeholder="9780143333623"
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={looking || isbnInput.replace(/[^0-9Xx]/g, "").length < 10}
                onClick={() => lookup(isbnInput.replace(/[^0-9Xx]/g, ""))}
              >
                {looking ? <Spinner /> : <Barcode className="size-4" />}
                Look up
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setStep(2)}
          >
            <BookOpen className="size-4" />
            No ISBN? Enter details manually
          </Button>
        </div>
      </div>
    );
  }

  /* ---------------- Steps 2 & 3: one form, sections toggled ---------------- */
  return (
    <form action={formAction} className="space-y-5">
      {/* Keep step-2 values submitted even when step 3 is shown */}
      <input type="hidden" name="isbn" value={draft.isbn ?? ""} />
      <input type="hidden" name="coverUrl" value={draft.coverUrl ?? ""} />
      <input type="hidden" name="coverSource" value={draft.coverSource} />
      <input type="hidden" name="mrpInr" value={draft.mrpInr ?? ""} />
      <input type="hidden" name="condition" value={condition} />

      <div
        className={cn(
          step !== 2 && "hidden",
          "space-y-5 md:grid md:grid-cols-[300px_1fr] md:items-start md:gap-10 md:space-y-0",
        )}
      >
        <div className="flex gap-4 md:flex-col">
          <div className="relative aspect-3/4 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted md:w-full">
            {draft.coverUrl ? (
              <Image src={draft.coverUrl} alt="Cover" fill className="object-cover" sizes="112px" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="size-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-2 text-sm">
            <Label
              htmlFor="cover-upload"
              className="cursor-pointer rounded-lg border px-3 py-2 text-center font-medium hover:bg-accent"
            >
              {draft.coverUrl ? "Replace photo" : "Add a photo"}
            </Label>
            <input
              id="cover-upload"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCover(f);
              }}
            />
            <p className="text-xs text-muted-foreground">
              One cover photo — the fetched cover or your own shot of the actual book.
            </p>
          </div>
        </div>

        <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            required
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              name="author"
              value={draft.author ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language *</Label>
            <Input
              id="language"
              name="language"
              required
              value={draft.language}
              onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publisher">Publisher</Label>
            <Input
              id="publisher"
              name="publisher"
              value={draft.publisher ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, publisher: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edition">Edition</Label>
            <Input id="edition" name="edition" placeholder="e.g. 2nd, 2019" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <ToggleGroup
            variant="outline"
            size="sm"
            className="flex-wrap"
            value={draft.categorySlug ? [draft.categorySlug] : []}
            onValueChange={(value) => {
              const next = value.at(-1);
              if (typeof next === "string") {
                setDraft((d) => ({ ...d, categorySlug: next }));
              }
            }}
          >
            {categories.map((c) => (
              <ToggleGroupItem key={c.slug} value={c.slug}>
                <CategoryIcon slug={c.slug} />
                {c.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <input type="hidden" name="categorySlug" value={draft.categorySlug ?? ""} />
        </div>

        <div className="space-y-2">
          <Label>Condition *</Label>
          <ToggleGroup
            variant="outline"
            value={[condition]}
            onValueChange={(value) => {
              const next = value.at(-1);
              if (typeof next === "string") {
                setCondition(next as (typeof CONDITIONS)[number]["value"]);
                refreshSuggestion(next);
              }
            }}
          >
            {CONDITIONS.map((c) => (
              <ToggleGroupItem key={c.value} value={c.value}>
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Highlights, markings, missing pages, why you're selling…"
          />
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={!draft.title || !draft.categorySlug}
          onClick={() => setStep(3)}
        >
          Next: set your price
        </Button>
        </div>
      </div>

      <div
        className={cn(
          step !== 3 && "hidden",
          "space-y-5 md:grid md:grid-cols-2 md:items-start md:gap-x-10 md:gap-y-5 md:space-y-0",
        )}
      >
        {suggestion && (
          <Alert className="md:col-span-2">
            <Sparkles className="text-primary" />
            <AlertTitle>Suggested price: {suggestion.suggested} coins</AlertTitle>
            <AlertDescription>
              Similar copies in {condition.replace("_", " ")} condition go for{" "}
              {suggestion.low}–{suggestion.high} coins.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="priceCoins">Price in coins *</Label>
          <div className="relative">
            <Coins className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-600" />
            <Input
              id="priceCoins"
              name="priceCoins"
              type="number"
              min={1}
              max={10000}
              required
              defaultValue={suggestion?.suggested}
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" placeholder="Uses your profile city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Area</Label>
            <Input id="area" name="area" placeholder="e.g. Boring Road" />
          </div>
        </div>

        {state.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
            {state.error}
          </p>
        )}

        <div className="flex gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={() => setStep(2)}>
            Back
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? <Spinner /> : null}
            List my book
          </Button>
        </div>
      </div>
    </form>
  );
}
