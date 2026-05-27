import Link from "next/link";
import {
  Sparkles,
  QrCode,
  MessageCircle,
  Brain,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  BarChart3,
  Zap,
  Shield,
  Globe,
  Star,
} from "lucide-react";

const features = [
  {
    icon: <Brain size={22} />,
    title: "AI-Powered Invites",
    desc: "Claude AI crafts beautiful, personalized invitation text in seconds — formal, casual, or anything in between.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    icon: <QrCode size={22} />,
    title: "QR Code Check-In",
    desc: "Every guest gets a unique QR code. Scan at the door for instant, contactless check-in with real-time tracking.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: <MessageCircle size={22} />,
    title: "WhatsApp Sharing",
    desc: "Share invites directly to WhatsApp with one tap. Reach guests where they already are.",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    icon: <BarChart3 size={22} />,
    title: "Live RSVP Analytics",
    desc: "Real-time dashboards show confirmed, declined, and pending guests with check-in progress.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: <Shield size={22} />,
    title: "Guest Management",
    desc: "Full guest list control — add manually, track dietary requirements, plus-ones, and messages.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: <Globe size={22} />,
    title: "Shareable Invite Links",
    desc: "Generate trackable invite links with usage limits and expiry dates for any channel.",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
];

const steps = [
  { num: "01", title: "Create Your Event", desc: "Set the date, venue, and details. Our AI generates a stunning invite instantly." },
  { num: "02", title: "Share the Invite", desc: "Send via WhatsApp, email, or a shareable link. Track opens and RSVPs in real time." },
  { num: "03", title: "Manage RSVPs", desc: "Guests confirm from any device. You see the full picture from your dashboard." },
  { num: "04", title: "Check-In on the Day", desc: "Scan QR codes at the entrance for seamless, instant guest check-in." },
];

const stats = [
  { value: "10x", label: "Faster invite creation" },
  { value: "100%", label: "Contactless check-in" },
  { value: "Real-time", label: "RSVP tracking" },
  { value: "AI", label: "Powered by Claude" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-border/60 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">
              Event<span className="text-indigo-400">Craft</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-widest uppercase mb-8">
            <Zap size={12} />
            AI-Powered Event Management
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Events that leave{" "}
            <span className="gradient-text">lasting impressions</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create stunning invitations with AI, manage RSVPs in real time, and check guests in with QR codes.
            Everything you need to host a flawless event.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-150 shadow-lg shadow-indigo-900/40 text-base"
            >
              Start for free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-transparent border border-border hover:border-indigo-500/40 text-slate-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-150 text-base"
            >
              Sign in
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-500">
            {["No credit card required", "Setup in 2 minutes", "Free forever plan"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-surface/60">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for modern event hosts
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From the first invite to the last check-in, EventCraft handles every detail.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#141e33] border border-border rounded-xl p-6 hover:border-indigo-500/20 transition-all duration-200 hover:-translate-y-1"
              >
                <div className={`inline-flex p-2.5 rounded-xl border mb-4 ${f.bg} ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 border-t border-border bg-surface/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">From idea to check-in in minutes</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-indigo-500/30 to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm mb-4">
                    {step.num}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A <span className="text-amber-300 font-medium">4% platform fee</span> applies only to paid ticket sales — nothing on free events. No monthly surprises.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-[#141e33] border border-border rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Starter</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">Free</span>
                </div>
                <p className="text-sm text-slate-500">Forever. No credit card needed.</p>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {[
                  "Up to 5 events",
                  "Up to 100 guests per event",
                  "QR code check-in",
                  "WhatsApp sharing",
                  "Basic RSVP tracking",
                  "4% fee on paid tickets",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
                Get started free
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="bg-indigo-600 rounded-2xl p-7 flex flex-col relative shadow-2xl shadow-indigo-900/40 ring-1 ring-indigo-400/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
                  <Star size={10} fill="currentColor" /> Most Popular
                </span>
              </div>
              <div className="mb-6">
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">Pro</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">TZS 25k</span>
                  <span className="text-indigo-200 text-sm mb-1">/mo</span>
                </div>
                <p className="text-sm text-indigo-200">Billed monthly. Cancel anytime.</p>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {[
                  "Unlimited events",
                  "Unlimited guests",
                  "AI invitation writing",
                  "Advanced analytics & reports",
                  "Bulk guest notifications",
                  "Custom invite links",
                  "Team collaboration",
                  "4% fee on paid tickets",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                    <CheckCircle2 size={15} className="text-indigo-200 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center bg-white hover:bg-indigo-50 text-indigo-700 font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
                Start Pro free trial
              </Link>
            </div>

            {/* Business */}
            <div className="bg-[#141e33] border border-border rounded-2xl p-7 flex flex-col">
              <div className="mb-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Business</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">TZS 75k</span>
                  <span className="text-slate-400 text-sm mb-1">/mo</span>
                </div>
                <p className="text-sm text-slate-500">For agencies and large-scale events.</p>
              </div>
              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {[
                  "Everything in Pro",
                  "White-label branding",
                  "Dedicated account manager",
                  "Priority support",
                  "Custom integrations",
                  "Reduced 2% fee on paid tickets",
                ].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
                Contact us
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-slate-600 mt-8">
            All prices in Tanzanian Shillings (TZS). USD equivalent: ~$10/mo Pro, ~$30/mo Business.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-[#141e33] border border-indigo-500/20 rounded-2xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-purple-600/5 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex p-3 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 mb-6">
                <Calendar size={28} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Ready to craft your next event?</h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Join hundreds of event hosts who use EventCraft to create memorable experiences.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/40"
              >
                Get started free
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">EventCraft</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span>© 2026 EventCraft</span>
            <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <span className="flex items-center gap-1">
              Powered by <span className="text-indigo-400 font-medium ml-1">Claude AI</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
