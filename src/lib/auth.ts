import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getEffectivePlan } from "./plan-limits";
import { isUserBlocked } from "./session";
import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically random token and its SHA-256 hash.
 * Store the hash in the DB; send the raw token in the URL.
 * This way a DB dump doesn't yield usable reset/verify links (H-6).
 */
export function generateSecureToken(): { raw: string; hashed: string } {
  const raw    = randomBytes(32).toString("hex");
  const hashed = createHash("sha256").update(raw).digest("hex");
  return { raw, hashed };
}

/** Hash an inbound token from a URL parameter for DB lookup. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// JWT_SECRET is required in every environment.  A missing secret would let
// tokens signed with the default be accepted on staging/CI, so we fail hard.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set. " +
    "Set it to a random 256-bit value before starting the server."
  );
}
const JWT_SECRET = process.env.JWT_SECRET;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  status: string;
  jti: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: Omit<JWTPayload, "jti"> & { jti?: string }): string {
  const jti = payload.jti || randomBytes(16).toString("hex");
  return jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(request: Request): Promise<JWTPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }
  return null;
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, phone: true, avatar: true, createdAt: true, plan: true, planExpiresAt: true },
    });
    if (!user) return null;
    return { ...user, plan: getEffectivePlan(user.plan, user.planExpiresAt, user.role) };
  } catch {
    return null;
  }
}

export async function getAuthUserFromCookies(request: Request): Promise<JWTPayload | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  if (!tokenMatch) return null;
  const payload = verifyToken(tokenMatch[1]);
  if (!payload) return null;

  // Check if entire user session is revoked or user is suspended/banned
  const [userBlocked, dbUser] = await Promise.all([
    isUserBlocked(payload.userId),
    prisma.user.findUnique({ where: { id: payload.userId }, select: { status: true } }),
  ]);
  if (userBlocked) return null;
  if (!dbUser || dbUser.status !== "ACTIVE") return null;

  return payload;
}
