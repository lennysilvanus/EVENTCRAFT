"use client";

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showBanner, setShowBanner] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data && d.data.emailVerified === false) setShowBanner(true);
    }).catch(() => {});
  }, []);

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Verification email sent — check your inbox.");
    } catch {
      toast.error("Could not send email. Try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      {showBanner && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-amber-300">
              <Mail size={15} className="shrink-0" />
              <span>Please verify your email address — check your inbox for a confirmation link.</span>
              <button
                onClick={resendVerification}
                disabled={resending}
                className="underline underline-offset-2 hover:text-amber-200 transition-colors disabled:opacity-50 shrink-0"
              >
                {resending ? "Sending…" : "Resend email"}
              </button>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="text-amber-400/60 hover:text-amber-300 transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      <main className={showBanner ? "pt-28" : "pt-16"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
