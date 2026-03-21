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

    const noMatchResponse = NextResponse.json({
      message:
        "If an account with that email exists, a reset link has been generated.",
    });

    if (!email) return noMatchResponse;

    const user = await getUserByEmail(email);
    if (!user) return noMatchResponse;

    const token = await createEmailToken(user.id, "reset");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;
    console.log(`[Password Reset] Link: ${resetLink}`);

    return NextResponse.json({
      message: "Reset link generated.",
      resetLink,
    });
  } catch (error) {
    console.error("[ForgotPassword]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
