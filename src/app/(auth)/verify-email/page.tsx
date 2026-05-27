"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import Button from "@/components/ui/Button";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">(token ? "loading" : "idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-xl tracking-tight">
            Event<span className="text-indigo-400">Craft</span>
          </span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-10 shadow-2xl">
          {status === "idle" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Check your inbox</h1>
              <p className="text-slate-400 text-sm mb-6">
                We sent a verification link to your email address. Click the link to activate your account.
              </p>
              <p className="text-xs text-slate-600">Didn&apos;t receive it? Check your spam folder.</p>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 size={40} className="text-indigo-400 animate-spin mx-auto mb-5" />
              <h1 className="text-xl font-bold text-white mb-2">Verifying your email…</h1>
              <p className="text-slate-400 text-sm">Just a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-600/15 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Email verified!</h1>
              <p className="text-slate-400 text-sm mb-6">Your account is now fully active. You can close this tab or go to your dashboard.</p>
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-600/15 flex items-center justify-center mx-auto mb-5">
                <XCircle size={28} className="text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Verification failed</h1>
              <p className="text-slate-400 text-sm mb-6">{message || "This link is invalid or has expired."}</p>
              <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                Go to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
