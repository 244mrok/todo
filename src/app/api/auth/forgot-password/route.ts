import { NextResponse } from "next/server";
import { getUserByEmail, createEmailToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const { email } = await req.json();

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });

    if (!email) return successResponse;

    const user = getUserByEmail(email);
    if (!user) return successResponse;

    const token = createEmailToken(user.id, "reset");
    await sendPasswordResetEmail(user.email, token);

    return successResponse;
  } catch (error) {
    console.error("[ForgotPassword]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
