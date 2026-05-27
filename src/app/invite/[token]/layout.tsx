import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const event = await prisma.event.findFirst({
      where: { inviteToken: token, status: "PUBLISHED" },
      include: { host: { select: { name: true } } },
    });

    if (!event) return { title: "Invitation — EventCraft" };

    const date = new Date(event.date).toLocaleDateString("en-US", {
      weekday: "short", month: "long", day: "numeric",
    });

    return {
      title: `${event.title} — You're Invited`,
      description: `${event.host.name} invites you to ${event.title} on ${date} at ${event.location}. RSVP now on EventCraft.`,
      openGraph: {
        title: `${event.title} — You're Invited`,
        description: `${event.host.name} invites you to ${event.title} on ${date} at ${event.location}.`,
        url: `${APP_URL}/invite/${token}`,
        siteName: "EventCraft",
        images: [{ url: `${APP_URL}/invite/${token}/opengraph-image`, width: 1200, height: 630 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${event.title} — You're Invited`,
        description: `${event.host.name} invites you to ${event.title} on ${date} at ${event.location}.`,
        images: [`${APP_URL}/invite/${token}/opengraph-image`],
      },
    };
  } catch {
    return { title: "Invitation — EventCraft" };
  }
}

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
