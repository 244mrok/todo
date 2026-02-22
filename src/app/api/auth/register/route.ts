import { NextResponse } from "next/server";
import { createUser, getUserByEmail, hashPassword } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`register:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, name);

    await createSessionCookie(user.id, user.email);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[Register]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
