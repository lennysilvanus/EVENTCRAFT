"use client";

import { useState, useEffect, useRef } from "react";
import {
  QrCode, CheckCircle2, XCircle, Camera, Keyboard,
  Users, Clock, Search, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card3D } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatTime } from "@/lib/utils";

interface CheckedInGuest {
  id: string;
  name: string;
  event: { title: string; date: string };
  checkedInAt: string;
}

interface ManualResult {
  type: "success" | "error" | "already";
  message: string;
  guest?: { name: string; event: { title: string } };
}

export default function CheckInPage() {
  const [mode, setMode]         = useState<"manual" | "scanner">("manual");
  const [token, setToken]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<ManualResult | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckedInGuest[]>([]);
  const [scanning, setScanning] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "manual") inputRef.current?.focus();
  }, [mode]);

  const processToken = async (t: string) => {
    const clean = t.trim();
    if (!clean) return;
    const urlMatch = clean.match(/\/checkin\/([^/\s]+)/);
    const finalToken = urlMatch ? urlMatch[1] : clean;

    setLoading(true);
    setResult(null);
    try {
      const res  = await fetch(`/api/checkin/${finalToken}`, { method: "POST" });
      const data = await res.json();
      if (res.status === 409) {
        setResult({ type: "already", message: "Already checked in", guest: data.data });
        toast("Already checked in", { icon: "⚠️" });
      } else if (!res.ok) {
        setResult({ type: "error", message: data.error || "Invalid QR code" });
        toast.error(data.error || "Check-in failed");
      } else {
        setResult({ type: "success", message: "Check-in successful!", guest: data.data });
        toast.success(`${data.data.name} checked in!`);
        setRecentCheckins(prev => [
          { id: data.data.id, name: data.data.name, event: data.data.event, checkedInAt: new Date().toISOString() },
          ...prev.slice(0, 9),
        ]);
      }
    } catch {
      setResult({ type: "error", message: "Network error. Try again." });
      toast.error("Network error");
    } finally {
      setLoading(false);
      setToken("");
    }
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => { await processToken(decodedText); },
        () => {}
      );
      return () => { scanner.stop().catch(() => {}); };
    } catch {
      toast.error("Camera access denied or not available");
      setScanning(false);
    }
  };

  const resultConfig = {
    success: { bg: "bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 size={28} className="text-emerald-400" />, label: "Check-in Successful!", labelColor: "text-emerald-300" },
    already: { bg: "bg-amber-500/10 border-amber-500/30",   icon: <Clock size={28} className="text-amber-400" />,          label: "Already Checked In",     labelColor: "text-amber-300"  },
    error:   { bg: "bg-red-500/10 border-red-500/30",       icon: <XCircle size={28} className="text-red-400" />,           label: "Check-in Failed",        labelColor: "text-red-300"    },
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-emerald-600/20 via-teal-600/5 to-transparent border border-emerald-500/20 px-6 py-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <QrCode size={22} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">QR Check-In</h1>
              <p className="text-emerald-300/70 text-sm">Scan or enter guest QR codes to check in attendees</p>
            </div>
            {recentCheckins.length > 0 && (
              <div className="ml-auto text-right shrink-0">
                <p className="text-2xl font-black text-emerald-400">{recentCheckins.length}</p>
                <p className="text-xs text-slate-500">checked in</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mode toggle ─────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {[
            { key: "manual",  label: "Manual / USB Scanner", icon: <Keyboard size={15} /> },
            { key: "scanner", label: "Camera Scan",          icon: <Camera size={15} /> },
          ].map(m => (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMode(m.key as "manual" | "scanner"); setResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                mode === m.key
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 shadow-[0_4px_0_0_#064e3b]"
                  : "bg-card border-border text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* ── Input panel ─────────────────────────────────────────────── */}
        <Card3D intensity="normal">
          <div className="bg-card border border-border rounded-xl p-6">
            {mode === "manual" ? (
              <form onSubmit={e => { e.preventDefault(); processToken(token); }} className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-bold text-white mb-1">Enter QR Token or Paste URL</p>
                  <p className="text-xs text-slate-500 mb-4">Paste the check-in URL or type the guest token. A USB barcode scanner works here too.</p>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Paste check-in URL or token..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    icon={<Search size={15} />}
                    className="flex-1"
                    ref={inputRef}
                  />
                  <Button type="submit" loading={loading} icon={<Zap size={16} />}>
                    Check In
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-5">
                <p className="text-sm font-bold text-white self-start">Camera QR Scanner</p>
                {/* Scanner viewport */}
                <div className="relative w-full max-w-sm mx-auto">
                  <div
                    id="qr-reader"
                    className="w-full min-h-[280px] rounded-2xl overflow-hidden border border-emerald-500/30 bg-surface shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                  />
                  {/* Corner brackets overlay */}
                  {scanning && (
                    <div className="absolute inset-4 pointer-events-none">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
                    </div>
                  )}
                </div>
                {!scanning ? (
                  <Button onClick={startScanner} icon={<Camera size={16} />} size="lg" variant="secondary">
                    Start Camera
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => { setScanning(false); window.location.reload(); }}>
                    Stop Scanner
                  </Button>
                )}
                <p className="text-xs text-slate-500 text-center">Point the camera at a guest&apos;s QR code to automatically check them in</p>
              </div>
            )}
          </div>
        </Card3D>

        {/* ── Result banner ───────────────────────────────────────────── */}
        {result && (() => {
          const cfg = resultConfig[result.type];
          return (
            <div className={`rounded-2xl border p-5 flex items-center gap-4 ${cfg.bg}`}>
              <div className="shrink-0">{cfg.icon}</div>
              <div className="flex-1">
                <p className={`font-black text-base tracking-tight ${cfg.labelColor}`}>{cfg.label}</p>
                {result.guest && (
                  <p className="text-sm text-slate-300 mt-0.5">
                    <span className="font-semibold text-white">{result.guest.name}</span>
                    <span className="text-slate-500"> — </span>
                    {result.guest.event.title}
                  </p>
                )}
                {!result.guest && <p className="text-sm text-slate-400 mt-0.5">{result.message}</p>}
              </div>
            </div>
          );
        })()}

        {/* ── Recent check-ins ────────────────────────────────────────── */}
        <Card3D intensity="subtle">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                <Users size={14} className="text-emerald-400" />
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">Recent Check-ins</h3>
              {recentCheckins.length > 0 && (
                <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                  {recentCheckins.length} this session
                </span>
              )}
            </div>

            {recentCheckins.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-border flex items-center justify-center mb-4">
                  <QrCode size={24} className="text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-1">No check-ins yet</p>
                <p className="text-xs text-slate-600">Scan a guest QR code to begin</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentCheckins.map((c, i) => (
                  <div key={`${c.id}-${c.checkedInAt}`}
                    className={`flex items-center gap-3 px-5 py-3.5 ${i === 0 ? "bg-emerald-500/5" : ""}`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0
                      ${i === 0 ? "bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/40" : "bg-emerald-600/15 text-emerald-400"}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate tracking-tight">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{c.event.title}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {i === 0 && (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
                          Just now
                        </span>
                      )}
                      <p className="text-xs text-slate-600">{formatTime(c.checkedInAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card3D>

      </div>
    </DashboardLayout>
  );
}
