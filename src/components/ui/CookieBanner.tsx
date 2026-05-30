"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20 shrink-0 mt-0.5">
          <Cookie size={16} className="text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 leading-relaxed">
            We use one essential cookie to keep you logged in — nothing else.{" "}
            <Link href="/privacy#cookies" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="shrink-0 p-1 text-slate-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
