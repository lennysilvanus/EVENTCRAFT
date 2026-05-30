import { Resend } from "resend";
import { format } from "date-fns";
import nodemailer from "nodemailer";

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("your_resend")
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// SMTP fallback: used when Resend is unavailable or fails.
// Configure via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars.
const smtpTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? "587", 10),
      secure: parseInt(process.env.SMTP_PORT ?? "587", 10) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

const FROM = process.env.EMAIL_FROM || "EventCraft <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendViaSMTP(to: string, subject: string, html: string): Promise<void> {
  if (!smtpTransport) return;
  await smtpTransport.sendMail({ from: FROM, to, subject, html });
}

async function send(to: string, subject: string, html: string) {
  if (!resend && !smtpTransport) {
    console.log(`[Email skipped — no provider configured] To: ${to} | Subject: ${subject}`);
    return;
  }

  if (resend) {
    try {
      await resend.emails.send({ from: FROM, to, subject, html });
      return;
    } catch (err) {
      console.error("[Email] Resend failed — attempting SMTP fallback:", (err as Error).message);
    }
  }

  // SMTP fallback
  try {
    await sendViaSMTP(to, subject, html);
  } catch (err) {
    console.error("[Email] SMTP fallback also failed:", err);
  }
}

// ─── Templates ─────────────────────────────────────────────────────────────

function base(content: string, preheader = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>EventCraft</title>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <!-- Logo bar -->
        <tr>
          <td style="background:#4f46e5;border-radius:14px 14px 0 0;padding:18px 32px;text-align:center;">
            <span style="color:white;font-size:18px;font-weight:700;letter-spacing:-0.5px;">✨ EventCraft</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 14px 14px;padding:18px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">You received this because you are registered with EventCraft.</p>
            <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">Powered by <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">EventCraft</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string, color = "#4f46e5") {
  return `<a href="${href}" style="display:inline-block;background:${color};color:white;font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px;margin:20px 0;">${label}</a>`;
}

function detailRow(icon: string, label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
      <span style="font-size:14px;">${icon}</span>
      <span style="color:#64748b;font-size:13px;margin-left:8px;">${label}</span>
      <span style="color:#1e293b;font-size:13px;font-weight:500;float:right;">${value}</span>
    </td>
  </tr>`;
}

// ─── RSVP Confirmation ──────────────────────────────────────────────────────

export async function sendRSVPConfirmation(p: {
  to: string;
  guestName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  status: "CONFIRMED" | "DECLINED";
  qrToken: string;
  hostName: string;
}) {
  const isConfirmed = p.status === "CONFIRMED";
  const ticketUrl = `${APP_URL}/ticket/${p.qrToken}`;
  const dateStr = format(p.eventDate, "EEEE, MMMM d, yyyy");
  const timeStr = format(p.eventDate, "h:mm a");

  const content = isConfirmed ? `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">You&apos;re on the list, ${p.guestName}!</h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Your RSVP for <strong>${p.eventTitle}</strong> is confirmed.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;padding:4px 16px;margin-bottom:24px;">
      ${detailRow("📅", "Date", dateStr)}
      ${detailRow("⏰", "Time", timeStr)}
      ${detailRow("📍", "Venue", p.eventLocation)}
      ${detailRow("👤", "Host", p.hostName)}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#166534;font-size:13px;margin:0;"><strong>Your digital ticket is ready.</strong> Download it and show the QR code at the entrance.</p>
    </div>
    <div style="text-align:center;">
      ${btn(ticketUrl, "View & Download My Ticket", "#4f46e5")}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">
      Or copy this link: <a href="${ticketUrl}" style="color:#6366f1;">${ticketUrl}</a>
    </p>
  ` : `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:12px;">💌</div>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">RSVP Received, ${p.guestName}</h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Thanks for letting us know you can&apos;t make it to <strong>${p.eventTitle}</strong>.</p>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;">We&apos;ll miss you! If your plans change, you can always update your RSVP using the original invite link.</p>
  `;

  await send(
    p.to,
    isConfirmed ? `You're confirmed for ${p.eventTitle}! 🎉` : `RSVP received for ${p.eventTitle}`,
    base(content, isConfirmed ? `Your ticket for ${p.eventTitle} is ready` : "")
  );
}

// ─── Host notification ───────────────────────────────────────────────────────

