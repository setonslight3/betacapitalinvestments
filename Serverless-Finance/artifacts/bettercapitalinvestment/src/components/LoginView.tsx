import { useState, FormEvent } from 'react';
import { Lock, Fingerprint, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { ScreenType } from '../types';
import LogoIcon from './LogoIcon';
import { useLogin } from '@workspace/api-client-react';
import { startAuthentication } from '@simplewebauthn/browser';
import LegalModal from './LegalModal';

interface LoginViewProps {
  onNavigate: (screen: ScreenType) => void;
  onLoginSuccess: (user: { email: string; fullName: string; tier: string; theme: string; biometricEnabled: boolean; isAdmin?: boolean }) => void;
}

export default function LoginView({ onNavigate, onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [biometricEmail, setBiometricEmail] = useState('');
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const loginMutation = useLogin();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorText('');
    if (!email.trim()) { setErrorText('Please enter your email address.'); return; }
    if (!password) { setErrorText('Please enter your password.'); return; }

    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          onLoginSuccess({
            email: data.email,
            fullName: data.fullName,
            tier: data.tier,
            theme: data.theme,
            biometricEnabled: data.biometricEnabled,
            isAdmin: (data as { isAdmin?: boolean }).isAdmin,
          });
        },
        onError: () => {
          setErrorText('Invalid email or password. Please try again.');
        },
      }
    );
  };

  const handleBiometricLogin = async () => {
    if (!biometricEmail.trim()) { setErrorText('Enter your email first.'); return; }
    setBiometricLoading(true);
    setErrorText('');
    try {
      const optR = await fetch('/api/auth/biometric/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: biometricEmail }),
        credentials: 'include',
      });
      if (!optR.ok) {
        const d = await optR.json();
        setErrorText(d.message ?? 'Biometric login not set up for this account.');
        setShowBiometricModal(false);
        setBiometricLoading(false);
        return;
      }
      const options = await optR.json();
      const response = await startAuthentication({ optionsJSON: options });
      const verifyR = await fetch('/api/auth/biometric/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
        credentials: 'include',
      });
      const data = await verifyR.json();
      if (!verifyR.ok) { setErrorText(data.message ?? 'Biometric verification failed.'); setBiometricLoading(false); setShowBiometricModal(false); return; }
      setShowBiometricModal(false);
      onLoginSuccess({
        email: data.email,
        fullName: data.fullName,
        tier: data.tier,
        theme: data.theme,
        biometricEnabled: data.biometricEnabled,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setErrorText('Biometric authentication was cancelled.');
      } else {
        setErrorText('Biometric login failed. Please use your password.');
      }
      setShowBiometricModal(false);
    }
    setBiometricLoading(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-serif">
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 md:px-16 h-14 sm:h-16 bg-brand-bg/95 backdrop-blur-md border-b border-brand-border">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <LogoIcon size={24} />
          <span className="font-serif text-base font-bold text-brand-gold tracking-wider uppercase">BetterCapitalInvestment</span>
        </button>
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-1.5 text-brand-muted hover:text-brand-gold transition-colors text-xs font-sans">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pt-20 pb-8">
        <div className="w-full max-w-sm sm:max-w-[440px]">
          <div className="bg-brand-surface border border-brand-border rounded-lg shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-brand-gold w-full" />
            <div className="p-6 sm:p-8 md:p-10">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl text-brand-text font-serif mb-1">Welcome Back</h1>
                <p className="text-xs text-brand-muted font-sans tracking-wide uppercase">Sign in to your investment account</p>
              </div>

              {errorText && (
                <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs py-2.5 px-3 rounded font-sans leading-relaxed">
                  {errorText}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded-lg transition-all font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">Password</label>
                    <button type="button" onClick={() => onNavigate('forgot-password')} className="text-[11px] font-sans text-brand-gold hover:opacity-70 transition-opacity">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full bg-brand-bg border border-brand-border py-3 px-4 pr-11 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded-lg transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-gold transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-brand-gold/10"
                >
                  {loginMutation.isPending ? <><Loader2 className="animate-spin w-4 h-4" /><span>Signing In...</span></> : <><Lock className="w-3.5 h-3.5" /><span>Sign In</span></>}
                </button>
              </form>

              <button
                type="button"
                onClick={() => { setBiometricEmail(email); setShowBiometricModal(true); }}
                className="w-full mt-3 flex items-center justify-center gap-2 border border-brand-border/60 text-brand-muted hover:border-brand-gold/40 hover:text-brand-gold text-xs font-sans py-3 rounded-lg transition-all"
              >
                <Fingerprint className="w-4 h-4" />
                Sign In with Biometrics
              </button>

              <div className="mt-5 pt-4 border-t border-brand-border/40 text-center">
                <p className="text-[11px] text-brand-muted font-sans mb-3">Don't have an account?</p>
                <button onClick={() => onNavigate('signup')} className="w-full border border-brand-border text-brand-text font-sans font-semibold text-xs py-3 rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all tracking-widest uppercase">
                  Create Account
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[10px] text-brand-muted/60 font-sans">
                  By signing in you agree to our{' '}
                  <button onClick={() => setLegalModal('terms')} className="text-brand-muted hover:text-brand-gold underline-offset-2 hover:underline transition-all">Terms</button>
                  {' & '}
                  <button onClick={() => setLegalModal('privacy')} className="text-brand-muted hover:text-brand-gold underline-offset-2 hover:underline transition-all">Privacy Policy</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showBiometricModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-brand-surface border border-brand-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-sm overflow-hidden sheet-up sm:animate-none">
            <div className="h-[2px] bg-brand-gold" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg text-brand-text font-serif flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-brand-gold" /> Biometric Sign In
                </h3>
                <button onClick={() => setShowBiometricModal(false)} className="text-brand-muted hover:text-brand-gold text-xl leading-none px-1 py-1">×</button>
              </div>
              <p className="text-xs text-brand-muted font-sans mb-4 leading-relaxed">Confirm your email to use your device biometric (fingerprint or Face ID).</p>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={biometricEmail}
                onChange={e => setBiometricEmail(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none rounded-lg font-sans mb-4"
              />
              <button
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded-lg hover:brightness-110 transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {biometricLoading ? <><Loader2 className="animate-spin w-4 h-4" /><span>Verifying...</span></> : <><Fingerprint className="w-4 h-4" /><span>Authenticate</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
