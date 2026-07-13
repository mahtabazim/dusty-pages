import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage(props: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await props.searchParams;
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  return (
    <>
      <h1 className="mb-1 text-center text-xl font-semibold">Join DustyPages</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Sell books you&apos;ve finished, buy your next read with coins.
      </p>
      <SignupForm googleEnabled={googleEnabled} referralCode={ref} />
    </>
  );
}
