import { X } from 'lucide-react';
import LogoIcon from './LogoIcon';

interface LegalModalProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  const isTerms = type === 'terms';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-brand-surface border border-brand-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="h-[3px] bg-brand-gold" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
          <div className="flex items-center gap-3">
            <LogoIcon size={22} />
            <div>
              <h2 className="text-lg font-bold text-brand-text font-serif">
                {isTerms ? 'Terms of Service' : 'Privacy Policy'}
              </h2>
              <p className="text-[10px] text-brand-muted font-sans uppercase tracking-wider">
                AlphaVest Financial Services · Last Updated: January 2025
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-brand-gold transition-colors p-1.5 rounded hover:bg-brand-border/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 font-sans text-sm text-brand-muted leading-relaxed space-y-5">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="border-t border-brand-border px-6 py-4 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="bg-brand-gold text-brand-bg font-sans font-bold text-xs px-6 py-2.5 rounded-lg hover:brightness-110 transition-all tracking-widest uppercase"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-brand-text text-xs font-semibold uppercase tracking-wider border-b border-brand-border pb-2">
        Agreement to Terms
      </p>
      <p>
        By accessing or using AlphaVest ("Platform", "we", "our"), you agree to be bound by these Terms of Service. If you
        do not agree, you may not access or use the Platform.
      </p>

      <Section title="1. Eligibility">
        You must be at least 18 years of age and legally permitted to invest in financial products in your jurisdiction to
        use this Platform. By creating an account, you represent and warrant that you meet these requirements.
      </Section>

      <Section title="2. Account Registration">
        You agree to provide accurate, current, and complete information during registration. You are responsible for
        maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
        AlphaVest is not liable for losses arising from unauthorised account access.
      </Section>

      <Section title="3. Investment Products & Risk Disclosure">
        All investment products offered through AlphaVest carry inherent financial risk. Past performance does not
        guarantee future results. You acknowledge that you may lose part or all of your invested capital. AlphaVest does
        not provide personalised financial advice. Always conduct independent due diligence before investing.
      </Section>

      <Section title="4. Deposits & Withdrawals">
        Deposits are processed via bank transfer (Monnify), card payment (Flutterwave), or cryptocurrency (BTC, USDT).
        Withdrawals are subject to verification. Early withdrawal before plan maturity incurs a 5% exit fee on principal.
        Processing times vary by payment provider (typically 1–5 business days).
      </Section>

      <Section title="5. Fees">
        AlphaVest charges no platform subscription fee. Early-exit fees (5% of principal) apply to pre-maturity
        withdrawals. Payment provider fees may apply and are charged separately by the respective providers.
      </Section>

      <Section title="6. Prohibited Conduct">
        You agree not to: (a) use the Platform for any unlawful purpose; (b) attempt to gain unauthorised access to any
        system; (c) transmit malicious code; (d) engage in money laundering, fraud, or any activity that violates
        applicable law, including AML/KYC regulations.
      </Section>

      <Section title="7. Intellectual Property">
        All content, trademarks, and materials on the Platform are owned by or licensed to AlphaVest. You may not
        reproduce, distribute, or create derivative works without explicit written permission.
      </Section>

      <Section title="8. Limitation of Liability">
        To the fullest extent permitted by law, AlphaVest shall not be liable for indirect, incidental, special,
        consequential, or punitive damages, including loss of profits or data, arising from your use of the Platform.
      </Section>

      <Section title="9. Governing Law">
        These Terms are governed by and construed in accordance with applicable international financial services law.
        Disputes shall be resolved through binding arbitration.
      </Section>

      <Section title="10. Changes to Terms">
        AlphaVest reserves the right to update these Terms at any time. Continued use of the Platform following notice
        of changes constitutes acceptance of the revised Terms.
      </Section>

      <Section title="11. Contact">
        Questions regarding these Terms may be directed to: <span className="text-brand-gold">legal@alphavest.com</span>
      </Section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-brand-text text-xs font-semibold uppercase tracking-wider border-b border-brand-border pb-2">
        Your Privacy Matters
      </p>
      <p>
        This Privacy Policy explains how AlphaVest collects, uses, stores, and protects your personal information when
        you use our Platform.
      </p>

      <Section title="1. Information We Collect">
        <ul className="list-disc pl-4 space-y-1 mt-1">
          <li><strong>Account data:</strong> Name, email address, password (hashed), profile photo</li>
          <li><strong>Financial data:</strong> Investment amounts, transaction history, wallet addresses</li>
          <li><strong>Authentication data:</strong> Google OAuth tokens, WebAuthn biometric credential IDs</li>
          <li><strong>Usage data:</strong> IP address, browser type, pages visited, time on Platform</li>
          <li><strong>Communication data:</strong> Support enquiries, email correspondence</li>
        </ul>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul className="list-disc pl-4 space-y-1 mt-1">
          <li>To create and manage your account</li>
          <li>To process deposits, investments, and withdrawals</li>
          <li>To send account notifications, OTP codes, and transaction confirmations</li>
          <li>To comply with AML/KYC and other regulatory obligations</li>
          <li>To detect fraud and ensure platform security</li>
          <li>To improve Platform functionality and user experience</li>
        </ul>
      </Section>

      <Section title="3. Data Storage & Security">
        All personal data is stored in encrypted form using AES-256 encryption. Passwords are hashed using bcrypt and
        are never stored in plain text. Biometric data is stored only as a cryptographic public key — your actual
        biometric is never transmitted or stored. We use TLS/HTTPS for all data in transit.
      </Section>

      <Section title="4. Data Sharing">
        AlphaVest does not sell your personal data. We may share data with:
        <ul className="list-disc pl-4 space-y-1 mt-1">
          <li><strong>Payment processors</strong> (Monnify, Flutterwave) — solely to process your transactions</li>
          <li><strong>Google</strong> — if you choose to sign in with Google</li>
          <li><strong>Legal authorities</strong> — when required by law, regulation, or court order</li>
        </ul>
      </Section>

      <Section title="5. Cookies & Sessions">
        We use session cookies to maintain your authenticated state. No third-party advertising cookies are used.
        You may disable cookies in your browser settings, but this will prevent login functionality.
      </Section>

      <Section title="6. Your Rights">
        Subject to applicable law, you have the right to:
        <ul className="list-disc pl-4 space-y-1 mt-1">
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>Withdraw consent where processing is based on consent</li>
        </ul>
        To exercise your rights, contact <span className="text-brand-gold">privacy@alphavest.com</span>.
      </Section>

      <Section title="7. Data Retention">
        We retain account data for the duration of your account and for up to 7 years after account closure for
        regulatory compliance purposes. Transaction records are retained for 10 years as required by financial
        regulations.
      </Section>

      <Section title="8. International Transfers">
        Your data may be processed in countries outside your own. We ensure appropriate safeguards are in place for
        all international transfers in accordance with applicable data protection law.
      </Section>

      <Section title="9. Changes to This Policy">
        We may update this Privacy Policy periodically. We will notify you of material changes via email or a
        prominent notice on the Platform.
      </Section>

      <Section title="10. Contact">
        For privacy-related enquiries: <span className="text-brand-gold">privacy@alphavest.com</span>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-brand-text font-semibold text-[13px] mb-1">{title}</h3>
      <div className="text-brand-muted text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
