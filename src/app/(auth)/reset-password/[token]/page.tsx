"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500"][strength - 1] ?? "bg-slate-700";
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];

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
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Password reset!</h1>
              <p className="text-slate-400 text-sm">Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white mb-1">Set new password</h1>
                <p className="text-slate-400 text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <Input
                    label="New Password"
                    type={showPass ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    icon={<Lock size={16} />}
                    iconRight={
                      <button type="button" onClick={() => setShowPass(s => !s)} className="hover:text-slate-300 transition-colors">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                  {password && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-slate-700"}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${strength >= 3 ? "text-emerald-400" : strength >= 2 ? "text-amber-400" : "text-red-400"}`}>
                        {strengthLabel}
                      </span>
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Same as above"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  icon={confirm && confirm === password ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Lock size={16} />}
                  error={confirm && confirm !== password ? "Passwords don't match" : undefined}
                />

                <Button type="submit" loading={loading} disabled={!password || !confirm} className="w-full">
                  Reset Password
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/login" className="text-sm text-slate-500 hover:text-white transition-colors">
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
