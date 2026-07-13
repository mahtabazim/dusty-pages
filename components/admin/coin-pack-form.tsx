"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCoinPack } from "@/app/admin/pack-actions";
import { Spinner } from "@/components/ui/spinner";

export function CoinPackForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [coins, setCoins] = useState("");
  const [priceInr, setPriceInr] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed bg-card px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await createCoinPack({
            name,
            coins: Number(coins),
            priceInr: Number(priceInr),
          });
          if (result.error) toast.error(result.error);
          else {
            toast.success("Coin pack created (inactive)");
            setName("");
            setCoins("");
            setPriceInr("");
            router.refresh();
          }
        });
      }}
    >
      <Input
        placeholder="Pack name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-36"
        required
      />
      <Input
        placeholder="Coins"
        type="number"
        min={1}
        value={coins}
        onChange={(e) => setCoins(e.target.value)}
        className="w-24"
        required
      />
      <Input
        placeholder="Price ₹"
        type="number"
        min={1}
        step="0.01"
        value={priceInr}
        onChange={(e) => setPriceInr(e.target.value)}
        className="w-24"
        required
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Spinner /> : <Plus className="size-4" />}
        Add pack
      </Button>
    </form>
  );
}
