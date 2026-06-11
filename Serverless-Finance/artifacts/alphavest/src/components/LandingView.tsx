import { useState, useRef, useEffect } from 'react';
import {
  Shield, Eye, TrendingUp, ArrowRight, BookOpen, X, Palette, Globe2, ChevronDown,
  Phone, Mail, MapPin, CheckCircle2, Star, Linkedin, Twitter, Facebook,
  Bitcoin, TrendingDown, Award, MessageCircle, HelpCircle, Zap, Clock
} from 'lucide-react';
import { ScreenType, UserSession, ColorThemeType } from '../types';
import { INVESTMENT_SECTORS, INVESTMENT_PLANS, FAQ_ITEMS } from '../data';
import LogoIcon from './LogoIcon';
import MarketCharts from './MarketCharts';

interface LandingViewProps {
  onNavigate: (screen: ScreenType) => void;
  session: UserSession;
  onLogout: () => void;
  onUpdateTheme: (theme: ColorThemeType) => void;
}

const THEMES: { key: ColorThemeType; label: string; color: string }[] = [
  { key: 'sovereign', label: 'Sovereign Slate', color: '#f2ca50' },
  { key: 'emperor-purple', label: 'Emperor Purple', color: '#ccaaff' },
  { key: 'emerald-reserve', label: 'Emerald Reserve', color: '#66fca1' },
  { key: 'royal-marine', label: 'Royal Marine', color: '#f7b538' },
];

const STATIC_TICKERS = [
  { symbol: 'BTC', name: 'Bitcoin', coinId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coinId: 'ethereum' },
  { symbol: 'XAU', name: 'Gold', coinId: 'gold' },
  { symbol: 'BNB', name: 'BNB', coinId: 'binancecoin' },
  { symbol: 'SOL', name: 'Solana', coinId: 'solana' },
  { symbol: 'XRP', name: 'Ripple', coinId: 'ripple' },
  { symbol: 'USDT', name: 'Tether', coinId: 'tether' },
  { symbol: 'ADA', name: 'Cardano', coinId: 'cardano' },
  { symbol: 'DOGE', name: 'Dogecoin', coinId: 'dogecoin' },
  { symbol: 'MATIC', name: 'Polygon', coinId: 'matic-network' },
  { symbol: 'LTC', name: 'Litecoin', coinId: 'litecoin' },
];

interface TickerItem {
  symbol: string;
  name: string;
  price: string;
  change: string;
  up: boolean;
}

function useLivePrices(): TickerItem[] {
  const [tickers, setTickers] = useState<TickerItem[]>(
    STATIC_TICKERS.map(t => ({ ...t, price: '—', change: '—', up: true }))
  );

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const data = await fetch('/api/market/prices', { credentials: 'include' }).then(r => r.json());
        if (data.message) return;
        setTickers(STATIC_TICKERS.map(t => {
          const entry = data[t.coinId];
          if (!entry || !entry.usd) return { ...t, price: '—', change: '—', up: true };
          const price: number = entry.usd;
          const change: number = entry.usd_24h_change ?? 0;
          const fmtPrice = price >= 1000
            ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : price >= 1
            ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `$${price.toFixed(4)}`;
          return { ...t, price: fmtPrice, change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, up: change >= 0 };
        }));
      } catch { /* keep static */ }
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => clearInterval(id);
  }, []);

  return tickers;
}

