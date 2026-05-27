import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Terms of Service — EventCraft" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/60 glass sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-bold text-white text-base">Event<span className="text-indigo-400">Craft</span></span>
          </Link>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: May 27, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none flex flex-col gap-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using EventCraft (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>EventCraft is an event management platform that allows users to create events, manage guest lists, sell tickets, and process payments via mobile money networks in Tanzania and East Africa.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. User Accounts</h2>
            <p>You must provide accurate information when creating an account. You are responsible for all activity under your account. Notify us immediately of any unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Payments and Fees</h2>
            <p>EventCraft charges a <strong className="text-white">4% platform fee</strong> on all paid ticket transactions. For Business plan users, this fee is reduced to 2%. Subscription fees are charged monthly via mobile money and are non-refundable. Payouts to event hosts are processed automatically after each successful ticket payment.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Prohibited Uses</h2>
            <p>You may not use EventCraft for illegal events, fraud, spam, or any activity that violates applicable laws. We reserve the right to suspend accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>EventCraft and its original content, features, and functionality are owned by EventCraft and protected by intellectual property laws. Your event content remains your own.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>EventCraft is not liable for damages arising from your use of the Service, including but not limited to payment failures, data loss, or event cancellations beyond our control.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Changes to Terms</h2>
            <p>We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>Questions about these terms? Email us at <a href="mailto:legal@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">legal@eventcraft.app</a></p>
          </section>
        </div>
      </div>

      <footer className="border-t border-border py-8 px-4 mt-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>© 2026 EventCraft</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-slate-400">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-400">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
