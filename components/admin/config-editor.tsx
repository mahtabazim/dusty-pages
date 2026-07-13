"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { updateConfig } from "@/app/admin/actions";
import type { ConfigKey } from "@/lib/config";
import { Spinner } from "@/components/ui/spinner";

export function ConfigRow({
  configKey,
  label,
  value,
}: {
  configKey: ConfigKey;
  label: string;
  value: number | boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  function save(next: number | boolean) {
    startTransition(async () => {
      const result = await updateConfig(configKey, next);
      if (result.error) toast.error(result.error);
      else toast.success(`${label} updated`);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{configKey}</p>
      </div>
      {typeof draft === "boolean" ? (
        <Switch
          checked={draft}
          disabled={pending}
          onCheckedChange={(checked) => {
            setDraft(checked);
            save(checked);
          }}
        />
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24 text-right"
            value={draft}
            min={0}
            onChange={(e) => setDraft(Number(e.target.value))}
          />
          <Button size="sm" variant="outline" disabled={pending || draft === value} onClick={() => save(draft)}>
            {pending ? <Spinner className="size-3.5" /> : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
