"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, CheckCircle2, XCircle, Loader2, Mail, ArrowRight } from "lucide-react";
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
        if (data.error) { setStatus("error"); setMessage(data.error); }
        else setStatus("success");
      })
      .catch(() => { setStatus("error"); setMessage("Something went wrong. Please try again."); });
  }, [token]);

  const states = {
    idle: {
      icon: <Mail size={30} className="text-indigo-400" />,
      bg: "bg-indigo-600/15 border-indigo-500/20",
      title: "Check your inbox",
      desc: "We sent a verification link to your email. Click it to activate your account.",
      sub: "Didn't receive it? Check your spam folder.",
      action: null,
    },
    loading: {
      icon: <Loader2 size={30} className="text-indigo-400 animate-spin" />,
      bg: "bg-indigo-600/15 border-indigo-500/20",
      title: "Verifying your email…",
      desc: "Just a moment.",
      sub: null,
      action: null,
    },
    success: {
      icon: <CheckCircle2 size={30} className="text-emerald-400" />,
      bg: "bg-emerald-600/15 border-emerald-500/20",
      title: "Email verified!",
      desc: "Your account is now fully active. Head to your dashboard to get started.",
      sub: null,
      action: <Button onClick={() => router.push("/dashboard")} className="w-full" icon={<ArrowRight size={15} />}>Go to Dashboard</Button>,
    },
    error: {
      icon: <XCircle size={30} className="text-red-400" />,
      bg: "bg-red-600/15 border-red-500/20",
      title: "Verification failed",
      desc: message || "This link is invalid or has expired.",
      sub: null,
      action: <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">Go to Dashboard</Link>,
    },
  };

  const s = states[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-black text-white text-xl tracking-tight">Event<span className="text-indigo-400">Craft</span></span>
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-5 ${s.bg}`}>
            {s.icon}
          </div>
          <h1 className="text-xl font-black text-white tracking-tight mb-2">{s.title}</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{s.desc}</p>
          {s.sub && <p className="text-xs text-slate-600 mb-4">{s.sub}</p>}
          {s.action}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyContent /></Suspense>;
}
