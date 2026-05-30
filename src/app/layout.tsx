import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import CookieBanner from "@/components/ui/CookieBanner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EventCraft — Event Management Platform",
  description: "Create, manage and share stunning event invitations with AI-powered content, QR check-in, and WhatsApp sharing.",
  keywords: "event management, invitations, RSVP, QR code, WhatsApp",
  openGraph: {
    title: "EventCraft",
    description: "AI-powered event management platform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-background text-slate-100 antialiased">
        {children}
        <CookieBanner />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#141e33",
              color: "#f1f5f9",
              border: "1px solid #1e2d45",
              borderRadius: "10px",
              fontSize: "14px",
              padding: "12px 16px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#141e33" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#141e33" },
            },
          }}
        />
      </body>
    </html>
  );
}
