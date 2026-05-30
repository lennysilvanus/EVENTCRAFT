import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// L-5: Fail hard on missing JWT_SECRET in all environments, not just production
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set.");
}

const JWT_SECRET = process.env.JWT_SECRET;
const SECRET = new TextEncoder().encode(JWT_SECRET);

const PUBLIC_PATHS = ["/", "/login", "/register", "/invite", "/checkin", "/ticket", "/my-tickets", "/api/snippe/webhook", "/forgot-password", "/reset-password", "/terms", "/privacy", "/verify-email", "/api/auth/verify-email", "/suspended", "/explore", "/api/events/public", "/api/internal"];
const ADMIN_PATHS = ["/admin"];
const SECURITY_PATHS = ["/security"];

// H-5: Check the internal auth-status endpoint to catch revoked sessions.
// This adds one server-to-server call per page navigation but ensures a banned
// user is bounced within the same request rather than waiting for the JWT to expire.
// Only runs when INTERNAL_API_SECRET is set; without it the proxy falls back to
// the JWT status claim only (known gap — maximum exposure = JWT lifetime = 30d).
async function isSessionRevoked(userId: string, appUrl: string): Promise<boolean> {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  try {
    const res = await fetch(`${appUrl}/api/internal/auth-status?userId=${userId}`, {
      headers: { "x-internal-secret": secret },
      // No-store: we need a fresh answer every time
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json() as { active?: boolean };
    return data.active === false;
  } catch {
    return false; // fail open if internal endpoint is unreachable (avoid boot-loop)
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);

    // JWT status claim — fast check, may be stale until token expiry
    if (payload.status === "SUSPENDED" || payload.status === "BANNED") {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }

    // H-5: DB-backed revocation check (runs only when INTERNAL_API_SECRET is set)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    if (typeof payload.userId === "string" && await isSessionRevoked(payload.userId, appUrl)) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("token", "", { maxAge: 0 });
      return response;
    }

    const isAdmin = ADMIN_PATHS.some(p => pathname.startsWith(p));
    if (isAdmin && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const isSecurity = SECURITY_PATHS.some(p => pathname.startsWith(p));
    if (isSecurity && payload.role !== "SECURITY_ADMIN" && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("token", "", { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