export async function sendHostNotification(p: {
  to: string;
  hostName: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  eventTitle: string;
  status: string;
  eventId: string;
}) {
  const isConfirmed = p.status === "CONFIRMED";
  const eventUrl = `${APP_URL}/events/${p.eventId}`;

  const content = `
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:${isConfirmed ? "#f0fdf4" : "#fef2f2"};border:1px solid ${isConfirmed ? "#bbf7d0" : "#fecaca"};border-radius:8px;padding:6px 14px;margin-bottom:16px;">
        <span style="color:${isConfirmed ? "#166534" : "#991b1b"};font-size:13px;font-weight:600;">${isConfirmed ? "✓ Attending" : "✗ Declined"}</span>
      </div>
      <h1 style="color:#1e293b;font-size:20px;font-weight:700;margin:0 0 6px;">${p.guestName} ${isConfirmed ? "is coming!" : "can't make it"}</h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Response received for <strong>${p.eventTitle}</strong></p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;padding:4px 16px;margin-bottom:24px;">
      ${detailRow("👤", "Guest", p.guestName)}
      ${p.guestEmail ? detailRow("📧", "Email", p.guestEmail) : ""}
      ${p.guestPhone ? detailRow("📱", "Phone", p.guestPhone) : ""}
      ${detailRow("📋", "Status", p.status)}
    </table>
    <div style="text-align:center;">
      ${btn(eventUrl, "View Guest List", "#4f46e5")}
    </div>
  `;

  await send(
    p.to,
    `${p.guestName} ${isConfirmed ? "RSVP'd Yes" : "declined"} — ${p.eventTitle}`,
    base(content)
  );
}

// ─── Guest Invite ────────────────────────────────────────────────────────────

