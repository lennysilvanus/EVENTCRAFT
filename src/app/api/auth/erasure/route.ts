import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromCookies } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { cookies } from "next/headers";

/**
 * DELETE /api/auth/erasure
 *
 * Tanzania PDPA / GDPR right-to-erasure endpoint.
 *
 * What this does:
 * 1. Anonymises guest RSVPs where the user attended
 * 2. Cancels all events hosted by this user
 * 3. Anonymises the user account (removes PII while keeping FK references
 *    intact for payment / financial compliance records)
 * 4. Anonymises AuditLog entries that contain the user's email
 * 5. Synchronously deletes LoginAttempt records for the user's email
 * 6. Clears the session cookie
 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUserFromCookies(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(request);

    // Write the erasure audit entry BEFORE wiping the email, so the log is
    // complete. The actor fields are overwritten in step 4 below.
    await logAudit({
      action:     "USER_DATA_ERASED",
      actorId:    user.userId,
      actorEmail: user.email,
      targetId:   user.userId,
      targetType: "USER",
      ip,
    });

    await prisma.$transaction(async (tx) => {
      // 1. Anonymise guest records where this user RSVP'd (matched by email)
      const dbUser = await tx.user.findUnique({
        where: { id: user.userId },
        select: { email: true },
      });

      if (dbUser?.email) {
        await tx.guest.updateMany({
          where: { email: dbUser.email },
          data: {
            name:        "Deleted User",
            email:       null,
            phone:       null,
            message:     null,
            dietaryReqs: null,
            notes:       null,
          },
        });

        // 5. Delete login attempt records for this email immediately — they
        //    contain PII (email + IP) and the 30-day cron retention is too
        //    long after an erasure request.
        await tx.loginAttempt.deleteMany({ where: { email: dbUser.email } });
      }

      // 2. Cancel all events hosted by this user
      await tx.event.updateMany({
        where: { hostId: user.userId, status: { not: "CANCELLED" } },
        data:  { status: "CANCELLED" },
      });

      // 3. Anonymise the user account
      await tx.user.update({
        where: { id: user.userId },
        data: {
          name:     "Deleted User",
          email:    `deleted-${user.userId}@erasure.local`,
          phone:    null,
          avatar:   null,
          password: "",
        },
      });

      // 4. Anonymise AuditLog entries that carry this user's email.
      //    We preserve the records themselves for financial/compliance
      //    audit trails but remove the personally identifiable fields.
      await tx.auditLog.updateMany({
        where: { actorId: user.userId },
        data:  { actorEmail: `deleted-${user.userId}@erasure.local` },
      });
    });

    const cookieStore = await cookies();
    cookieStore.delete("token");

    return NextResponse.json({
      message: "Your personal data has been removed and your account anonymised.",
    });
  } catch (error) {
    console.error("Erasure error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
