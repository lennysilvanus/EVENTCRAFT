import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = await bcrypt.hash("admin123!", 12);
  const userPassword = await bcrypt.hash("password123", 12);
  const securityPassword = await bcrypt.hash("security123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@eventcraft.com" },
    update: {},
    create: {
      name: "EventCraft Admin",
      email: "admin@eventcraft.com",
      password: adminPassword,
      role: "ADMIN",
      phone: "+1234567890",
    },
  });

  await prisma.user.upsert({
    where: { email: "security@eventcraft.com" },
    update: {},
    create: {
      name: "Security Admin",
      email: "security@eventcraft.com",
      password: securityPassword,
      role: "SECURITY_ADMIN",
      emailVerified: true,
    },
  });

  const host = await prisma.user.upsert({
    where: { email: "sarah@example.com" },
    update: {},
    create: {
      name: "Sarah Johnson",
      email: "sarah@example.com",
      password: userPassword,
      role: "USER",
      phone: "+19876543210",
    },
  });

  const event1 = await prisma.event.create({
    data: {
      title: "Sarah & James Wedding Reception",
      description: "Join us for an elegant evening celebrating the union of Sarah Johnson and James Williams. An evening of fine dining, dancing, and unforgettable memories.",
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: "The Grand Ballroom",
      address: "123 Park Avenue, New York, NY 10017",
      category: "WEDDING",
      status: "PUBLISHED",
      dressCode: "Black tie",
      maxGuests: 150,
      inviteText: "With hearts full of joy, Sarah Johnson and James Williams invite you to share in the celebration of their marriage. An elegant evening awaits you at The Grand Ballroom, where we will dine, dance, and make memories that will last a lifetime. Your presence would make this special occasion truly complete.",
      hostId: host.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: "Tech Startup Summit 2026",
      description: "The premier gathering of startup founders, investors, and tech innovators in the region.",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: "Innovation Hub",
      address: "456 Silicon Ave, San Francisco, CA 94105",
      category: "CONFERENCE",
      status: "PUBLISHED",
      dressCode: "Business casual",
      maxGuests: 300,
      inviteText: "You are cordially invited to the Tech Startup Summit 2026 — a landmark gathering where visionary founders, leading investors, and breakthrough innovators converge. Engage in thought-provoking keynotes, intimate roundtables, and unmatched networking opportunities that will shape the future of technology.",
      hostId: admin.id,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: "Marcus's 30th Birthday Bash",
      description: "30 trips around the sun and still counting! Join us for a spectacular night of music, cocktails, and good vibes.",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: "Skyline Rooftop Bar",
      address: "789 Sunset Blvd, Los Angeles, CA 90028",
      category: "BIRTHDAY",
      status: "PUBLISHED",
      dressCode: "Smart casual",
      inviteText: "🎉 It's time to celebrate! Marcus is turning 30 and we're doing it in style! Come party with us on the rooftop with stunning city views, signature cocktails, and great music. This is going to be one for the books — and we absolutely need you there to make it perfect!",
      hostId: host.id,
    },
  });

  const guestNames = [
    { name: "Emily Carter", email: "emily@example.com", phone: "+12025551234", status: "CONFIRMED" },
    { name: "Michael Brown", email: "michael@example.com", phone: "+12025555678", status: "CONFIRMED" },
    { name: "Jessica Lee", email: "jessica@example.com", status: "CONFIRMED" },
    { name: "David Wilson", email: "david@example.com", status: "DECLINED" },
    { name: "Ashley Davis", email: "ashley@example.com", status: "PENDING" },
    { name: "Chris Martin", status: "CONFIRMED", phone: "+12025559012", checkedIn: true },
    { name: "Amanda White", email: "amanda@example.com", status: "CONFIRMED" },
    { name: "Robert Taylor", status: "PENDING" },
  ];

  for (const g of guestNames) {
    await prisma.guest.create({
      data: {
        name: g.name,
        email: g.email || null,
        phone: g.phone || null,
        status: g.status,
        checkedIn: (g as { checkedIn?: boolean }).checkedIn || false,
        checkedInAt: (g as { checkedIn?: boolean }).checkedIn ? new Date() : null,
        eventId: event1.id,
        plusOne: false,
      },
    });
  }

  const confGuests = [
    { name: "Priya Sharma", email: "priya@startup.com", status: "CONFIRMED" },
    { name: "Tom Chen", email: "tom@vc.com", status: "CONFIRMED" },
    { name: "Lisa Anderson", email: "lisa@tech.com", status: "PENDING" },
    { name: "James Kim", status: "CONFIRMED" },
  ];

  for (const g of confGuests) {
    await prisma.guest.create({
      data: {
        name: g.name,
        email: g.email || null,
        status: g.status,
        eventId: event2.id,
        plusOne: false,
      },
    });
  }

  const partyGuests = [
    { name: "Jake Rodriguez", status: "CONFIRMED", checkedIn: true },
    { name: "Mia Thompson", status: "CONFIRMED" },
    { name: "Noah Johnson", status: "PENDING" },
  ];

  for (const g of partyGuests) {
    await prisma.guest.create({
      data: {
        name: g.name,
        status: g.status,
        checkedIn: g.checkedIn || false,
        checkedInAt: g.checkedIn ? new Date() : null,
        eventId: event3.id,
        plusOne: false,
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("\n📧 Test accounts:");
  console.log("  Admin:    admin@eventcraft.com / admin123!");
  console.log("  Security: security@eventcraft.com / security123!");
  console.log("  User:     sarah@example.com / password123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
