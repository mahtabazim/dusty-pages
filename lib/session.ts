import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Server-side session lookup (returns null when signed out). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Requires a signed-in user; redirects to /login otherwise. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.banned) redirect("/banned");
  return session;
}

/** Requires an admin; 404s the page for everyone else. */
export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "admin") redirect("/");
  return session;
}
