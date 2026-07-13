import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendResetPasswordEmail, sendVerificationEmail } from "@/lib/email";
import { onUserCreated } from "@/lib/coins/hooks";

const googleEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "DustyPages",
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Users may log in before verifying, but listing a book is gated on
    // emailVerified in the sell flow.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  user: {
    additionalFields: {
      bio: { type: "string", required: false },
      city: { type: "string", required: false },
      area: { type: "string", required: false },
      latitude: { type: "number", required: false },
      longitude: { type: "number", required: false },
      role: { type: "string", required: false, defaultValue: "user", input: false },
      banned: { type: "boolean", required: false, defaultValue: false, input: false },
      referralCode: { type: "string", required: false, input: false },
      referredBy: { type: "string", required: false },
      loginStreak: { type: "number", required: false, defaultValue: 0, input: false },
      lastActiveDate: { type: "string", required: false, input: false },
      fraudScore: { type: "number", required: false, defaultValue: 0, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await onUserCreated(user.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
