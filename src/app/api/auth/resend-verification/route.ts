import { NextResponse } from "next/server";
import { createEmailToken } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`resend:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 },
      );
    }

    const token = createEmailToken(user.id, "verify");
    await sendVerificationEmail(user.email, token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ResendVerification]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
