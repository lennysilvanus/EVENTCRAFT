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
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: May 30, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none flex flex-col gap-8 text-slate-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using EventCraft (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service and all applicable laws. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>EventCraft is an event management platform that allows users to create events, manage guest lists, sell tickets, and process payments via mobile money networks in Tanzania and East Africa.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Eligibility and User Accounts</h2>
            <p className="mb-3">You must be at least 18 years old, or the legal age of majority in your jurisdiction, to create an account or use the Service. By registering, you confirm that you meet this requirement.</p>
            <p>You must provide accurate information when creating an account. You are responsible for all activity under your account. Notify us immediately of any unauthorised access at <a href="mailto:security@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">security@eventcraft.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Payments, Fees and Subscriptions</h2>
            <ul className="flex flex-col gap-2 list-disc list-inside text-slate-400">
              <li>EventCraft charges a <strong className="text-white">4% platform fee</strong> on all paid ticket transactions. For Business plan subscribers, this fee is reduced to <strong className="text-white">2%</strong>. A minimum platform fee of <strong className="text-white">TZS 1,000</strong> applies per transaction regardless of percentage.</li>
              <li>Subscription fees (Pro: TZS 45,000/month or TZS 460,000/year; Business: TZS 250,000/month or TZS 2,550,000/year) are charged via mobile money and are non-refundable once payment is confirmed.</li>
              <li>Monthly subscriptions renew automatically each month. Annual subscriptions renew automatically each year. We will send a renewal reminder to your registered email address at least <strong className="text-white">7 days before</strong> an annual renewal.</li>
              <li>You may cancel your subscription at any time from <strong className="text-white">Settings → Upgrade</strong>. Cancellation takes effect at the end of the current billing period; you retain access until then.</li>
              <li>Pay-per-event credits cost TZS 15,000 each and do not expire. You may hold a maximum of <strong className="text-white">3 unused event credits</strong> at any time.</li>
              <li>Payouts to event hosts are processed automatically after each successful ticket payment, typically within minutes. In the event of a payout failure, we will retry and notify you within <strong className="text-white">2 business days</strong>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Ticket Refund Policy</h2>
            <p className="mb-3">Ticket fees paid by guests are non-refundable except in the following circumstances:</p>
            <ul className="flex flex-col gap-2 list-disc list-inside text-slate-400">
              <li>If the <strong className="text-white">event is cancelled by the host</strong>, guests who purchased tickets are entitled to a full refund of the ticket price (excluding the platform fee) processed within <strong className="text-white">7 business days</strong>.</li>
              <li>If there is a demonstrable processing error or duplicate charge attributable to EventCraft, a full refund will be issued within 5 business days.</li>
            </ul>
            <p className="mt-3">To request a refund, contact <a href="mailto:support@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">support@eventcraft.app</a> with your booking reference.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Prohibited Uses</h2>
            <p className="mb-3">You may not use EventCraft for illegal events, fraud, spam, or any activity that violates applicable laws. We reserve the right to suspend or ban accounts that violate these terms.</p>
            <p>To appeal a suspension or ban, contact <a href="mailto:legal@eventcraft.app" className="text-indigo-400 hover:text-indigo-300">legal@eventcraft.app</a> within 30 days of the action. We aim to respond to appeals within 5 business days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p>EventCraft and its original content, features, and functionality are owned by EventCraft and protected by intellectual property laws. Your event content, images, and guest data remain your own.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Artificial Intelligence Features</h2>
            <p>EventCraft offers AI-powered invite text generation. When you use this feature, your event details (title, date, location, description) are sent to Anthropic&apos;s Claude API for processing. By enabling AI generation, you consent to this transfer. Generated text is not stored by Anthropic beyond their standard data handling policy. AI-generated content is provided as-is; you are responsible for reviewing it before use.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, EventCraft is not liable for indirect damages arising from your use of the Service, including payment failures, data loss, or event cancellations beyond our control. Our total liability for any claim shall not exceed the fees you paid to EventCraft in the 3 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p>We may update these terms at any time. We will notify you of material changes by email at least 14 days before they take effect. Continued use of the Service after the effective date constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">11. Governing Law and Dispute Resolution</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the <strong className="text-white">United Republic of Tanzania</strong>. Any dispute arising out of or in connection with these Terms shall be submitted to the exclusive jurisdiction of the courts of <strong className="text-white">Dar es Salaam, Tanzania</strong>. Nothing in this clause limits your statutory consumer rights under Tanzanian law.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">12. Contact</h2>
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
