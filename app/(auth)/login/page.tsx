import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  const googleEnabled =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  return (
    <>
      <h1 className="mb-6 text-center text-xl font-semibold">Welcome back</h1>
      <LoginForm googleEnabled={googleEnabled} />
    </>
  );
}
