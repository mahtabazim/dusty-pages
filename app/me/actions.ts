"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";

const profileSchema = z.object({
  name: z.string().min(2).max(80),
  bio: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  area: z.string().max(120).optional(),
  image: z.string().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function updateProfile(
  input: z.infer<typeof profileSchema>,
): Promise<{ error?: string }> {
  const session = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile" };
  }
  await db.update(user).set(parsed.data).where(eq(user.id, session.user.id));
  revalidatePath("/me");
  return {};
}
