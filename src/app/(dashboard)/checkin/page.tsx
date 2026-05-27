"use client";

import { useState, useEffect, useRef } from "react";
import { QrCode, CheckCircle2, XCircle, Camera, Keyboard, Users, Clock, Search } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatDate, formatTime } from "@/lib/utils";

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
  const [mode, setMode] = useState<"manual" | "scanner">("manual");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ManualResult | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckedInGuest[]>([]);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "manual" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const processToken = async (t: string) => {
    const cleanToken = t.trim();
    if (!cleanToken) return;

    const urlMatch = cleanToken.match(/\/checkin\/([^/\s]+)/);
    const finalToken = urlMatch ? urlMatch[1] : cleanToken;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/checkin/${finalToken}`, { method: "POST" });
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processToken(token);
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await processToken(decodedText);
        },
        () => {}
      );
      return () => { scanner.stop().catch(() => {}); };
    } catch {
      toast.error("Camera access denied or not available");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    setScanning(false);
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">QR Check-In</h1>
          <p className="text-slate-400 text-sm">Scan or enter guest QR codes to check in attendees</p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => { setMode("manual"); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "manual" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Keyboard size={15} /> Manual Entry
          </button>
          <button
            onClick={() => { setMode("scanner"); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === "scanner" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera size={15} /> Camera Scan
          </button>
        </div>

        <div className="grid gap-6">
          {/* Input panel */}
          <div className="bg-card border border-border rounded-xl p-6">
            {mode === "manual" ? (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Enter QR Token or Paste URL</p>
                  <p className="text-xs text-slate-500 mb-4">Paste the check-in URL or type the guest token manually</p>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Paste check-in URL or token..."
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    icon={<Search size={15} />}
                    className="flex-1"
                  />
                  <Button type="submit" loading={loading} icon={<CheckCircle2 size={16} />}>
                    Check In
                  </Button>
                </div>
                <p className="text-xs text-slate-600">
                  Tip: A USB barcode scanner works here too — just scan and it auto-submits
                </p>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-semibold text-white mb-1 self-start">Camera QR Scanner</p>
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  className="w-full max-w-sm rounded-xl overflow-hidden border border-border bg-slate-900"
                  style={{ minHeight: 300 }}
                />
                {!scanning ? (
                  <Button onClick={startScanner} icon={<Camera size={16} />} size="lg">
                    Start Camera
                  </Button>
                ) : (
                  <Button variant="danger" onClick={stopScanner} size="md">
                    Stop Scanner
                  </Button>
                )}
                <p className="text-xs text-slate-500 text-center">
                  Point the camera at a guest&apos;s QR code to automatically check them in
                </p>
              </div>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl border p-5 flex items-start gap-4 animate-fade-in ${
              result.type === "success"
                ? "bg-emerald-600/10 border-emerald-500/30"
                : result.type === "already"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}>
              <div className={`shrink-0 ${result.type === "success" ? "text-emerald-400" : result.type === "already" ? "text-amber-400" : "text-red-400"}`}>
                {result.type === "success" ? <CheckCircle2 size={24} /> : result.type === "already" ? <Clock size={24} /> : <XCircle size={24} />}
              </div>
              <div>
                <p className={`font-semibold ${result.type === "success" ? "text-emerald-300" : result.type === "already" ? "text-amber-300" : "text-red-300"}`}>
                  {result.type === "success" ? "Check-in Successful!" : result.type === "already" ? "Already Checked In" : "Check-in Failed"}
                </p>
                {result.guest && (
                  <p className="text-sm text-slate-300 mt-1">
                    <strong>{result.guest.name}</strong> — {result.guest.event.title}
                  </p>
                )}
                {!result.guest && <p className="text-sm text-slate-400 mt-1">{result.message}</p>}
              </div>
            </div>
          )}

          {/* Recent check-ins */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Users size={16} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-white">Recent Check-ins</h3>
              <span className="ml-auto text-xs text-slate-500">{recentCheckins.length} this session</span>
            </div>
            {recentCheckins.length === 0 ? (
              <div className="py-12 text-center">
                <QrCode size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No check-ins yet this session</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentCheckins.map((c) => (
                  <div key={`${c.id}-${c.checkedInAt}`} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{c.event.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <CheckCircle2 size={16} className="text-emerald-400 ml-auto mb-1" />
                      <p className="text-xs text-slate-600">{formatTime(c.checkedInAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
