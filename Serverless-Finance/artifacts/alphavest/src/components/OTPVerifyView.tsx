import { useState, useRef, useEffect, FormEvent } from 'react';
import { Shield, Loader2, RefreshCw, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ScreenType } from '../types';
import LogoIcon from './LogoIcon';

interface OTPVerifyViewProps {
  onNavigate: (screen: ScreenType) => void;
  email: string;
  onVerified: () => void;
}

export default function OTPVerifyView({ onNavigate, email, onVerified }: OTPVerifyViewProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
    // Send OTP on mount
    fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type: 'email_verify' }),
    }).catch(() => {});
  }, [email]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) { setError('Enter all 6 digits'); return; }
    setError('');
    setLoading(true);

    try {
      const r = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message ?? 'Invalid code'); setLoading(false); return; }
      onVerified();
    } catch {
      setError('Verification failed. Please try again.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'email_verify' }),
      });
      setResent(true);
      setCountdown(60);
      setTimeout(() => setResent(false), 4000);
    } catch {}
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-serif">
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <LogoIcon size={28} />
          <span className="font-serif text-base font-bold text-brand-gold tracking-wider uppercase">AlphaVest</span>
        </button>
        <button onClick={() => onNavigate('login')} className="flex items-center gap-1.5 text-brand-muted hover:text-brand-gold transition-colors text-xs font-sans">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-sm">
          <div className="bg-brand-surface border border-brand-border rounded shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-brand-gold" />
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-brand-gold" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-brand-text text-center mb-2">Verify Your Email</h1>
              <p className="text-xs text-brand-muted font-sans text-center leading-relaxed mb-2">
                We sent a 6-digit code to
              </p>
              <p className="text-sm text-brand-gold font-semibold text-center mb-6">{email}</p>

              {error && (
                <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs py-2.5 px-3 rounded font-sans">
                  {error}
                </div>
              )}

              {resent && (
                <div className="mb-4 bg-green-950/40 border border-green-500/30 text-green-300 text-xs py-2.5 px-3 rounded font-sans flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> New code sent!
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { inputs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleChange(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(idx, e)}
                      className="w-11 h-14 text-center text-xl font-bold bg-brand-bg border border-brand-border text-brand-text focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || code.join('').length < 6}
                  className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded hover:brightness-110 transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  {loading ? 'Verifying...' : 'Verify Account'}
                </button>
              </form>

              <div className="mt-5 text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-brand-muted font-sans">Resend code in {countdown}s</p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs text-brand-gold hover:opacity-70 transition-opacity font-sans flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