export async function sendGuestInvite(p: {
  to: string;
  guestName: string;
  hostName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  inviteText?: string | null;
  inviteToken: string;
}) {
  const inviteUrl = `${APP_URL}/invite/${p.inviteToken}`;
  const dateStr = format(p.eventDate, "EEEE, MMMM d, yyyy");
  const timeStr = format(p.eventDate, "h:mm a");

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:12px;">🎟️</div>
      <p style="color:#6366f1;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">${p.hostName} invites you to</p>
      <h1 style="color:#1e293b;font-size:24px;font-weight:800;margin:0;">${p.eventTitle}</h1>
    </div>
    ${p.inviteText ? `<div style="background:#f8fafc;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;"><p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">${p.inviteText}</p></div>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;padding:4px 16px;margin-bottom:24px;">
      ${detailRow("📅", "Date", dateStr)}
      ${detailRow("⏰", "Time", timeStr)}
      ${detailRow("📍", "Venue", p.eventLocation)}
    </table>
    <div style="text-align:center;">
      ${btn(inviteUrl, "RSVP Now", "#4f46e5")}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">
      Or open: <a href="${inviteUrl}" style="color:#6366f1;">${inviteUrl}</a>
    </p>
  `;

  await send(
    p.to,
    `You're invited to ${p.eventTitle} 🎉`,
    base(content, `${p.hostName} has invited you to ${p.eventTitle} on ${dateStr}`)
  );
}

export async function sendPasswordReset(p: { to: string; name: string; resetUrl: string }) {
  const content = `
    <h2 style="color:#fff;margin-bottom:8px;">Reset your password</h2>
    <p style="color:#94a3b8;">Hi ${p.name}, we received a request to reset your EventCraft password. Click the button below to choose a new one.</p>
    <div style="text-align:center;margin:28px 0;">
      ${btn(p.resetUrl, "Reset Password", "#4f46e5")}
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center;">This link expires in 1 hour. If you didn't request a reset, you can ignore this email — your password won't change.</p>
  `;
  await send(p.to, "Reset your EventCraft password", base(content, "Reset your EventCraft password"));
}

export async function sendEmailVerification(p: { to: string; name: string; verifyUrl: string }) {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:12px;">✉️</div>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">Verify your email</h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Hi ${p.name}, confirm your email address to finish setting up your EventCraft account.</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      ${btn(p.verifyUrl, "Verify Email Address", "#4f46e5")}
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  `;
  await send(p.to, "Verify your EventCraft email address", base(content, "Confirm your email to get started"));
}

export async function sendEventReminder(p: {
  to: string;
  guestName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  inviteToken: string;
  qrToken?: string | null;
  window: "7d" | "1d" | "2h";
}) {
  const dateStr = format(p.eventDate, "EEEE, MMMM d, yyyy");
  const timeStr = format(p.eventDate, "h:mm a");
  const ticketUrl = p.qrToken ? `${APP_URL}/ticket/${p.qrToken}` : `${APP_URL}/invite/${p.inviteToken}`;

  const windowLabel = p.window === "7d" ? "1 week" : p.window === "1d" ? "tomorrow" : "in 2 hours";
  const emoji = p.window === "7d" ? "📅" : p.window === "1d" ? "⏰" : "🚀";

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:44px;margin-bottom:12px;">${emoji}</div>
      <p style="color:#6366f1;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Event Reminder</p>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">${p.eventTitle}</h1>
      <p style="color:#64748b;font-size:15px;margin:0;">Hi ${p.guestName}! Your event is coming up <strong>${windowLabel}</strong>.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;padding:4px 16px;margin-bottom:24px;">
      ${detailRow("📅", "Date", dateStr)}
      ${detailRow("⏰", "Time", timeStr)}
      ${detailRow("📍", "Venue", p.eventLocation)}
    </table>
    <div style="text-align:center;">
      ${btn(ticketUrl, p.qrToken ? "View My Ticket" : "View Event Details", "#4f46e5")}
    </div>
  `;

  const subjects: Record<string, string> = {
    "7d": `1 week until ${p.eventTitle} 📅`,
    "1d": `${p.eventTitle} is tomorrow! ⏰`,
    "2h": `${p.eventTitle} starts in 2 hours! 🚀`,
  };

  await send(p.to, subjects[p.window], base(content, `Your event is ${windowLabel}`));
}

export async function sendDraftNudge(p: {
  to: string;
  hostName: string;
  events: { id: string; title: string }[];
}) {
  const eventList = p.events
    .map(e => `<li style="padding:4px 0;"><a href="${APP_URL}/events/${e.id}" style="color:#6366f1;text-decoration:none;">${e.title}</a></li>`)
    .join("");
  const count = p.events.length;

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:12px;">📝</div>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">
        ${count > 1 ? `${count} events are` : "An event is"} still in draft
      </h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Hi ${p.hostName}, guests can't RSVP until you publish.</p>
    </div>
    <ul style="color:#1e293b;font-size:14px;margin:0 0 24px;padding-left:20px;line-height:1.8;">
      ${eventList}
    </ul>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="color:#92400e;font-size:13px;margin:0;">Ready to go? Hit Publish on each event and your invite link will start working immediately.</p>
    </div>
    <div style="text-align:center;">
      ${btn(`${APP_URL}/events`, "Review My Events", "#4f46e5")}
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">No action needed if you're still preparing — we just wanted to remind you.</p>
  `;

  await send(
    p.to,
    count > 1 ? `You have ${count} unpublished events on EventCraft` : `"${p.events[0].title}" is still a draft`,
    base(content)
  );
}

export async function sendRecurringEventCreated(p: {
  to: string;
  hostName: string;
  seriesTitle: string;
  newEventId: string;
  newEventDate: Date;
}) {
  const eventUrl = `${APP_URL}/events/${p.newEventId}`;
  const dateStr = format(p.newEventDate, "EEEE, MMMM d, yyyy");

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:12px;">🔁</div>
      <h1 style="color:#1e293b;font-size:22px;font-weight:700;margin:0 0 8px;">Next occurrence ready</h1>
      <p style="color:#64748b;font-size:14px;margin:0;">Hi ${p.hostName}, we've auto-created the next occurrence of <strong>${p.seriesTitle}</strong>.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:10px;padding:4px 16px;margin-bottom:24px;">
      ${detailRow("📅", "Scheduled for", dateStr)}
      ${detailRow("📋", "Status", "Draft — not yet published")}
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <p style="color:#166534;font-size:13px;margin:0;">Review the event details, make any updates, then publish when you're ready to accept RSVPs.</p>
    </div>
    <div style="text-align:center;">
      ${btn(eventUrl, "Review & Publish", "#4f46e5")}
    </div>
  `;

  await send(
    p.to,
    `Next "${p.seriesTitle}" is ready to review 🔁`,
    base(content, `Your recurring event has been auto-scheduled for ${dateStr}`)
  );
}

export async function sendBulkGuestReminder(p: {
  to: string; guestName: string; eventTitle: string;
  eventDate: Date; eventLocation: string; hostName: string; message?: string;
}) {
  const dateStr = format(new Date(p.eventDate), "EEEE, MMMM d, yyyy 'at' h:mm a");
  const content = `
    <h2 style="color:#fff;margin-bottom:8px;">Reminder: ${p.eventTitle}</h2>
    <p style="color:#94a3b8;">Hi ${p.guestName}, this is a reminder from ${p.hostName} about your upcoming event.</p>
    ${p.message ? `<p style="color:#e2e8f0;background:#1e293b;padding:16px;border-radius:10px;margin:16px 0;">${p.message}</p>` : ""}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#64748b;width:120px;">Date</td><td style="color:#e2e8f0;">${dateStr}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Location</td><td style="color:#e2e8f0;">${p.eventLocation}</td></tr>
    </table>
    <p style="color:#64748b;font-size:12px;">We look forward to seeing you!</p>
  `;
  await send(p.to, `Reminder: ${p.eventTitle} is coming up!`, base(content, `Reminder about ${p.eventTitle}`));
}
