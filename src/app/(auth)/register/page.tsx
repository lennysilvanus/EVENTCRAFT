"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Sparkles, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }
      toast.success("Account created! Welcome to EventCraft.");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength();
  const strengthColors = ["", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-bold text-white text-xl tracking-tight">
              Event<span className="text-indigo-400">Craft</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Start hosting unforgettable events today</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              icon={<User size={16} />}
              error={errors.name}
              autoComplete="name"
            />
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              icon={<Mail size={16} />}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              label="Phone (optional)"
              type="tel"
              placeholder="+1 234 567 8900"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              icon={<Phone size={16} />}
              hint="Used for WhatsApp sharing features"
            />
            <div className="flex flex-col gap-1.5">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                icon={<Lock size={16} />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                error={errors.password}
                autoComplete="new-password"
              />
              {form.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-slate-700"}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${strength >= 3 ? "text-emerald-400" : strength === 2 ? "text-amber-400" : "text-red-400"}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              Create account
            </Button>

            <p className="text-center text-xs text-slate-600 mt-2">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>.
            </p>
          </form>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider font-medium">What you get</p>
            <div className="flex flex-col gap-2">
              {["AI-generated invites", "Unlimited events", "QR code check-in", "WhatsApp sharing"].map((b) => (
                <div key={b} className="flex items-center gap-2.5 text-sm text-slate-400">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
