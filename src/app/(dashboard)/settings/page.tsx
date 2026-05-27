"use client";

import { useEffect, useState } from "react";
import { User, Lock, Phone, Mail, Shield, Save, Eye, EyeOff, Calendar, CheckCircle, Banknote, ArrowRight, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data) {
        setProfile(d.data);
        setName(d.data.name || "");
        setPhone(d.data.phone || "");
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(p => p ? { ...p, name: data.data.name, phone: data.data.phone } : p);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast.error("Enter your current password"); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Password changed!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { toast.error("Enter your password to confirm"); return; }
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Account deleted. Goodbye!");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const passwordStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = passwordStrength(newPassword);
  const strengthColors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile Overview Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center text-2xl font-bold text-indigo-400">
              {profile?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{profile?.name}</p>
              <p className="text-sm text-slate-400">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  profile?.role === "ADMIN"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                }`}>
                  <Shield size={10} />
                  {profile?.role}
                </span>
                {profile?.createdAt && (
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Calendar size={10} />
                    Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <User size={15} className="text-indigo-400" /> Profile Information
            </h2>
            <Input
              label="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              icon={<User size={16} />}
            />
            <Input
              label="Email Address"
              value={profile?.email || ""}
              disabled
              icon={<Mail size={16} />}
              hint="Email cannot be changed"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              icon={<Phone size={16} />}
              placeholder="+1 234 567 8900"
              hint="Used for WhatsApp notifications"
            />
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveProfile} loading={savingProfile} icon={<Save size={15} />}>
                Save Profile
              </Button>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-5">
            <Lock size={15} className="text-indigo-400" /> Change Password
          </h2>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Input
                label="Current Password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                icon={<Lock size={16} />}
                iconRight={
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="hover:text-slate-300 transition-colors">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>
            <div>
              <Input
                label="New Password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                icon={<Lock size={16} />}
                iconRight={
                  <button type="button" onClick={() => setShowNew(!showNew)} className="hover:text-slate-300 transition-colors">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
              {newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-slate-700"}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${strength >= 3 ? "text-emerald-400" : strength >= 2 ? "text-amber-400" : "text-red-400"}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              icon={confirmPassword && confirmPassword === newPassword ? <CheckCircle size={16} className="text-emerald-400" /> : <Lock size={16} />}
              error={confirmPassword && confirmPassword !== newPassword ? "Passwords don't match" : undefined}
            />
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleChangePassword}
                loading={savingPassword}
                icon={<Lock size={15} />}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Change Password
              </Button>
            </div>
          </div>
        </div>

        {/* Payout Settings */}
        <Link href="/settings/payouts" className="block">
          <div className="bg-card border border-border hover:border-indigo-500/40 rounded-2xl p-6 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Banknote size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Payout Settings</p>
                  <p className="text-xs text-slate-400 mt-0.5">Add your mobile money or bank account to receive ticket revenue</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>

        {/* Account Info */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Account Information</h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-slate-400">Account ID</span>
              <span className="text-slate-300 font-mono text-xs">{profile?.id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-slate-400">Role</span>
              <span className="text-slate-300">{profile?.role}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Member Since</span>
              <span className="text-slate-300">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-card border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-1">
            <AlertTriangle size={15} /> Danger Zone
          </h2>
          <p className="text-xs text-slate-500 mb-5">Permanently delete your account and all associated data. This cannot be undone.</p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={14} /> Delete my account
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
                This will permanently delete your account, all your events, and all guest data. Enter your password to confirm.
              </div>
              <Input
                label="Confirm your password"
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                icon={<Lock size={16} />}
                placeholder="Your current password"
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleDeleteAccount}
                  loading={deleting}
                  icon={<Trash2 size={14} />}
                  className="bg-red-600 hover:bg-red-500 border-red-500"
                >
                  {deleting ? "Deleting…" : "Delete Account"}
                </Button>
                <Button variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
