"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coins,
  Heart,
  LogOut,
  Package,
  Search,
  Shield,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function UserMenu({
  name,
  email,
  image,
  isAdmin,
}: {
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label="Account menu" />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={image ?? undefined} />
          <AvatarFallback className="text-xs">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="truncate">{name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/me" />}>
            <User className="size-4" /> My profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/wallet" />}>
            <Coins className="size-4" /> Wallet
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/orders" />}>
            <Package className="size-4" /> Orders
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/favorites" />}>
            <Heart className="size-4" /> Favorites
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/saved-searches" />}>
            <Search className="size-4" /> Saved searches
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/admin" />}>
              <Shield className="size-4" /> Admin panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await authClient.signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
