"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/app/me/actions";

export function EditProfileDialog({
  initial,
}: {
  initial: { name: string; bio: string; city: string; area: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        // Best-effort reverse geocode to prefill city/area.
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=14`,
            { headers: { Accept: "application/json" } },
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address ?? {};
            setForm((f) => ({
              ...f,
              city: f.city || addr.city || addr.town || addr.village || addr.county || "",
              area: f.area || addr.suburb || addr.neighbourhood || addr.road || "",
            }));
          }
        } catch {
          // coordinates alone are still useful
        }
        setLocating(false);
        toast.success("Location captured — nearby books will be sorted by distance.");
      },
      () => {
        setLocating(false);
        toast.error("Could not get your location.");
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon-sm" aria-label="Edit profile" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-bio">Bio</Label>
            <Textarea
              id="p-bio"
              rows={2}
              placeholder="What do you love reading?"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-city">City</Label>
              <Input
                id="p-city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-area">Area</Label>
              <Input
                id="p-area"
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              />
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={locating} onClick={useMyLocation}>
            {locating ? <Spinner /> : <LocateFixed className="size-4" />}
            {coords ? "Location captured" : "Use my current location"}
          </Button>
        </div>
        <DialogFooter>
          <Button
            disabled={pending || form.name.trim().length < 2}
            onClick={() =>
              startTransition(async () => {
                const result = await updateProfile({
                  name: form.name.trim(),
                  bio: form.bio.trim() || undefined,
                  city: form.city.trim() || undefined,
                  area: form.area.trim() || undefined,
                  latitude: coords?.lat,
                  longitude: coords?.lng,
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Profile updated");
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            {pending && <Spinner />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
