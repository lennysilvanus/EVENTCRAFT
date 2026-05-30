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
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-2">Last updated: May 30, 2026</p>
        <p className="text-slate-500 text-sm mb-10">
          This policy describes how EventCraft collects and processes personal data in compliance with the{" "}
          <strong className="text-slate-400">Tanzania Personal Data Protection Act (PDPA), 2022</strong> and other applicable data protection laws.
        </p>

        <div className="flex flex-col gap-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-2">We collect information you provide directly: name, email address, phone number, and payment information. We also collect:</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside text-slate-400">
              <li>Event data you create (titles, descriptions, dates, locations)</li>
              <li>Guest lists and RSVP responses</li>
              <li>Usage data and login metadata automatically (IP address, user agent, timestamps)</li>
              <li>Consent records (which policies you accepted, when, and from which IP)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside text-slate-400">
              <li>To provide and improve the EventCraft platform</li>
              <li>To process payments and send payouts</li>
              <li>To send transactional emails (RSVP confirmations, tickets, reminders)</li>
              <li>To detect and prevent fraud and abuse</li>
              <li>To maintain security audit logs as required by law</li>
              <li>To comply with legal obligations under the PDPA and other applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Guest Data</h2>
            <p className="mb-2">Event hosts collect guest data (names, emails, phone numbers) through EventCraft. Hosts are <strong className="text-white">data controllers</strong> for their guest data and are responsible for obtaining appropriate consent from their guests before collecting it. EventCraft processes this data on behalf of hosts as a <strong className="text-white">data processor</strong> under the PDPA.</p>
            <p>Guests who RSVP via EventCraft are informed of this processing at the point of RSVP. Hosts must not use EventCraft to collect guest data without a lawful basis.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Payment Data</h2>
            <p>Payments are processed via Snippe, a licensed payment service provider in Tanzania. EventCraft does not store full mobile money credentials or PINs. Transaction records (amounts, references, status) are kept for accounting and dispute resolution as required by Tanzanian financial regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Artificial Intelligence Processing</h2>
            <p>EventCraft offers AI-powered invite text generation. When you use this feature, your event details are sent to <strong className="text-white">Anthropic&apos;s Claude API</strong> (a third-party AI processor based in the United States). We will ask for your explicit consent before sending your data to Anthropic. You may withdraw this consent at any time by contacting <a href="mailto:privacy@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">privacy@eventcraft.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Data Sharing</h2>
            <p className="mb-2">We do not sell your personal data. We share data only with:</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside text-slate-400">
              <li><strong className="text-slate-300">Snippe</strong> — for payment processing</li>
              <li><strong className="text-slate-300">Resend</strong> — for transactional email delivery</li>
              <li><strong className="text-slate-300">Anthropic</strong> — only when you use AI invite generation and have given consent</li>
              <li>Law enforcement or regulatory bodies, when required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. Guest data is retained for 2 years after the event date, after which it is automatically deleted. Login attempt records are retained for 30 days. You may request deletion at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Cookies</h2>
            <p>EventCraft uses one strictly necessary HTTP-only cookie to keep you logged in. This cookie does not track you across other websites and is deleted when you log out or after 30 days. No advertising or analytics cookies are set.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Your Rights</h2>
            <p className="mb-2">Under the PDPA and applicable law, you have the right to:</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside text-slate-400">
              <li><strong className="text-slate-300">Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong className="text-slate-300">Correction</strong> — request correction of inaccurate data</li>
              <li><strong className="text-slate-300">Deletion</strong> — request deletion of your account and data (available in Settings)</li>
              <li><strong className="text-slate-300">Portability</strong> — receive your personal data in a machine-readable format (CSV/JSON). Email <a href="mailto:privacy@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">privacy@eventcraft.app</a> to request a data export</li>
              <li><strong className="text-slate-300">Objection</strong> — object to processing based on legitimate interests</li>
              <li><strong className="text-slate-300">Withdraw consent</strong> — withdraw any consent you have given at any time</li>
            </ul>
            <p className="mt-3">Contact <a href="mailto:privacy@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">privacy@eventcraft.app</a> to exercise any of these rights. We will respond within <strong className="text-white">30 days</strong>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Security</h2>
            <p>We use industry-standard security measures including bcrypt password hashing, HTTPS, HTTP-only cookies, rate limiting, and full admin audit logging. No method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Data Breach Notification</h2>
            <p>In the event of a personal data breach that poses a risk to your rights and freedoms, we will:</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside text-slate-400 mt-2">
              <li>Notify the <strong className="text-slate-300">Personal Data Protection Commission of Tanzania</strong> within 72 hours of becoming aware of the breach</li>
              <li>Notify affected users without undue delay if the breach is likely to result in high risk to their rights</li>
            </ul>
            <p className="mt-3">If you believe your data has been compromised, contact us immediately at <a href="mailto:security@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">security@eventcraft.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Contact & Complaints</h2>
            <p className="mb-2">Privacy questions? Email <a href="mailto:privacy@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">privacy@eventcraft.app</a>.</p>
            <p>If you are not satisfied with our response, you have the right to lodge a complaint with the <strong className="text-white">Personal Data Protection Commission of Tanzania</strong>.</p>
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
