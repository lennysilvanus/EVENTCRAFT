"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
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
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">EventCraft</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
              <p className="text-slate-400 text-sm mb-6">
                If <span className="text-white">{email}</span> is registered, a password reset link has been sent. Check your inbox (and spam folder).
              </p>
              <p className="text-xs text-slate-600 mb-4">
                The link expires in 1 hour. In development, check the server console for the reset URL.
              </p>
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white mb-1">Forgot your password?</h1>
                <p className="text-slate-400 text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                />
                <Button type="submit" loading={loading} className="w-full">
                  Send Reset Link
                </Button>
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
