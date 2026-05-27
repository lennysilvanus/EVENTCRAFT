"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Menu,
  X,
  Shield,
  QrCode,
  ChevronDown,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface NavUser {
  name: string;
  email: string;
  role: string;
  plan?: string;
}

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.data) setUser(d.data);
    }).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/");
    setUser(null);
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { href: "/events", label: "Events", icon: <Calendar size={16} /> },
    { href: "/guests", label: "Guests", icon: <Users size={16} /> },
    { href: "/checkin", label: "Check-In", icon: <QrCode size={16} /> },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-[#1e2d45] glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50 group-hover:bg-indigo-500 transition-colors">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Event<span className="text-indigo-400">Craft</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive(item.href)
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive("/admin")
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                      : "text-slate-400 hover:text-amber-300 hover:bg-amber-500/10"
                  )}
                >
                  <Shield size={16} />
                  Admin
                </Link>
              )}
              {(user.role === "SECURITY_ADMIN" || user.role === "ADMIN") && (
                <Link
                  href="/security"
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive("/security")
                      ? "bg-red-500/15 text-red-300 border border-red-500/20"
                      : "text-slate-400 hover:text-red-300 hover:bg-red-500/10"
                  )}
                >
                  <Shield size={16} />
                  Security
                </Link>
              )}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 pl-3 pr-2.5 py-1.5 rounded-xl border border-[#1e2d45] hover:border-indigo-500/30 hover:bg-indigo-600/5 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300 hidden sm:block max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown size={14} className={cn("text-slate-500 transition-transform", userMenuOpen && "rotate-180")} />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#141e33] border border-[#1e2d45] rounded-xl shadow-2xl z-20 py-1 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#1e2d45]">
                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      {user.plan && user.plan !== "FREE" && (
                        <div className="px-4 py-2 border-b border-border">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            user.plan === "BUSINESS" ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
                          }`}>
                            {user.plan}
                          </span>
                        </div>
                      )}
                      <Link href="/upgrade" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <Zap size={15} /> Upgrade Plan
                      </Link>
                      <Link href="/settings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <Settings size={15} /> Settings
                      </Link>
                      <button type="button" onClick={logout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
                  Sign in
                </Link>
                <Link href="/register" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors">
                  Get started
                </Link>
              </div>
            )}

            {/* Mobile menu */}
            {user && (
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && user && (
          <div className="md:hidden py-3 border-t border-border animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium mx-1 my-0.5 transition-all",
                  isActive(item.href)
                    ? "bg-indigo-600/15 text-indigo-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <Link
              href="/upgrade"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium mx-1 my-0.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all"
            >
              <Zap size={16} /> Upgrade
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
