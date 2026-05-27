import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "./auth";
import type { JWTPayload } from "./auth";

export async function requireSecurityAdmin(
  request: Request
): Promise<{ user: JWTPayload } | NextResponse> {
  const user = await getAuthUserFromCookies(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "SECURITY_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user };
}

export function isGuardError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
