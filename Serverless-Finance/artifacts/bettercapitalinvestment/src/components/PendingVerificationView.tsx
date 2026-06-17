import { useState } from 'react';
import { Clock, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { ScreenType } from '../types';
import LogoIcon from './LogoIcon';

interface PendingVerificationViewProps {
  onNavigate: (screen: ScreenType) => void;
}

export default function PendingVerificationView({ onNavigate }: PendingVerificationViewProps) {
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
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="bg-brand-surface border border-brand-border rounded-lg shadow-2xl overflow-hidden">
            <div className="h-[3px] bg-brand-gold" />
            <div className="p-6 sm:p-8 md:p-10 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-brand-gold/10 border border-brand-gold/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-brand-gold" />
                </div>
                <h1 className="text-2xl sm:text-3xl text-brand-text font-serif mb-2">Account Under Review</h1>
                <p className="text-sm text-brand-muted font-sans">Thank you for signing up! Our team is currently reviewing your account. You'll receive an email confirmation once your account is approved.</p>
              </div>

              <div className="bg-brand-bg/60 border border-brand-border/60 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-brand-text font-sans mb-1">Check Your Email</p>
                    <p className="text-xs text-brand-muted font-sans">We've sent a verification email to your registered email address. Please keep an eye on your inbox (and spam folder just in case).</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('login')}
                className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded-lg hover:brightness-110 transition-all tracking-widest uppercase"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
