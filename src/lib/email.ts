import { Resend } from "resend";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || "Task Board <noreply@example.com>";
}

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[Email] Verification link: ${getBaseUrl()}/auth/verify-email?token=${token}`,
    );
    return true;
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "Verify your email address",
      html: `
        <h2>Welcome to Task Board!</h2>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${getBaseUrl()}/auth/verify-email?token=${token}"
              style="display:inline-block;padding:12px 24px;background:#0079bf;color:white;text-decoration:none;border-radius:6px;">
          Verify Email
        </a></p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send verification email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.log(
      `[Email] Password reset link: ${getBaseUrl()}/auth/reset-password?token=${token}`,
    );
    return true;
  }

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: "Reset your password",
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${getBaseUrl()}/auth/reset-password?token=${token}"
              style="display:inline-block;padding:12px 24px;background:#0079bf;color:white;text-decoration:none;border-radius:6px;">
          Reset Password
        </a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("[Email] Failed to send reset email:", error);
    return false;
  }
}
