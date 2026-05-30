"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Sparkles, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Enter your email address"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

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

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          {sent ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={30} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight mb-2">Check your email</h1>
              <p className="text-slate-400 text-sm mb-2 leading-relaxed">
                If <span className="text-white font-medium">{email}</span> is registered, a reset link has been sent.
              </p>
              <p className="text-xs text-slate-600 mb-6">The link expires in 1 hour. Check your spam folder too.</p>
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors flex items-center gap-1.5 justify-center">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <KeyRound size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white tracking-tight">Reset password</h1>
                  <p className="text-slate-500 text-xs">We&apos;ll email you a reset link</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input label="Email Address" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={16} />} />
                <Button type="submit" loading={loading} className="w-full">Send Reset Link</Button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
