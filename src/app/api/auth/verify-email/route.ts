import { NextResponse } from "next/server";
import { consumeEmailToken, markEmailVerified } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required." },
        { status: 400 },
      );
    }

    const userId = await consumeEmailToken(token, "verify");
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired verification link." },
        { status: 400 },
      );
    }

    await markEmailVerified(userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[VerifyEmail]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
