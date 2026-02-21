import { cookies } from "next/headers";
import { verifyJwt, signJwt, getUserById } from "./auth";
import type { AuthUser, JwtPayload } from "@/types/auth";

const COOKIE_NAME = "session";

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;
  return getUserById(session.userId);
}

export async function createSessionCookie(
  userId: string,
  email: string,
  rememberMe: boolean = false,
): Promise<void> {
  const expiresIn = rememberMe ? "30d" : "7d";
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  const token = signJwt({ userId, email }, expiresIn);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
