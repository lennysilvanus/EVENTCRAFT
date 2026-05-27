import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMMM d, yyyy 'at' h:mm a");
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isEventPast(date: Date | string): boolean {
  return isBefore(new Date(date), new Date());
}

export function isEventSoon(date: Date | string): boolean {
  const eventDate = new Date(date);
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  return isAfter(eventDate, now) && isBefore(eventDate, threeDaysFromNow);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getEventStatusColor(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    PUBLISHED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    CANCELLED: "text-red-400 bg-red-400/10 border-red-400/20",
    COMPLETED: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  };
  return map[status] || map.DRAFT;
}

export function getRSVPStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    CONFIRMED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    DECLINED: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  return map[status] || map.PENDING;
}

export function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    WEDDING: "💍",
    BIRTHDAY: "🎂",
    CORPORATE: "💼",
    CONCERT: "🎵",
    SPORTS: "⚽",
    CONFERENCE: "🎤",
    PARTY: "🎉",
    FUNDRAISER: "❤️",
    OTHER: "📅",
  };
  return map[category] || "📅";
}

export function generateWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppShareLink(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export const EVENT_CATEGORIES = [
  { value: "WEDDING", label: "Wedding" },
  { value: "BIRTHDAY", label: "Birthday Party" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "CONCERT", label: "Concert" },
  { value: "SPORTS", label: "Sports" },
  { value: "CONFERENCE", label: "Conference" },
  { value: "PARTY", label: "Party" },
  { value: "FUNDRAISER", label: "Fundraiser" },
  { value: "OTHER", label: "Other" },
];
