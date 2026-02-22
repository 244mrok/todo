import { NextResponse } from "next/server";
import { getUserByEmail, createEmailToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`forgot:${ip}`);
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

    const user = await getUserByEmail(email);
    if (!user) return successResponse;

    const token = await createEmailToken(user.id, "reset");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    console.log(`[Password Reset] Link: ${baseUrl}/auth/reset-password?token=${token}`);

    return successResponse;
  } catch (error) {
    console.error("[ForgotPassword]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
