"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CategoryIcon } from "@/components/icons";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Category = { slug: string; name: string };
type Params = Record<string, string | undefined>;

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "nearest", label: "Nearest" },
  { value: "price_asc", label: "Lowest price" },
  { value: "popular", label: "Most popular" },
];

const CONDITIONS = [
  { value: "any", label: "Any" },
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "acceptable", label: "Acceptable" },
];

/** Single-select ToggleGroup facet backed by a string draft value. */
function Facet({
  options,
  value,
  fallback,
  onChange,
}: {
  options: { value: string; label: React.ReactNode }[];
  value: string;
  fallback: string;
  onChange: (next: string) => void;
}) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      className="flex-wrap"
      value={[value || fallback]}
      onValueChange={(next) => {
        const picked = next.at(-1);
        if (typeof picked === "string") onChange(picked);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function SearchFilters({
  categories,
  initial,
}: {
  categories: Category[];
  initial: Params;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Params>(initial);

  function apply(next: Params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
    }
    setOpen(false);
    router.push(`/search?${query.toString()}`);
  }

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply(draft);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft.q ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            placeholder="Title, author or ISBN…"
            className="pl-9"
          />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button type="button" variant="outline" size="icon-lg" />}>
            <SlidersHorizontal className="size-4" />
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto md:mx-auto md:max-w-2xl">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Facet
                  value={draft.category ?? ""}
                  fallback="all"
                  onChange={(next) =>
                    setDraft((d) => ({ ...d, category: next === "all" ? undefined : next }))
                  }
                  options={[
                    { value: "all", label: "All" },
                    ...categories.map((c) => ({
                      value: c.slug,
                      label: (
                        <>
                          <CategoryIcon slug={c.slug} />
                          {c.name}
                        </>
                      ),
                    })),
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="min">Min coins</Label>
                  <Input
                    id="min"
                    type="number"
                    min={0}
                    value={draft.min ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Max coins</Label>
                  <Input
                    id="max"
                    type="number"
                    min={0}
                    value={draft.max ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Facet
                  value={draft.condition ?? ""}
                  fallback="any"
                  onChange={(next) =>
                    setDraft((d) => ({ ...d, condition: next === "any" ? undefined : next }))
                  }
                  options={CONDITIONS}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Input
                    id="language"
                    placeholder="Any"
                    value={draft.language ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Any"
                    value={draft.city ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sort by</Label>
                <Facet
                  value={draft.sort ?? ""}
                  fallback="newest"
                  onChange={(next) =>
                    setDraft((d) => ({ ...d, sort: next === "newest" ? undefined : next }))
                  }
                  options={SORTS}
                />
              </div>
            </div>
            <SheetFooter>
              <Button onClick={() => apply(draft)}>Apply filters</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft({});
                  apply({});
                }}
              >
                Clear all
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </form>
    </div>
  );
}
