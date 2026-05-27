import { prisma } from "./prisma";

export async function blockToken(jti: string, userId: string, expiresAt: Date) {
  try {
    await prisma.blockedToken.create({ data: { jti, userId, expiresAt } });
  } catch {
    // already blocked — ignore duplicate
  }
}

export async function isTokenBlocked(jti: string): Promise<boolean> {
  const entry = await prisma.blockedToken.findUnique({ where: { jti } });
  if (!entry) return false;
  if (entry.expiresAt < new Date()) {
    await prisma.blockedToken.delete({ where: { jti } }).catch(() => {});
    return false;
  }
  return true;
}

export async function blockAllUserTokens(userId: string) {
  // We can't revoke already-issued tokens we don't track, so we store a
  // sentinel that getAuthUserFromCookies checks per-user.
  await prisma.blockedToken.upsert({
    where: { jti: `user_all_${userId}` },
    update: { blockedAt: new Date(), expiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000) },
    create: {
      jti: `user_all_${userId}`,
      userId,
      expiresAt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  const entry = await prisma.blockedToken.findUnique({ where: { jti: `user_all_${userId}` } });
  if (!entry) return false;
  if (entry.expiresAt < new Date()) {
    await prisma.blockedToken.delete({ where: { jti: `user_all_${userId}` } }).catch(() => {});
    return false;
  }
  return true;
}
