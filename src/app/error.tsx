"use client";

import { useEffect } from "react";
import { Sparkles, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">EventCraft</span>
        </div>

        <div className="text-8xl font-black text-red-600/30 mb-2 leading-none">500</div>
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-slate-400 mb-8">
          An unexpected error occurred. Please try again or go back to the dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw size={16} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 border border-border hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            <Home size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
