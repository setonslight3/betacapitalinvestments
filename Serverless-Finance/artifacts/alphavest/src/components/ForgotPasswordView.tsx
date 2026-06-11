import { useState, useRef, FormEvent } from 'react';
import { Lock, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { ScreenType } from '../types';
import LogoIcon from './LogoIcon';

interface ForgotPasswordViewProps {
  onNavigate: (screen: ScreenType) => void;
}

type Step = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordView({ onNavigate }: ForgotPasswordViewProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email required'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (data.devCode) {
        // No email service — pre-fill the code so user can proceed immediately
        setDevCode(data.devCode);
        setCode(data.devCode.split(''));
      }
      setStep('code');
    } catch {
      setError('Failed to send code. Try again.');
    }
    setLoading(false);
  };

  const handleCodeChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleCodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.join('').length < 6) { setError('Enter all 6 digits'); return; }
    setError('');
    setStep('password');
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.join(''), newPassword: newPw }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message ?? 'Reset failed'); setLoading(false); return; }
      setStep('done');
    } catch {
      setError('Failed to reset password. Try again.');
    }
    setLoading(false);
  };

  const strength = () => {
    if (!newPw) return { label: '', color: '', w: '0%' };
    if (newPw.length < 6) return { label: 'Weak', color: 'bg-red-500', w: '25%' };
    if (newPw.length < 10) return { label: 'Fair', color: 'bg-yellow-500', w: '50%' };
    if (!/[A-Z]/.test(newPw) || !/[0-9]/.test(newPw)) return { label: 'Good', color: 'bg-blue-400', w: '75%' };
    return { label: 'Strong', color: 'bg-brand-gold', w: '100%' };
  };
  const str = strength();

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-serif">
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <LogoIcon size={28} />
          <span className="font-serif text-base font-bold text-brand-gold tracking-wider uppercase">AlphaVest</span>
        </button>
        <button onClick={() => onNavigate('login')} className="flex items-center gap-1.5 text-brand-muted hover:text-brand-gold transition-colors text-xs font-sans">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-sm">
          <div className="bg-brand-surface border border-brand-border rounded shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-brand-gold" />
            <div className="p-8">

              {/* Step indicators */}
              <div className="flex items-center gap-2 mb-6 justify-center">
                {(['email', 'code', 'password'] as Step[]).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-sans transition-all ${
                      step === 'done' || ['email','code','password'].indexOf(step) > i
                        ? 'bg-brand-gold text-brand-bg'
                        : step === s
                          ? 'border-2 border-brand-gold text-brand-gold'
                          : 'border border-brand-border text-brand-muted'
                    }`}>{i + 1}</div>
                    {i < 2 && <div className={`w-6 h-px ${['email','code','password'].indexOf(step) > i || step === 'done' ? 'bg-brand-gold' : 'bg-brand-border'}`} />}
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs py-2.5 px-3 rounded font-sans">{error}</div>
              )}

              {step === 'email' && (
                <>
                  <h1 className="text-2xl font-bold text-brand-text mb-2">Forgot Password</h1>
                  <p className="text-xs text-brand-muted font-sans mb-6 leading-relaxed">Enter your email and we'll send a reset code.</p>
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <input
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-text placeholder-brand-muted/30 text-sm focus:border-brand-gold focus:outline-none rounded font-sans"
                    />
                    <button type="submit" disabled={loading} className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded hover:brightness-110 transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-60">
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                      {loading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                  </form>
                </>
              )}

              {step === 'code' && (
                <>
                  <h1 className="text-2xl font-bold text-brand-text mb-2">Enter Code</h1>
                  {devCode ? (
                    <div className="mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-400 font-sans text-xs font-bold mb-0.5">Email service not configured</p>
                      <p className="text-yellow-300/80 font-sans text-xs">Your reset code has been pre-filled below. Copy it before pressing Continue.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-brand-muted font-sans mb-1">Code sent to:</p>
                      <p className="text-sm text-brand-gold font-semibold mb-4">{email}</p>
                    </>
                  )}
                  <form onSubmit={handleCodeSubmit}>
                    <div className="flex gap-2 justify-center mb-6">
                      {code.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { inputs.current[idx] = el; }}
                          type="text" inputMode="numeric" maxLength={1}
                          value={digit}
                          onChange={e => handleCodeChange(idx, e.target.value)}
                          onKeyDown={e => handleKeyDown(idx, e)}
                          className="w-11 h-14 text-center text-xl font-bold bg-brand-bg border border-brand-border text-brand-text focus:border-brand-gold focus:outline-none rounded transition-all"
                        />
                      ))}
                    </div>
                    <button type="submit" className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded hover:brightness-110 transition-all tracking-widest uppercase">
                      Continue
                    </button>
                  </form>
                </>
              )}

              {step === 'password' && (
                <>
                  <h1 className="text-2xl font-bold text-brand-text mb-2">New Password</h1>
                  <p className="text-xs text-brand-muted font-sans mb-6">Create a strong password for your account.</p>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          className="w-full bg-brand-bg border border-brand-border py-3 px-4 pr-10 text-brand-text placeholder-brand-muted/30 text-sm focus:border-brand-gold focus:outline-none rounded font-sans"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-gold">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {newPw && (
                        <div className="mt-1.5">
                          <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                            <div className={`h-full ${str.color} transition-all duration-300 rounded-full`} style={{ width: str.w }} />
                          </div>
                          <p className="text-[10px] font-sans text-brand-muted mt-0.5">{str.label}</p>
                        </div>
                      )}
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded hover:brightness-110 transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-60">
                      {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </form>
                </>
              )}

              {step === 'done' && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-brand-gold" />
                  </div>
                  <h1 className="text-2xl font-bold text-brand-text mb-2">Password Reset!</h1>
                  <p className="text-sm text-brand-muted font-sans mb-6">Your password has been updated successfully.</p>
                  <button onClick={() => onNavigate('login')} className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded hover:brightness-110 transition-all tracking-widest uppercase">
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
