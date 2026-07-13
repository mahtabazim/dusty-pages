"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { BookOpen, Coins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryIcon } from "@/components/icons";
import { updateListing } from "@/app/listing/actions";

type Category = { slug: string; name: string };

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "acceptable", label: "Acceptable" },
];

export function EditListingForm({
  listingId,
  categories,
  initial,
}: {
  listingId: string;
  categories: Category[];
  initial: {
    title: string;
    author: string;
    language: string;
    categorySlug: string;
    condition: string;
    description: string;
    coverUrl: string | null;
    priceCoins: number;
    city: string;
    area: string;
  };
}) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function replaceCover(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("folder", "covers");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm((f) => ({ ...f, coverUrl: data.url }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateListing(listingId, {
            title: form.title,
            author: form.author || undefined,
            language: form.language,
            categorySlug: form.categorySlug,
            condition: form.condition as "new" | "like_new" | "good" | "acceptable",
            description: form.description || undefined,
            coverUrl: form.coverUrl ?? undefined,
            priceCoins: form.priceCoins,
            city: form.city || undefined,
            area: form.area || undefined,
          });
          if (result?.error) toast.error(result.error);
        });
      }}
    >
      <div className="flex gap-4">
        <div className="relative aspect-3/4 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {form.coverUrl ? (
            <Image src={form.coverUrl} alt="Cover" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="size-7 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-1.5">
          <Label
            htmlFor="edit-cover"
            className="cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium hover:bg-accent"
          >
            {uploading ? <Spinner className="mx-auto" /> : "Replace photo"}
          </Label>
          <input
            id="edit-cover"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) replaceCover(f);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="e-title">Title</Label>
        <Input
          id="e-title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="e-author">Author</Label>
          <Input
            id="e-author"
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-language">Language</Label>
          <Input
            id="e-language"
            required
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <ToggleGroup
          variant="outline"
          size="sm"
          className="flex-wrap"
          value={[form.categorySlug]}
          onValueChange={(value) => {
            const next = value.at(-1);
            if (typeof next === "string") setForm((f) => ({ ...f, categorySlug: next }));
          }}
        >
          {categories.map((c) => (
            <ToggleGroupItem key={c.slug} value={c.slug}>
              <CategoryIcon slug={c.slug} />
              {c.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <Label>Condition</Label>
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[form.condition]}
          onValueChange={(value) => {
            const next = value.at(-1);
            if (typeof next === "string") setForm((f) => ({ ...f, condition: next }));
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
        <Label htmlFor="e-description">Description</Label>
        <Textarea
          id="e-description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="e-price">Price (coins)</Label>
          <div className="relative">
            <Coins className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-amber-600" />
            <Input
              id="e-price"
              type="number"
              min={1}
              max={10000}
              required
              className="pl-8"
              value={form.priceCoins}
              onChange={(e) => setForm((f) => ({ ...f, priceCoins: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-city">City</Label>
          <Input
            id="e-city"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-area">Area</Label>
          <Input
            id="e-area"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending || !form.categorySlug}>
        {pending && <Spinner />}
        Save changes
      </Button>
    </form>
  );
}
