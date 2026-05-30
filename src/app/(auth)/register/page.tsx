"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Sparkles, Eye, EyeOff, CheckCircle2, Zap, Globe, Shield } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 2) e.name = "Name must be at least 2 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email is required";
    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Registration failed"); return; }
      toast.success("Account created! Welcome to EventCraft.");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthColors = ["", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left brand panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600/20 via-purple-600/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.2),transparent_60%)]" />
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
          <div className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/20 rounded-full px-3 py-1 text-indigo-300 text-xs font-semibold mb-6">
            <Zap size={11} /> Free forever plan available
          </div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Your next event<br /><span className="text-indigo-400">starts here</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 leading-relaxed">
            Join thousands of event hosts creating unforgettable experiences with EventCraft.
          </p>
          <div className="flex flex-col gap-4">
            {[
              { icon: <Zap size={16} />,        text: "Set up in under 2 minutes" },
              { icon: <Globe size={16} />,       text: "Share invites globally via WhatsApp" },
              { icon: <Shield size={16} />,      text: "Secure payments via mobile money" },
              { icon: <CheckCircle2 size={16} />, text: "No credit card required" },
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
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <span className="font-black text-white text-xl tracking-tight">Event<span className="text-indigo-400">Craft</span></span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">Create your account</h1>
            <p className="text-slate-400 text-sm">Start hosting unforgettable events today</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-7 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Full name" type="text" placeholder="Jane Smith"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                icon={<User size={16} />} error={errors.name} autoComplete="name" />
              <Input label="Email address" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                icon={<Mail size={16} />} error={errors.email} autoComplete="email" />
              <Input label="Phone (optional)" type="tel" placeholder="+255 712 345 678"
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                icon={<Phone size={16} />} hint="Used for WhatsApp sharing" />
              <div>
                <Input label="Password" type={showPassword ? "text" : "password"} placeholder="At least 8 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  icon={<Lock size={16} />} error={errors.password} autoComplete="new-password"
                  iconRight={
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  } />
                {form.password && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-slate-700"}`} />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${strength >= 3 ? "text-emerald-400" : strength === 2 ? "text-amber-400" : "text-red-400"}`}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" loading={loading} size="lg" className="w-full mt-1">Create account</Button>

              <p className="text-center text-xs text-slate-600">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>.
              </p>
            </form>

            <div className="mt-5 pt-5 border-t border-white/8">
              <div className="grid grid-cols-2 gap-2 mb-5">
                {["AI invites", "QR check-in", "WhatsApp sharing", "Free plan"].map(b => (
                  <div key={b} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0" /> {b}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