export default function LandingView({ onNavigate, session, onLogout, onUpdateTheme }: LandingViewProps) {
  const [showProspectus, setShowProspectus] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectedSector, setSelectedSector] = useState<typeof INVESTMENT_SECTORS[0] | null>(null);
  const [showComingSoonSector, setShowComingSoonSector] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sectorsRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);

  const tickers = useLivePrices();

  const handleScrollToSectors = () => sectorsRef.current?.scrollIntoView({ behavior: 'smooth' });
  const handleScrollToPlans = () => plansRef.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-serif relative overflow-x-hidden">

      {/* ── Contact Top Bar ── */}
      <div className="bg-brand-surface border-b border-brand-border/60 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 md:px-16 h-10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="tel:+18004258392" className="flex items-center gap-1.5 text-[11px] font-sans text-brand-muted hover:text-brand-gold transition-colors">
              <Phone className="w-3 h-3 text-brand-gold" />
              +1 (800) 425-8392
            </a>
            <a href="mailto:support@alphavest.com" className="flex items-center gap-1.5 text-[11px] font-sans text-brand-muted hover:text-brand-gold transition-colors">
              <Mail className="w-3 h-3 text-brand-gold" />
              support@alphavest.com
            </a>
            <span className="flex items-center gap-1.5 text-[11px] font-sans text-brand-muted">
              <MapPin className="w-3 h-3 text-brand-gold" />
              Suite 2400, Zapposport Financial Centre, 100 Wall St, New York, NY 10005
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="text-brand-muted hover:text-brand-gold transition-colors"><Linkedin className="w-3.5 h-3.5" /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-brand-muted hover:text-brand-gold transition-colors"><Twitter className="w-3.5 h-3.5" /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-brand-muted hover:text-brand-gold transition-colors"><Facebook className="w-3.5 h-3.5" /></a>
          </div>
        </div>
      </div>

      {/* ── Live Crypto Ticker Bar ── */}
      <div className="bg-brand-bg border-b border-brand-border/40 overflow-hidden py-2">
        <div className="flex animate-[marquee_45s_linear_infinite] whitespace-nowrap gap-10 px-4" style={{ minWidth: 'max-content' }}>
          {[...tickers, ...tickers].map((c, i) => (
            <span key={i} className="flex items-center gap-2 text-[11px] font-sans shrink-0">
              <span className="font-bold text-brand-gold">{c.symbol}</span>
              <span className="text-brand-text font-mono">{c.price}</span>
              <span className={c.up ? 'text-green-400' : 'text-red-400'}>
                {c.up ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                {c.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Header ── */}
      <header className="sticky top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 md:px-16 h-16 bg-brand-bg/95 backdrop-blur-md border-b border-brand-border shadow-md">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 cursor-pointer">
          <LogoIcon size={32} />
          <span className="font-serif text-lg font-bold text-brand-gold tracking-wider uppercase">AlphaVest</span>
        </button>

        <nav className="hidden md:flex gap-6 items-center">
          <button onClick={() => onNavigate('landing')} className="font-semibold text-xs tracking-widest text-brand-gold hover:text-brand-gold/80 transition-colors uppercase">Overview</button>
          <button onClick={handleScrollToSectors} className="font-semibold text-xs tracking-widest text-brand-muted hover:text-brand-gold transition-colors uppercase">Sectors</button>
          <button onClick={handleScrollToPlans} className="font-semibold text-xs tracking-widest text-brand-muted hover:text-brand-gold transition-colors uppercase">Plans</button>
          <button onClick={() => session.isLoggedIn ? onNavigate('dashboard') : onNavigate('signup')} className="font-semibold text-xs tracking-widest text-brand-muted hover:text-brand-gold transition-colors uppercase">Invest</button>
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowThemePicker(!showThemePicker)} title="Change Theme" className="text-brand-muted hover:text-brand-gold transition-colors p-2">
              <Palette className="w-4 h-4 text-brand-gold/80" />
            </button>
            {showThemePicker && (
              <div className="absolute right-0 top-11 bg-brand-surface border border-brand-border rounded shadow-xl py-2 w-52 z-50">
                <p className="px-3 py-1 font-bold text-brand-gold uppercase tracking-wider text-[9px] border-b border-brand-border/40 mb-1 font-sans">Select Theme</p>
                {THEMES.map(t => (
                  <button key={t.key} onClick={() => { onUpdateTheme(t.key); setShowThemePicker(false); }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-brand-bg transition-colors text-[11px] font-sans ${session.theme === t.key ? 'text-brand-gold font-bold' : 'text-brand-text'}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.label}
                    {session.theme === t.key && <span className="ml-auto text-brand-gold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {session.isLoggedIn ? (
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigate('dashboard')} className="w-8 h-8 rounded-full bg-brand-gold-dark text-brand-bg font-bold text-xs flex items-center justify-center border border-brand-gold hover:brightness-110 transition-all" title="Go to Dashboard">
                {session.fullName.substring(0, 2).toUpperCase()}
              </button>
              <button onClick={onLogout} className="hidden lg:inline text-[10px] uppercase font-semibold text-brand-muted hover:text-brand-gold border border-brand-border px-2 py-1 rounded transition-colors font-sans">Logout</button>
            </div>
          ) : (
            <button onClick={() => onNavigate('login')} className="bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/40 text-[11px] font-bold tracking-widest uppercase px-4 py-2 rounded transition-all font-sans">
              Sign In
            </button>
          )}
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative min-h-[780px] flex items-center px-6 md:px-16 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-35 pointer-events-none">
            <img alt="Finance district skyline" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80" />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/20 via-brand-bg/60 to-brand-bg" />
          </div>
          <div className="relative z-10 max-w-4xl pt-12 md:pt-0">
            <span className="text-brand-gold text-xs tracking-[0.25em] font-bold mb-4 block uppercase font-sans">Trusted Wealth Platform · Certified in Zapposport</span>
            <h1 className="text-4xl md:text-6xl md:leading-[72px] font-bold text-brand-text mb-6">
              Secure and Steady <br />
              <span className="text-brand-gold italic font-serif">Wealth Growth</span>
            </h1>
            <p className="text-base md:text-lg text-brand-muted/90 max-w-2xl mb-10 leading-relaxed">
              Grow and protect your wealth with AlphaVest. Professional investment plans focused on steady returns, transparent reporting, and effortless tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => session.isLoggedIn ? onNavigate('dashboard') : onNavigate('signup')}
                className="bg-brand-gold text-brand-bg px-10 py-4 text-xs font-bold font-sans rounded uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 inline-flex items-center justify-center gap-2">
                {session.isLoggedIn ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowProspectus(true)}
                className="border border-brand-border text-brand-text px-10 py-4 text-xs font-bold font-sans rounded uppercase tracking-widest hover:bg-brand-surface transition-all active:scale-95 inline-flex items-center justify-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-brand-gold" /> View Prospectus
              </button>
            </div>
          </div>
          <button onClick={handleScrollToSectors} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-brand-muted hover:text-brand-gold transition-colors animate-bounce" aria-label="Scroll down">
            <ChevronDown className="w-6 h-6" />
          </button>
        </section>

        {/* ── Stats ── */}
        <section className="py-16 px-6 md:px-16 bg-brand-bg border-y border-brand-border">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '$2.4B+', label: 'Assets Under Management' },
              { value: '18,500+', label: 'Active Investors' },
              { value: '40+', label: 'Global Markets' },
              { value: '99.9%', label: 'Platform Uptime' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold text-brand-gold mb-2">{stat.value}</div>
                <div className="text-xs text-brand-muted font-sans tracking-wide uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why AlphaVest ── */}
        <section id="why" className="py-24 px-6 md:px-16 bg-brand-bg">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-brand-gold text-xs tracking-widest font-bold block uppercase mb-2 font-sans">Secure & Trusted</span>
              <h2 className="text-3xl md:text-4xl text-brand-text mb-4">Why Choose AlphaVest</h2>
              <div className="h-[1px] w-24 bg-brand-gold mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 border border-brand-border bg-brand-surface/50 p-8 md:p-10 flex flex-col justify-between group hover:border-brand-gold/60 transition-all duration-500 rounded">
                <div>
                  <div className="w-12 h-12 rounded bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 mb-6"><Shield className="text-brand-gold w-6 h-6" /></div>
                  <h3 className="text-xl md:text-2xl font-semibold mb-4 text-brand-text">Bank-Level Security</h3>
                  <p className="text-brand-muted text-sm md:text-base leading-relaxed max-w-xl">Multi-layer encryption, cold storage, and regular audits. Your capital is protected by the same standards used by the world's leading financial institutions.</p>
                </div>
                <button onClick={() => setShowProspectus(true)} className="mt-8 flex items-center text-brand-gold text-xs font-bold tracking-widest gap-2 group-hover:translate-x-2 transition-transform uppercase font-sans">
                  Learn About Our Security <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="border border-brand-border bg-brand-surface/50 p-8 md:p-10 group hover:border-brand-gold/60 transition-all duration-500 rounded">
                <div className="w-12 h-12 rounded bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 mb-6"><Eye className="text-brand-gold w-6 h-6" /></div>
                <h3 className="text-xl mb-4 text-brand-text">100% Transparency</h3>
                <p className="text-brand-muted text-sm leading-relaxed">Real-time reports, clear progress logs, and full audit trails. Know exactly where your money is at every moment.</p>
              </div>
              <div className="border border-brand-border bg-brand-surface/50 p-8 md:p-10 group hover:border-brand-gold/60 transition-all duration-500 rounded">
                <div className="w-12 h-12 rounded bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 mb-6"><TrendingUp className="text-brand-gold w-6 h-6" /></div>
                <h3 className="text-xl mb-4 text-brand-text">Steady Growth</h3>
                <p className="text-brand-muted text-sm leading-relaxed">Customized investment plans built to deliver the highest possible returns while maintaining a balanced, risk-adjusted framework.</p>
              </div>
              <div className="md:col-span-2 border border-brand-border bg-brand-surface/50 p-8 md:p-10 group hover:border-brand-gold/60 transition-all duration-500 rounded relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80" alt="Global" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-brand-surface/80" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 mb-6"><Globe2 className="text-brand-gold w-6 h-6" /></div>
                  <h3 className="text-xl mb-4 text-brand-text">Global Market Access</h3>
                  <p className="text-brand-muted text-sm leading-relaxed max-w-lg">Access to multi-asset opportunities spanning equities, commodities, digital assets, and real estate across 40+ global markets — all from a single account.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Investment Plans ── */}
        <section id="plans" ref={plansRef} className="py-24 px-6 md:px-16 bg-brand-surface/20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-brand-gold text-xs tracking-widest font-bold block uppercase mb-2 font-sans">Structured Returns</span>
              <h2 className="text-3xl md:text-4xl text-brand-text mb-4">Investment Plans</h2>
              <div className="h-[1px] w-24 bg-brand-gold mx-auto mb-4" />
              <p className="text-brand-muted text-sm max-w-xl mx-auto font-sans">Choose the plan that fits your financial goals. All plans include 24/7 monitoring, real-time reporting, and dedicated support.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {INVESTMENT_PLANS.map(plan => (
                <div key={plan.id}
                  className={`relative bg-brand-surface border-2 rounded-xl overflow-hidden transition-all duration-500 flex flex-col ${plan.colorClass} ${plan.popular ? 'shadow-2xl shadow-brand-gold/10 scale-[1.02]' : ''}`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-brand-gold" />
                  )}
                  <div className="p-7 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-xl font-serif font-bold text-brand-text mb-1">{plan.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-sans font-bold px-2.5 py-1 rounded-full border ${plan.badgeClass}`}>
                            {plan.badge}
                          </span>
                        </div>
                      </div>
                      {plan.popular && <Star className="w-5 h-5 text-brand-gold fill-brand-gold shrink-0 mt-1" />}
                    </div>

                    <div className="bg-brand-bg/60 rounded-lg px-5 py-4 mb-6 border border-brand-border/60">
                      <p className="text-[10px] text-brand-muted font-sans uppercase tracking-wider mb-1">Investment Range</p>
                      <p className="text-sm font-sans text-brand-text font-semibold">${plan.minAmount.toLocaleString()} — {plan.maxAmountLabel}</p>
                    </div>

                    <div className="text-center mb-6">
                      <p className="text-2xl font-bold text-brand-gold">{plan.rateLabel}</p>
                      <p className="text-xs text-brand-muted font-sans mt-1">{plan.rateDetail}</p>
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                          <span className="text-brand-muted font-sans leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => session.isLoggedIn ? onNavigate('dashboard') : onNavigate('signup')}
                      className={`w-full py-3.5 rounded-lg font-sans font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${plan.popular ? 'bg-brand-gold text-brand-bg hover:brightness-110 shadow-lg shadow-brand-gold/20' : 'border border-brand-border text-brand-text hover:border-brand-gold hover:text-brand-gold bg-brand-bg/40'}`}>
                      {session.isLoggedIn ? 'Invest Now' : 'Get Started'} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-brand-muted font-sans mt-8 max-w-xl mx-auto">
              * All investment plans are subject to terms and conditions. Returns are not guaranteed. Please read the prospectus carefully before investing.
            </p>
          </div>
        </section>

        {/* ── Investment Sectors ── */}
        <section id="sectors" ref={sectorsRef} className="py-24 px-6 md:px-16 bg-brand-bg">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-brand-gold text-xs tracking-widest font-bold block uppercase mb-2 font-sans">Diversify Your Portfolio</span>
              <h2 className="text-3xl md:text-4xl text-brand-text mb-4">Investment Sectors</h2>
              <div className="h-[1px] w-24 bg-brand-gold mx-auto mb-4" />
              <p className="text-brand-muted text-sm max-w-xl mx-auto font-sans">AlphaVest offers access to a curated selection of high-performing sectors, each carefully vetted and monitored for risk-adjusted returns.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {INVESTMENT_SECTORS.map(sector => (
                <div
                  key={sector.id}
                  onClick={() => sector.comingSoon ? setShowComingSoonSector(sector.title) : setSelectedSector(sector)}
                  className="group relative overflow-hidden rounded-xl border border-brand-border hover:border-brand-gold/50 cursor-pointer transition-all duration-300 h-56"
                >
                  <img src={sector.imageUrl} alt={sector.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-[9px] text-brand-gold font-sans uppercase tracking-widest font-bold mb-0.5">{sector.category}</div>
                    <div className="text-base font-semibold text-brand-text mb-2">{sector.title}</div>
                    {sector.comingSoon ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold text-brand-muted border border-brand-border px-2.5 py-1 rounded bg-brand-bg/60">
                        <Clock className="w-3 h-3" /> Coming Soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold text-brand-gold border border-brand-gold/30 px-2.5 py-1 rounded bg-brand-gold/10">
                        <Zap className="w-3 h-3" /> {(sector.defaultDailyROI * 100).toFixed(2)}% Daily ROI
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live Market Charts ── */}
        <section className="py-20 px-6 md:px-16 bg-brand-surface/20 border-y border-brand-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-brand-gold text-xs tracking-widest font-bold block uppercase mb-2 font-sans">Real-Time Data</span>
              <h2 className="text-3xl md:text-4xl text-brand-text mb-4">Live Market Prices</h2>
              <div className="h-[1px] w-24 bg-brand-gold mx-auto mb-4" />
              <p className="text-brand-muted text-sm max-w-xl mx-auto font-sans">Track live crypto and gold prices. AlphaVest invests your capital in these markets and more — with full transparency.</p>
            </div>
            <MarketCharts />
          </div>
        </section>

        {/* ── Payment Methods ── */}
        <section className="py-16 px-6 md:px-16 bg-brand-surface/20 border-y border-brand-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-brand-gold text-xs tracking-widest font-bold block uppercase mb-2 font-sans">Trusted & Verified</span>
              <h2 className="text-2xl md:text-3xl text-brand-text mb-3">Deposit & Withdrawal Methods</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Paystack', desc: 'Card & bank transfer', icon: '💳' },
                { name: 'Flutterwave', desc: 'Global payments', icon: '🌍' },
                { name: 'Monnify', desc: 'NGN bank transfer', icon: '🏦' },
                { name: 'Crypto', desc: 'BTC · ETH · USDT · SOL', icon: '₿' },
              ].map(m => (
                <div key={m.name} className="bg-brand-surface border border-brand-border rounded-lg p-4 text-center hover:border-brand-gold/40 transition-colors">
                  <div className="text-2xl mb-2">{m.icon}</div>
                  <div className="text-sm font-semibold text-brand-text mb-1">{m.name}</div>
                  <div className="text-[11px] text-brand-muted font-sans">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-24 px-6 md:px-16 bg-brand-bg">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <span className="text-brand-gold text-xs tracking-widest font-bold block uppercase mb-2 font-sans">Got Questions?</span>
              <h2 className="text-3xl md:text-4xl text-brand-text mb-4">Frequently Asked Questions</h2>
              <div className="h-[1px] w-24 bg-brand-gold mx-auto" />
            </div>
            <div className="space-y-3">
              {FAQ_ITEMS.map((faq, i) => (
                <div key={i} className={`border rounded-lg overflow-hidden transition-all ${openFaq === i ? 'border-brand-gold/40' : 'border-brand-border'}`}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className={`w-4 h-4 shrink-0 ${openFaq === i ? 'text-brand-gold' : 'text-brand-muted'}`} />
                      <span className={`text-sm font-semibold ${openFaq === i ? 'text-brand-gold' : 'text-brand-text'}`}>{faq.q}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-brand-muted shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-4 pl-13">
                      <p className="text-sm text-brand-muted font-sans leading-relaxed pl-7">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-6 md:px-16 bg-brand-surface/30 text-center">
          <div className="max-w-2xl mx-auto">
            <Award className="w-12 h-12 text-brand-gold mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold text-brand-text mb-4">Start Building Wealth Today</h2>
            <p className="text-brand-muted text-base font-sans mb-10 max-w-lg mx-auto">Join over 18,500 investors who trust AlphaVest to grow and protect their capital with professional, institutional-grade investment management.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => session.isLoggedIn ? onNavigate('dashboard') : onNavigate('signup')}
                className="bg-brand-gold text-brand-bg px-10 py-4 text-xs font-bold font-sans rounded uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 inline-flex items-center justify-center gap-2"
              >
                {session.isLoggedIn ? 'Go to Dashboard' : 'Open Free Account'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowProspectus(true)}
                className="border border-brand-border text-brand-text px-10 py-4 text-xs font-bold font-sans rounded uppercase tracking-widest hover:bg-brand-surface transition-all active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-3.5 h-3.5 text-brand-gold" /> View Prospectus
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-brand-surface border-t border-brand-border px-6 md:px-16 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <LogoIcon size={28} />
              <span className="font-serif text-base font-bold text-brand-gold tracking-wider uppercase">AlphaVest</span>
            </div>
            <p className="text-brand-muted text-sm font-sans leading-relaxed max-w-sm">Professional investment management for discerning investors. AlphaVest is committed to delivering consistent, risk-adjusted returns through disciplined portfolio management.</p>
          </div>
          <div>
            <h4 className="text-brand-text font-semibold text-sm mb-4 uppercase tracking-widest text-[11px]">Platform</h4>
            <ul className="space-y-2">
              {['Investment Plans', 'Sectors', 'Analytics', 'Ledger'].map(item => (
                <li key={item}><a href="#" className="text-brand-muted hover:text-brand-gold transition-colors text-sm font-sans">{item}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-brand-text font-semibold text-sm mb-4 uppercase tracking-widest text-[11px]">Support</h4>
            <ul className="space-y-2">
              <li><a href="mailto:support@alphavest.com" className="text-brand-muted hover:text-brand-gold transition-colors text-sm font-sans">support@alphavest.com</a></li>
              <li><a href="tel:+18004258392" className="text-brand-muted hover:text-brand-gold transition-colors text-sm font-sans">+1 (800) 425-8392</a></li>
              <li><span className="text-brand-muted text-sm font-sans">Mon–Fri, 9AM–6PM EST</span></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-brand-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-brand-muted text-[11px] font-sans">© {new Date().getFullYear()} AlphaVest. All rights reserved. Investment involves risk.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
              <a key={item} href="#" className="text-brand-muted hover:text-brand-gold transition-colors text-[11px] font-sans">{item}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Modals ── */}

      {/* Sector modal */}
      {selectedSector && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSector(null)}>
          <div className="bg-brand-surface border border-brand-border rounded-xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-48 relative">
              <img src={selectedSector.imageUrl} alt={selectedSector.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/90 to-transparent" />
              <button onClick={() => setSelectedSector(null)} className="absolute top-3 right-3 bg-brand-bg/60 text-brand-muted hover:text-brand-gold rounded-full p-1.5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-[10px] text-brand-gold font-sans uppercase tracking-widest font-bold mb-1">{selectedSector.category}</div>
              <h3 className="text-xl font-bold text-brand-text mb-3">{selectedSector.title}</h3>
              <p className="text-brand-muted text-sm font-sans leading-relaxed mb-5">{selectedSector.description}</p>
              <div className="flex items-center justify-between bg-brand-bg border border-brand-border rounded-lg p-3 mb-5">
                <span className="text-xs text-brand-muted font-sans">Daily ROI</span>
                <span className="text-lg font-bold text-brand-gold">{(selectedSector.defaultDailyROI * 100).toFixed(2)}%</span>
              </div>
              <button
                onClick={() => { setSelectedSector(null); session.isLoggedIn ? onNavigate('dashboard') : onNavigate('signup'); }}
                className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {session.isLoggedIn ? 'Invest Now' : 'Create Account'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon */}
      {showComingSoonSector && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowComingSoonSector(null)}>
          <div className="bg-brand-surface border border-brand-border rounded-xl max-w-sm w-full shadow-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-7 h-7 text-brand-gold" />
            </div>
            <h3 className="text-xl font-bold text-brand-text mb-2">Coming Soon</h3>
            <p className="text-sm text-brand-muted font-sans leading-relaxed mb-6">
              <span className="text-brand-gold">{showComingSoonSector}</span> is being onboarded to the platform. You'll be notified when it's live.
            </p>
            <button onClick={() => setShowComingSoonSector(null)} className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3 rounded uppercase tracking-widest hover:brightness-110 transition-all">Got It</button>
          </div>
        </div>
      )}

      {/* Prospectus */}
      {showProspectus && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowProspectus(false)}>
          <div className="bg-brand-surface border border-brand-border rounded-xl w-full max-w-2xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-gold" />
                <h2 className="text-lg font-bold text-brand-text">Investment Prospectus</h2>
              </div>
              <button onClick={() => setShowProspectus(false)} className="text-brand-muted hover:text-brand-gold transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5 text-sm font-sans text-brand-muted leading-relaxed max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="text-brand-text font-bold mb-2">About AlphaVest</h3>
                <p>AlphaVest is a wealth management platform offering access to curated, institutional-grade investment opportunities across multiple sectors including real estate, energy, private equity, and digital assets.</p>
              </div>
              <div>
                <h3 className="text-brand-text font-bold mb-2">Investment Plans & Returns</h3>
                <p>Returns vary by tier: Gold Ore (0.5–1.0% daily), Silver Sterling (1.0–1.5% daily), Platinum Vault (1.5–2.0% daily), Diamond Reserve (2.0%+ daily). All rates are indicative and depend on market conditions.</p>
              </div>
              <div>
                <h3 className="text-brand-text font-bold mb-2">Risk Disclosure</h3>
                <p>All investments carry risk. Past performance is not indicative of future results. The value of investments can go down as well as up. You may receive less than you invest. AlphaVest is not a licensed financial advisor.</p>
              </div>
              <div>
                <h3 className="text-brand-text font-bold mb-2">Withdrawal Policy</h3>
                <p>Withdrawals are processed within 1–3 business days after admin review. Early exit from an active position incurs a 5% penalty on principal. Accrued yield is always returned.</p>
              </div>
              <div>
                <h3 className="text-brand-text font-bold mb-2">KYC / AML</h3>
                <p>In compliance with international regulations, AlphaVest requires identity verification (KYC) for accounts above certain thresholds. We do not process funds from sanctioned jurisdictions.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
