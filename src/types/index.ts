export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date | null;
  location: string;
  address?: string | null;
  coverImage?: string | null;
  status: EventStatus;
  category: string;
  maxGuests?: number | null;
  inviteText?: string | null;
  inviteToken: string;
  dressCode?: string | null;
  notes?: string | null;
  isPublic: boolean;
  hostId: string;
  host?: User;
  guests?: Guest[];
  inviteLinks?: InviteLink[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Guest {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: RSVPStatus;
  checkedIn: boolean;
  checkedInAt?: Date | null;
  qrToken: string;
  plusOne: boolean;
  dietaryReqs?: string | null;
  message?: string | null;
  eventId: string;
  event?: Event;
  tierId?: string | null;
  tier?: { id: string; name: string; price: number; description?: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteLink {
  id: string;
  token: string;
  label?: string | null;
  usageCount: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  isActive: boolean;
  eventId: string;
  createdAt: Date;
}

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
export type RSVPStatus = "PENDING" | "CONFIRMED" | "DECLINED";
export type UserRole = "USER" | "ADMIN";

export interface EventStats {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  checkedIn: number;
  attendanceRate: number;
}

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalGuests: number;
  confirmedGuests: number;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
