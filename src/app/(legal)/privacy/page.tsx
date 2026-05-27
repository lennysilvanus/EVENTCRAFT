import Link from "next/link";
import { Sparkles } from "lucide-react";

export const metadata = { title: "Privacy Policy — EventCraft" };

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: May 27, 2026</p>

        <div className="flex flex-col gap-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly: name, email address, phone number, and payment information. We also collect event data, guest lists, and usage data automatically.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside text-slate-400">
              <li>To provide and improve the EventCraft platform</li>
              <li>To process payments and send payouts</li>
              <li>To send transactional emails (RSVP confirmations, tickets, reminders)</li>
              <li>To detect and prevent fraud</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Guest Data</h2>
            <p>Event hosts collect guest data (names, emails, phone numbers) through EventCraft. Hosts are responsible for obtaining appropriate consent from their guests. EventCraft processes this data on behalf of hosts as a data processor.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Payment Data</h2>
            <p>Payments are processed via Snippe, a licensed payment service provider in Tanzania. EventCraft does not store full mobile money credentials. Transaction records are kept for accounting and dispute resolution.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Sharing</h2>
            <p>We do not sell your personal data. We share data only with: payment processors (Snippe), email service providers (Resend), and as required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. Guest data is retained for 2 years after the event date. You may request deletion at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us at <a href="mailto:privacy@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">privacy@eventcraft.app</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Security</h2>
            <p>We use industry-standard security measures including encrypted passwords (bcrypt), HTTPS, and HTTP-only cookies. No method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>Privacy questions? Email <a href="mailto:privacy@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">privacy@eventcraft.app</a></p>
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
