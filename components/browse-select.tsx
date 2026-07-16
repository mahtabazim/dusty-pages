"use client";

import { useRouter } from "next/navigation";
import { Layers, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BrowseOption = { value: string; label: string };

/**
 * Replaces the old horizontally-scrolling category/collection rails. Each
 * select navigates to the matching /search query on change — the value is only
 * ever a destination, so there is no state to keep in sync with the URL.
 */
export function BrowseSelect({
  categories,
  collections,
}: {
  categories: BrowseOption[];
  collections: BrowseOption[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3 sm:flex-row sm:items-center sm:gap-2">
      <BrowsePicker
        icon={<Layers className="size-4 text-primary" />}
        label="Category"
        placeholder="Browse by category"
        options={categories}
        onSelect={(v) => router.push(`/search?category=${v}`)}
      />
      <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />
      <BrowsePicker
        icon={<Sparkles className="size-4 text-primary" />}
        label="Collection"
        placeholder="Jump to a collection"
        options={collections}
        onSelect={(v) => router.push(v)}
      />
    </div>
  );
}

function BrowsePicker({
  icon,
  label,
  placeholder,
  options,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  options: BrowseOption[];
  onSelect: (value: string) => void;
}) {
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));

  return (
    <Select
      items={items}
      value={null}
      onValueChange={(value) => {
        if (typeof value === "string") onSelect(value);
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="h-11 w-full rounded-xl border-transparent bg-surface-2 px-3 text-sm transition-colors hover:bg-surface-3 sm:flex-1"
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
