"use client";

import Link from "next/link";
import { ShieldX, Mail } from "lucide-react";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldX size={32} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Account Suspended</h1>
        <p className="text-slate-400 mb-6">
          Your account has been suspended by our security team. If you believe this is a mistake, please contact support.
        </p>
        <a
          href="mailto:support@eventcraft.com"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Mail size={15} /> Contact Support
        </a>
        <div className="mt-6">
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
