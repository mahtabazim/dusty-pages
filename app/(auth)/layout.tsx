import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-sm flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2">
        <Logo className="size-8 text-primary" />
        <span className="text-2xl font-semibold tracking-tight">DustyPages</span>
      </Link>
      {children}
    </main>
  );
}
