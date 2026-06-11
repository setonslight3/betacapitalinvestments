import { useState, useEffect } from 'react';
import { ScreenType, UserSession, ColorThemeType } from './types';
import LandingView from './components/LandingView';
import LoginView from './components/LoginView';
import SignupView from './components/SignupView';
import DashboardView from './components/DashboardView';
import OTPVerifyView from './components/OTPVerifyView';
import ForgotPasswordView from './components/ForgotPasswordView';
import AdminDashboard from './components/AdminDashboard';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';

const THEME_COOKIE = 'alphavest_theme';

function getThemeCookie(): ColorThemeType {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
    const val = match ? decodeURIComponent(match[1]) : null;
    const valid: ColorThemeType[] = ['sovereign', 'royal-marine', 'emerald-reserve', 'emperor-purple'];
    return (valid.includes(val as ColorThemeType) ? val : 'sovereign') as ColorThemeType;
  } catch {
    return 'sovereign';
  }
}

function setThemeCookie(theme: ColorThemeType) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${THEME_COOKIE}=${theme};max-age=${maxAge};path=/;SameSite=Lax`;
}

function applyTheme(theme: string) {
  const themes = ['theme-sovereign', 'theme-emperor-purple', 'theme-emerald-reserve', 'theme-royal-marine'];
  document.documentElement.classList.remove(...themes);
  document.documentElement.classList.add(`theme-${theme || 'sovereign'}`);
}

const DEFAULT_SESSION: UserSession = {
  fullName: '',
  email: '',
  isLoggedIn: false,
  biometricEnabled: false,
  tier: 'Gold Ore',
  theme: getThemeCookie(),
};

// Apply saved theme immediately (before React renders) to avoid flash
applyTheme(DEFAULT_SESSION.theme);

// Inject tawk.to live chat widget
function injectTawkTo() {
  const TAWK_PROPERTY_ID = 'YOUR_TAWK_PROPERTY_ID'; // Replace with your tawk.to property ID
  if (TAWK_PROPERTY_ID === 'YOUR_TAWK_PROPERTY_ID') return; // Skip if not configured
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.async = true;
  s.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/default`;
  s.charset = 'UTF-8';
  s.setAttribute('crossorigin', '*');
  document.head.appendChild(s);
}

