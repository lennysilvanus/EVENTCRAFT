import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET must be set in production");
  return "dev-only-secret-not-for-production";
})();
const SECRET = new TextEncoder().encode(JWT_SECRET);

const PUBLIC_PATHS = ["/", "/login", "/register", "/invite", "/checkin", "/ticket", "/my-tickets", "/api/snippe/webhook", "/forgot-password", "/reset-password", "/terms", "/privacy", "/verify-email", "/api/auth/verify-email", "/suspended"];
const ADMIN_PATHS = ["/admin"];
const SECURITY_PATHS = ["/security"];

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

    // Suspended or banned users → dedicated page
    if (payload.status === "SUSPENDED" || payload.status === "BANNED") {
      return NextResponse.redirect(new URL("/suspended", request.url));
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
