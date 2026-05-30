"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles, Eye, EyeOff, Calendar, QrCode, Brain, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "Email is required";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Login failed"); return; }
      toast.success("Welcome back!");
      router.push(data.data.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left brand panel (desktop) ────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600/20 via-purple-600/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.2),transparent_60%)]" />
        {/* Grid dots pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[28px_28px]" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-black text-white text-xl tracking-tight">Event<span className="text-indigo-400">Craft</span></span>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Host events that<br /><span className="text-indigo-400">leave impressions</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            AI-powered invites, real-time RSVPs, QR check-in — everything you need in one place.
          </p>
          <div className="flex flex-col gap-4">
            {[
              { icon: <Brain size={16} />, text: "AI writes your invitations in seconds" },
              { icon: <Calendar size={16} />, text: "Real-time RSVP tracking dashboard" },
              { icon: <QrCode size={16} />, text: "Contactless QR code check-in" },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3 text-slate-300">
                <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 shrink-0">{f.icon}</div>
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-slate-600 text-xs">© 2026 EventCraft. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-black text-white text-xl tracking-tight">Event<span className="text-indigo-400">Craft</span></span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Input label="Email address" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                icon={<Mail size={16} />} error={errors.email} autoComplete="email" />
              <div>
                <Input label="Password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  icon={<Lock size={16} />} error={errors.password} autoComplete="current-password"
                  iconRight={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  } />
                <div className="flex justify-end mt-2">
                  <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">Forgot password?</Link>
                </div>
              </div>
              <Button type="submit" loading={loading} size="lg" className="w-full">Sign in</Button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/8 text-center">
              <p className="text-sm text-slate-400">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Create one free</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