type SignupUser = { email: string; fullName: string; tier: string; theme: string; biometricEnabled: boolean; isAdmin?: boolean; emailVerified?: boolean };

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('landing');
  const [session, setSession] = useState<UserSession>(DEFAULT_SESSION);
  const [authChecked, setAuthChecked] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [globalError, setGlobalError] = useState('');

  const { data: me, isLoading: meLoading } = useGetMe({
    query: { retry: false, queryKey: getGetMeQueryKey() },
  });

  // Apply theme whenever session theme changes
  useEffect(() => {
    applyTheme(session.theme);
    setThemeCookie(session.theme);
  }, [session.theme]);

  // Inject Tawk.to chat widget once on mount
  useEffect(() => { injectTawkTo(); }, []);

  // Check for Google OAuth redirect result or deposit success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_auth') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
    const authErr = params.get('auth_error');
    if (authErr) {
      window.history.replaceState({}, '', window.location.pathname);
      const msg = authErr === 'not_configured'
        ? 'Google sign-in is not yet configured. Please use email & password.'
        : authErr === 'no_email'
        ? 'Google account has no email. Please use email & password.'
        : 'Google sign-in failed. Please use email & password.';
      setGlobalError(msg);
      setTimeout(() => setGlobalError(''), 8000);
    }
    if (params.get('deposit') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Hydrate session from /api/auth/me on load
  useEffect(() => {
    if (meLoading) return;
    if (me) {
      const theme = (me.theme as ColorThemeType) || getThemeCookie() || 'sovereign';
      setSession({
        fullName: me.fullName,
        email: me.email,
        isLoggedIn: true,
        biometricEnabled: me.biometricEnabled,
        tier: me.tier,
        theme,
        isAdmin: (me as { isAdmin?: boolean }).isAdmin,
        emailVerified: (me as { emailVerified?: boolean }).emailVerified,
        avatarUrl: (me as { avatarUrl?: string }).avatarUrl,
      });
      if (currentScreen === 'landing' || currentScreen === 'login' || currentScreen === 'signup') {
        const isAdmin = (me as { isAdmin?: boolean }).isAdmin;
        setCurrentScreen(isAdmin ? 'admin' : 'dashboard');
      }
    }
    setAuthChecked(true);
  }, [me, meLoading]);

  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleUpdateTheme = (theme: ColorThemeType) => {
    setSession(prev => ({ ...prev, theme }));
  };

  const handleUpdateSession = (updatedFields: Partial<UserSession>) => {
    setSession(prev => ({ ...prev, ...updatedFields }));
  };

  const handleLoginSuccess = (user: { email: string; fullName: string; tier: string; theme: string; biometricEnabled: boolean; isAdmin?: boolean }) => {
    const theme = (user.theme as ColorThemeType) || getThemeCookie() || 'sovereign';
    setSession({
      fullName: user.fullName,
      email: user.email,
      isLoggedIn: true,
      biometricEnabled: user.biometricEnabled,
      tier: user.tier,
      theme,
      isAdmin: user.isAdmin,
    });
    handleNavigate(user.isAdmin ? 'admin' : 'dashboard');
  };

  const handleSignupSuccess = (emailOrUser: string | SignupUser) => {
    if (typeof emailOrUser === 'string') {
      // Email service active — go to OTP verification screen
      setVerifyEmail(emailOrUser);
      handleNavigate('verify-email');
    } else {
      // Auto-verified (no email service) — go directly to dashboard
      handleLoginSuccess(emailOrUser);
    }
  };

  const handleVerified = () => {
    // After email verification, fetch updated session
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(user => {
        if (user?.email) {
          const theme = (user.theme as ColorThemeType) || 'sovereign';
          setSession({
            fullName: user.fullName,
            email: user.email,
            isLoggedIn: true,
            biometricEnabled: user.biometricEnabled,
            tier: user.tier,
            theme,
            isAdmin: user.isAdmin,
            emailVerified: true,
          });
          handleNavigate(user.isAdmin ? 'admin' : 'dashboard');
        } else {
          handleNavigate('login');
        }
      })
      .catch(() => handleNavigate('login'));
  };

  const handleLogout = () => {
    setSession({ ...DEFAULT_SESSION, theme: session.theme });
    handleNavigate('landing');
  };

  if (meLoading && !authChecked) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
      </div>
    );
  }

  const GlobalErrorBanner = globalError ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4">
      <div className="bg-red-950/95 border border-red-500/50 text-red-200 font-sans text-xs px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-sm">
        <span className="shrink-0">⚠️</span>
        <span className="flex-1">{globalError}</span>
        <button onClick={() => setGlobalError('')} className="shrink-0 text-red-400 hover:text-red-200 ml-2 font-bold">✕</button>
      </div>
    </div>
  ) : null;

  switch (currentScreen) {
    case 'landing':
      return <><LandingView onNavigate={handleNavigate} session={session} onLogout={handleLogout} onUpdateTheme={handleUpdateTheme} />{GlobalErrorBanner}</>;
    case 'login':
      return <><LoginView onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />{GlobalErrorBanner}</>;
    case 'signup':
      return <><SignupView onNavigate={handleNavigate} onSignupSuccess={handleSignupSuccess} />{GlobalErrorBanner}</>;
    case 'verify-email':
      return <OTPVerifyView onNavigate={handleNavigate} email={verifyEmail} onVerified={handleVerified} />;
    case 'forgot-password':
      return <ForgotPasswordView onNavigate={handleNavigate} />;
    case 'dashboard':
      if (!session.isLoggedIn) return <LoginView onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      return <DashboardView onNavigate={handleNavigate} session={session} onLogout={handleLogout} onUpdateTheme={handleUpdateTheme} onUpdateSession={handleUpdateSession} />;
    case 'admin':
      if (!session.isLoggedIn || !session.isAdmin) return <LoginView onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />;
      return <AdminDashboard onNavigate={handleNavigate} session={session} onLogout={handleLogout} />;
    default:
      return <LandingView onNavigate={handleNavigate} session={session} onLogout={handleLogout} onUpdateTheme={handleUpdateTheme} />;
  }
}
