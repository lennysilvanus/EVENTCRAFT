"use client";

import Link from "next/link";
import { ShieldX, Mail, Sparkles, ArrowLeft } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(239,68,68,0.08),transparent)] pointer-events-none" />

      <div className="relative max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-black text-white text-xl tracking-tight">Event<span className="text-indigo-400">Craft</span></span>
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <ShieldX size={30} className="text-red-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight mb-2">Account Suspended</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Your account has been restricted by our security team. If you believe this is a mistake, please contact our support team.
          </p>
          <a href="mailto:support@eventcraft.com"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-[0_4px_0_0_#7f1d1d] hover:shadow-[0_5px_0_0_#7f1d1d] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none">
            <Mail size={15} /> Contact Support
          </a>
          <div className="mt-6 pt-5 border-t border-white/8">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
