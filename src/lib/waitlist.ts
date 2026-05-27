import { prisma } from "@/lib/prisma";
import { sendRSVPConfirmation } from "@/lib/email";

export async function promoteFromWaitlist(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { host: { select: { name: true } } },
  });
  if (!event?.maxGuests) return;

  const confirmedCount = await prisma.guest.count({ where: { eventId, status: "CONFIRMED" } });
  if (confirmedCount >= event.maxGuests) return;

  const next = await prisma.guest.findFirst({
    where: { eventId, status: "WAITLISTED" },
    orderBy: { createdAt: "asc" },
  });
  if (!next) return;

  await prisma.guest.update({
    where: { id: next.id },
    data: { status: "CONFIRMED" },
  });

  if (next.email) {
    sendRSVPConfirmation({
      to: next.email,
      guestName: next.name,
      eventTitle: event.title,
      eventDate: event.date,
      eventLocation: event.location,
      status: "CONFIRMED",
      qrToken: next.qrToken,
      hostName: event.host.name,
    }).catch(() => {});
  }
}
