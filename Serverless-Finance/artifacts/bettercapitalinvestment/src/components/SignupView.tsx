import { useState, FormEvent } from 'react';
import { Lock, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, Upload, Phone } from 'lucide-react';
import { ScreenType } from '../types';
import LogoIcon from './LogoIcon';
import { useSignup } from '@workspace/api-client-react';
import LegalModal from './LegalModal';

type SignupUser = { email: string; fullName: string; tier: string; theme: string; biometricEnabled: boolean; isAdmin?: boolean; emailVerified?: boolean; isVerified?: boolean };

interface SignupViewProps {
  onNavigate: (screen: ScreenType) => void;
  onSignupSuccess: (emailOrUser: string | SignupUser) => void;
}

export default function SignupView({ onNavigate, onSignupSuccess }: SignupViewProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const signupMutation = useSignup();

  const passwordStrength = () => {
    if (!password) return { label: '', color: '', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
    if (password.length < 10) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'Good', color: 'bg-blue-400', width: '75%' };
    return { label: 'Strong', color: 'bg-brand-gold', width: '100%' };
  };

  const strength = passwordStrength();

  const openLegal = (type: 'terms' | 'privacy') => {
    setAgreed(true);
    setLegalModal(type);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setKycFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorText('');
    if (!fullName.trim()) { setErrorText('Please enter your full name.'); return; }
    if (!email.trim()) { setErrorText('Please enter your email address.'); return; }
    if (!phoneNumber.trim()) { setErrorText('Please enter your phone number.'); return; }
    if (!password) { setErrorText('Please create a password.'); return; }
    if (password.length < 8) { setErrorText('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setErrorText('Passwords do not match.'); return; }
    if (!kycFile) { setErrorText('Please upload a KYC document.'); return; }
    if (!agreed) { setErrorText('Please agree to the terms and conditions.'); return; }

    try {
      const userData = await signupMutation.mutateAsync({ data: { email, password, fullName } });

      onSignupSuccess({
        ...userData as SignupUser,
        isVerified: false
      });
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string } } };
      if (anyErr?.response?.data?.message?.includes('already')) {
        setErrorText('An account with this email already exists. Please sign in.');
      } else {
        setErrorText('Failed to create account. Please try again.');
      }
    }
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
        <div className="w-full max-w-sm sm:max-w-[480px]">
          <div className="bg-brand-surface border border-brand-border rounded-lg shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-brand-gold" />
            <div className="p-6 sm:p-8 md:p-10">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl text-brand-text font-serif mb-1">Open Your Account</h1>
                <p className="text-xs text-brand-muted font-sans tracking-wide uppercase">Join thousands of investors growing their wealth</p>
              </div>

              {errorText && (
                <div className="mb-4 bg-red-950/40 border border-red-500/30 text-red-300 text-xs py-2.5 px-3 rounded font-sans leading-relaxed">
                  {errorText}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1">
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Sterling"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="name"
                    className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded-lg transition-all font-sans"
                  />
                </div>

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
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      autoComplete="tel"
                      className="w-full bg-brand-bg border border-brand-border py-3 pl-11 pr-4 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded-lg transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-brand-bg border border-brand-border py-3 px-4 pr-11 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded-lg transition-all font-sans"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-gold p-1">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5">
                      <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300 rounded-full`} style={{ width: strength.width }} />
                      </div>
                      <p className="text-[10px] font-sans text-brand-muted mt-0.5">{strength.label}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full bg-brand-bg border border-brand-border py-3 px-4 pr-11 text-brand-text placeholder-brand-muted/30 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold/20 rounded-lg transition-all font-sans"
                    />
                    {confirmPassword && password === confirmPassword && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider">KYC Document</label>
                  <div className="relative border-2 border-dashed border-brand-border bg-brand-bg rounded-lg p-6 hover:border-brand-gold/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="text-center">
                      {kycFile ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                          <p className="text-sm text-brand-text font-medium">{kycFile.name}</p>
                          <p className="text-xs text-brand-muted font-sans mt-1">{(kycFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-brand-gold mx-auto mb-2" />
                          <p className="text-sm text-brand-text font-medium">Upload KYC Document</p>
                          <p className="text-xs text-brand-muted font-sans mt-1">Passport, Driver's License, or Utility Bill (PDF or Image)</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="relative mt-0.5 shrink-0 cursor-pointer"
                    onClick={() => setAgreed(v => !v)}
                  >
                    <div className={`w-4 h-4 border rounded transition-all flex items-center justify-center ${agreed ? 'bg-brand-gold border-brand-gold' : 'border-brand-border bg-brand-bg'}`}>
                      {agreed && <CheckCircle2 className="w-3 h-3 text-brand-bg" />}
                    </div>
                  </div>
                  <span className="text-xs text-brand-muted font-sans leading-relaxed">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => openLegal('terms')}
                      className="text-brand-gold hover:underline underline-offset-2 transition-all"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={() => openLegal('privacy')}
                      className="text-brand-gold hover:underline underline-offset-2 transition-all"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={signupMutation.isPending}
                    className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-brand-gold/10"
                  >
                    {signupMutation.isPending ? <><Loader2 className="animate-spin w-4 h-4" /><span>Creating Account...</span></> : <><Lock className="w-3.5 h-3.5" /><span>Create Account</span></>}
                  </button>
                </div>
              </form>

              <div className="mt-5 pt-4 border-t border-brand-border/40 text-center">
                <p className="text-xs text-brand-muted font-sans">
                  Already have an account?{' '}
                  <button onClick={() => onNavigate('login')} className="text-brand-gold hover:opacity-70 transition-opacity">Sign In</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
