import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email"];
const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/verify-email"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isPublicApiPath(pathname: string): boolean {
  return AUTH_API_PATHS.some((p) => pathname.startsWith(p));
}

function isValidJwt(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode payload to check expiration
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;

    // We can't fully verify the signature in edge runtime without crypto libs,
    // but the API routes do full verification via getSession().
    // Middleware just checks token structure and expiry for routing decisions.
    return !!payload.userId;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;
  const isAuthenticated = token ? isValidJwt(token) : false;

  // Public API routes — allow through
  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  // Protected API routes — require auth
  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Auth pages — redirect to home if already logged in
  if (isPublicPath(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Protected pages — redirect to login if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
