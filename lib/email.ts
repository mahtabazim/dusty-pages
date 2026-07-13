import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "DustyPages <onboarding@resend.dev>";

/**
 * Sends an email via Resend. When RESEND_API_KEY is not configured (local dev),
 * the email is logged to the server console instead so flows remain testable.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log(
      `[email:dev] to=${opts.to} subject="${opts.subject}"\n${opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`,
    );
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, ...opts });
  if (error) {
    console.error("[email] send failed:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendResetPasswordEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Reset your DustyPages password",
    html: `
      <h2>Password reset</h2>
      <p>Someone (hopefully you) asked to reset your DustyPages password.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#7c5c3e;color:#fff;border-radius:8px;text-decoration:none">Choose a new password</a></p>
      <p>If this wasn't you, you can ignore this email.</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Verify your DustyPages email",
    html: `
      <h2>Welcome to DustyPages</h2>
      <p>Confirm your email address to start listing and buying books.</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#7c5c3e;color:#fff;border-radius:8px;text-decoration:none">Verify email</a></p>
      <p>Or copy this link: ${url}</p>
    `,
  });
}
