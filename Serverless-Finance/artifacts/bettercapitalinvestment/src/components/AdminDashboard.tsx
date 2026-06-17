import { useState, useEffect, FormEvent } from 'react';
import {
  Users, TrendingUp, Wallet, Activity, Settings, Bell, CreditCard,
  BarChart3, Loader2, LogOut, RefreshCw, Edit3, Check, X, ChevronDown,
  Shield, AlertTriangle, CheckCircle2, DollarSign, Layers, FileText,
  Download, ArrowDownLeft, ShieldCheck, Copy
} from 'lucide-react';
import { ScreenType, UserSession } from '../types';
import LogoIcon from './LogoIcon';

interface AdminDashboardProps {
  onNavigate: (screen: ScreenType) => void;
  session: UserSession;
  onLogout: () => void;
}

type AdminTab = 'overview' | 'users' | 'investments' | 'transactions' | 'payments' | 'withdrawals' | 'kyc' | 'notifications' | 'settings';

interface Metrics {
  totalUsers: number;
  verifiedUsers: number;
  activeInvestments: number;
  totalInvestments: number;
  totalAUM: number;
  totalPlatformWealth: number;
  totalROIPaid: number;
  totalDepositsConfirmed: number;
  pendingCryptoPayments: number;
  pendingWithdrawals: number;
  pendingKyc: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

const badge = (status: string) => {
  const c: Record<string, string> = {
    active: 'bg-green-900/40 text-green-300 border-green-500/30',
    success: 'bg-green-900/40 text-green-300 border-green-500/30',
    approved: 'bg-green-900/40 text-green-300 border-green-500/30',
    pending: 'bg-yellow-900/40 text-yellow-300 border-yellow-500/30',
    manual_review: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
    processing: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
    failed: 'bg-red-900/40 text-red-300 border-red-500/30',
    rejected: 'bg-red-900/40 text-red-300 border-red-500/30',
    exited: 'bg-gray-800/40 text-gray-400 border-gray-600/30',
  };
  return `text-[10px] font-sans font-bold px-2 py-0.5 rounded border ${c[status] ?? c.pending}`;
};

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`/api${path}`, { credentials: 'include', ...opts });
  if (!r.ok) throw new Error((await r.json()).message ?? 'Request failed');
  return r.json();
}

export default function AdminDashboard({ onNavigate, session, onLogout }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit states
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editingInv, setEditingInv] = useState<string | null>(null);
  const [userEdits, setUserEdits] = useState<Record<string, string>>({});
  const [invEdits, setInvEdits] = useState<Record<string, string>>({});

  // Withdrawal/KYC action states
  const [withdrawalNote, setWithdrawalNote] = useState<Record<string, string>>({});
  const [kycNote, setKycNote] = useState<Record<number, string>>({});

  // Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [broadcasting, setBroadcasting] = useState(false);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const load = async (t: AdminTab) => {
    setLoading(true); setError('');
    try {
      if (t === 'overview') {
        const m = await apiFetch('/admin/metrics');
        setMetrics(m);
      } else if (t === 'users') {
        setUsers(await apiFetch('/admin/users'));
      } else if (t === 'investments') {
        setInvestments(await apiFetch('/admin/investments'));
      } else if (t === 'transactions') {
        setTransactions(await apiFetch('/admin/transactions'));
      } else if (t === 'payments') {
        setPayments(await apiFetch('/admin/payments'));
      } else if (t === 'withdrawals') {
        setWithdrawals(await apiFetch('/admin/withdrawals'));
      } else if (t === 'kyc') {
        setKycDocs(await apiFetch('/admin/kyc'));
      } else if (t === 'settings') {
        setSettings(await apiFetch('/admin/settings'));
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    onLogout();
  };

  // User edit
  const saveUser = async (id: number) => {
    try {
      const data: any = {};
      if (userEdits.tier) data.tier = userEdits.tier;
      if (userEdits.liquidity !== undefined) data.liquidity = parseFloat(userEdits.liquidity);
      if (userEdits.isAdmin !== undefined) data.isAdmin = userEdits.isAdmin === 'true';
      if (userEdits.emailVerified !== undefined) data.emailVerified = userEdits.emailVerified === 'true';
      if (userEdits.fullName) data.fullName = userEdits.fullName;
      await apiFetch(`/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setEditingUser(null); setUserEdits({});
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
      showFeedback('User updated');
    } catch { setError('Failed to update user'); }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Permanently delete this user?')) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      showFeedback('User deleted');
    } catch { setError('Failed to delete user'); }
  };

  // Investment edit
  const saveInv = async (id: string) => {
    try {
      const data: any = {};
      if (invEdits.status) data.status = invEdits.status;
      if (invEdits.dailyRate) data.dailyRate = parseFloat(invEdits.dailyRate);
      if (invEdits.accruedYield) data.accruedYield = parseFloat(invEdits.accruedYield);
      if (invEdits.amount) data.amount = parseFloat(invEdits.amount);
      await apiFetch(`/admin/investments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setEditingInv(null); setInvEdits({});
      setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
      showFeedback('Investment updated');
    } catch { setError('Failed to update investment'); }
  };

  // Payment action
  const setPaymentStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/admin/payments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      showFeedback(status === 'success' ? 'Payment approved — funds credited' : 'Payment rejected');
    } catch { setError('Failed to update payment'); }
  };

  // Withdrawal action
  const handleWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const adminNote = withdrawalNote[id] ?? '';
      await apiFetch(`/admin/withdrawals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, adminNote }) });
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
      showFeedback(status === 'approved' ? 'Withdrawal approved — user notified' : 'Withdrawal rejected — funds refunded');
    } catch (e: any) { setError(e.message ?? 'Failed to update withdrawal'); }
  };

  // KYC action
  const handleKyc = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const adminNote = kycNote[id] ?? '';
      await apiFetch(`/admin/kyc/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, adminNote }) });
      setKycDocs(prev => prev.map(d => d.id === id ? { ...d, status } : d));
      showFeedback(status === 'approved' ? 'KYC approved — user verified' : 'KYC rejected — user notified');
    } catch (e: any) { setError(e.message ?? 'Failed to update KYC'); }
  };

  // Download KYC file
  const downloadKycFile = (id: number) => {
    window.open(`/api/admin/kyc/${id}/file`, '_blank');
  };

  // Settings save
  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      showFeedback('Settings saved');
    } catch { setError('Failed to save settings'); }
  };

  // Broadcast
  const handleBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;
    setBroadcasting(true);
    try {
      const r = await apiFetch('/admin/notify-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: broadcastTitle, message: broadcastMsg, type: broadcastType }) });
      showFeedback(r.message);
      setBroadcastTitle(''); setBroadcastMsg('');
    } catch { setError('Broadcast failed'); }
    setBroadcasting(false);
  };

  const NAV: { id: AdminTab; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'investments', icon: Layers, label: 'Investments' },
    { id: 'transactions', icon: FileText, label: 'Transactions' },
    { id: 'payments', icon: CreditCard, label: 'Payments', badge: metrics?.pendingCryptoPayments },
    { id: 'withdrawals', icon: ArrowDownLeft, label: 'Withdrawals', badge: metrics?.pendingWithdrawals },
    { id: 'kyc', icon: ShieldCheck, label: 'KYC', badge: metrics?.pendingKyc },
    { id: 'notifications', icon: Bell, label: 'Broadcast' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const inputCls = 'w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text text-xs font-sans focus:border-brand-gold focus:outline-none';

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-serif flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 fixed top-0 left-0 h-full bg-brand-surface border-r border-brand-border z-40">
        <div className="px-5 py-4 border-b border-brand-border">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <LogoIcon size={26} />
            <span className="font-serif text-sm font-bold text-brand-gold tracking-wider uppercase">Admin Panel</span>
          </button>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all ${active ? 'bg-red-950/40 text-red-300 border border-red-500/20' : 'text-brand-muted hover:text-brand-text hover:bg-brand-bg/50'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-sans text-xs tracking-wide">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="ml-auto bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{item.badge}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pb-4 border-t border-brand-border pt-3 space-y-1">
          <div className="px-3 py-2">
            <div className="text-[10px] font-sans uppercase tracking-wider text-brand-muted mb-0.5">Logged in as</div>
            <div className="text-xs text-red-300 font-bold">Admin</div>
            <div className="text-[10px] text-brand-muted font-sans truncate">{session.email}</div>
          </div>
          <button onClick={() => onNavigate('dashboard')} className="w-full flex items-center gap-2 px-3 py-2 rounded text-brand-muted hover:text-brand-text text-xs font-sans transition-colors">
            <Wallet className="w-3.5 h-3.5" /> User Dashboard
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded text-brand-muted hover:text-red-400 text-xs font-sans transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 w-full z-50 flex items-center justify-between px-4 h-14 bg-brand-surface border-b border-brand-border">
        <span className="text-sm font-bold text-red-400 font-sans">Admin</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-brand-muted">
          <ChevronDown className={`w-5 h-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </header>
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-40 bg-brand-surface border-b border-brand-border shadow-xl py-2">
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => { setTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-xs font-sans ${tab === item.id ? 'text-red-300 bg-red-950/30' : 'text-brand-muted'}`}
              >
                <Icon className="w-4 h-4" /> {item.label}
                {item.badge && item.badge > 0 ? <span className="ml-auto bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{item.badge}</span> : null}
              </button>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <main className="md:ml-60 flex-1 pt-14 md:pt-0 min-h-screen">
        {/* Feedback */}
        {feedback && (
          <div className="fixed top-4 right-4 z-50 bg-brand-surface border border-brand-gold/30 rounded shadow-xl px-4 py-3 text-xs font-sans text-brand-text flex items-center gap-2 max-w-xs">
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            {feedback}
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 z-50 bg-red-950/80 border border-red-500/30 rounded shadow-xl px-4 py-3 text-xs font-sans text-red-300 flex items-center gap-2 max-w-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="p-5 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-brand-text capitalize">{tab === 'kyc' ? 'KYC Review' : tab}</h1>
              <p className="text-brand-muted text-xs font-sans mt-0.5">Admin Control Panel</p>
            </div>
            <button onClick={() => load(tab)} disabled={loading} className="flex items-center gap-1.5 text-xs font-sans text-brand-muted hover:text-brand-gold border border-brand-border px-3 py-1.5 rounded transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin w-6 h-6 text-brand-muted" /></div>
          )}

          {/* ── OVERVIEW ── */}
          {!loading && tab === 'overview' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: metrics.totalUsers, sub: `${metrics.verifiedUsers} verified`, color: 'text-blue-400', icon: Users },
                  { label: 'Total AUM', value: fmt(metrics.totalAUM), sub: `${metrics.activeInvestments} active`, color: 'text-brand-gold', icon: TrendingUp },
                  { label: 'Platform Wealth', value: fmt(metrics.totalPlatformWealth), sub: 'liquidity + AUM', color: 'text-green-400', icon: DollarSign },
                  { label: 'ROI Paid Out', value: fmt(metrics.totalROIPaid), sub: 'all time', color: 'text-purple-400', icon: BarChart3 },
                ].map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-brand-surface border border-brand-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-sans text-brand-muted uppercase tracking-wide">{s.label}</p>
                        <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                      </div>
                      <p className={`text-xl font-bold ${s.color} mb-0.5`}>{s.value}</p>
                      <p className="text-[10px] font-sans text-brand-muted">{s.sub}</p>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Deposits Confirmed', value: fmt(metrics.totalDepositsConfirmed), color: 'text-green-400' },
                  { label: 'Pending Crypto Payments', value: metrics.pendingCryptoPayments, color: 'text-yellow-400', action: () => setTab('payments') },
                  { label: 'Pending Withdrawals', value: metrics.pendingWithdrawals, color: 'text-red-400', action: () => setTab('withdrawals') },
                  { label: 'Total Investments', value: metrics.totalInvestments, color: 'text-brand-muted' },
                  { label: 'Pending KYC', value: metrics.pendingKyc, color: 'text-blue-400', action: () => setTab('kyc') },
                  { label: 'Total Users', value: metrics.totalUsers, color: 'text-brand-muted' },
                ].map(s => (
                  <div key={s.label} onClick={s.action} className={`bg-brand-surface border border-brand-border rounded-lg p-4 ${s.action ? 'cursor-pointer hover:border-brand-gold/40' : ''}`}>
                    <p className="text-[10px] font-sans text-brand-muted uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {!loading && tab === 'users' && (
            <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-3 px-4 py-3 border-b border-brand-border text-[10px] font-sans uppercase tracking-wider text-brand-muted">
                <span className="col-span-2">User</span>
                <span>Tier</span>
                <span>Balance</span>
                <span>Status</span>
                <span>Admin</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-brand-border/50 max-h-[600px] overflow-y-auto">
                {users.map(u => (
                  <div key={u.id} className="px-4 py-3">
                    {editingUser === u.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputCls} placeholder="Full Name" defaultValue={u.fullName} onChange={e => setUserEdits(p => ({ ...p, fullName: e.target.value }))} />
                          <select className={inputCls} defaultValue={u.tier} onChange={e => setUserEdits(p => ({ ...p, tier: e.target.value }))}>
                            {['Gold Ore', 'Silver Sterling', 'Platinum Vault', 'Diamond Reserve'].map(t => <option key={t}>{t}</option>)}
                          </select>
                          <input className={inputCls} placeholder="Balance" type="number" defaultValue={u.liquidity} onChange={e => setUserEdits(p => ({ ...p, liquidity: e.target.value }))} />
                          <select className={inputCls} defaultValue={String(u.emailVerified)} onChange={e => setUserEdits(p => ({ ...p, emailVerified: e.target.value }))}>
                            <option value="true">Email Verified</option>
                            <option value="false">Not Verified</option>
                          </select>
                          <select className={inputCls} defaultValue={String(u.isAdmin)} onChange={e => setUserEdits(p => ({ ...p, isAdmin: e.target.value }))}>
                            <option value="false">User</option>
                            <option value="true">Admin</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveUser(u.id)} className="flex items-center gap-1 bg-green-700 text-white text-xs px-3 py-1.5 rounded font-sans"><Check className="w-3 h-3" /> Save</button>
                          <button onClick={() => { setEditingUser(null); setUserEdits({}); }} className="flex items-center gap-1 border border-brand-border text-brand-muted text-xs px-3 py-1.5 rounded font-sans"><X className="w-3 h-3" /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-3 items-center">
                        <div className="col-span-2 min-w-0">
                          <div className="text-xs font-semibold text-brand-text truncate">{u.fullName}</div>
                          <div className="text-[10px] text-brand-muted font-sans truncate">{u.email}</div>
                        </div>
                        <span className="text-xs text-brand-gold font-sans">{u.tier}</span>
                        <span className="text-xs text-green-400 font-sans font-bold">{fmt(u.liquidity)}</span>
                        <span className={badge(u.emailVerified ? 'active' : 'pending')}>{u.emailVerified ? 'Verified' : 'Unverified'}</span>
                        <span className={`text-[10px] font-sans font-bold ${u.isAdmin ? 'text-red-400' : 'text-brand-muted'}`}>{u.isAdmin ? 'Admin' : 'User'}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditingUser(u.id)} className="text-brand-muted hover:text-brand-gold transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteUser(u.id)} className="text-brand-muted hover:text-red-400 transition-colors" title="Delete"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── INVESTMENTS ── */}
          {!loading && tab === 'investments' && (
            <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 gap-3 px-4 py-3 border-b border-brand-border text-[10px] font-sans uppercase tracking-wider text-brand-muted">
                <span className="col-span-2">Investment</span>
                <span>User</span>
                <span>Amount</span>
                <span>Daily ROI</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-brand-border/50 max-h-[600px] overflow-y-auto">
                {investments.map(inv => (
                  <div key={inv.id} className="px-4 py-3">
                    {editingInv === inv.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select className={inputCls} defaultValue={inv.status} onChange={e => setInvEdits(p => ({ ...p, status: e.target.value }))}>
                            {['active', 'matured', 'withdrawn_early', 'paused'].map(s => <option key={s}>{s}</option>)}
                          </select>
                          <input className={inputCls} placeholder="Amount" type="number" defaultValue={inv.amount} onChange={e => setInvEdits(p => ({ ...p, amount: e.target.value }))} />
                          <input className={inputCls} placeholder="Daily Rate (e.g. 0.015)" type="number" step="0.0001" defaultValue={inv.dailyRate} onChange={e => setInvEdits(p => ({ ...p, dailyRate: e.target.value }))} />
                          <input className={inputCls} placeholder="Accrued Yield" type="number" defaultValue={inv.accruedYield} onChange={e => setInvEdits(p => ({ ...p, accruedYield: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveInv(inv.id)} className="flex items-center gap-1 bg-green-700 text-white text-xs px-3 py-1.5 rounded font-sans"><Check className="w-3 h-3" /> Save</button>
                          <button onClick={() => { setEditingInv(null); setInvEdits({}); }} className="flex items-center gap-1 border border-brand-border text-brand-muted text-xs px-3 py-1.5 rounded font-sans"><X className="w-3 h-3" /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-3 items-center">
                        <div className="col-span-2 min-w-0">
                          <div className="text-xs font-semibold text-brand-text truncate">{inv.sectorTitle}</div>
                          <div className="text-[10px] text-brand-muted font-sans">{inv.daysActive}d · {inv.tierName}</div>
                        </div>
                        <span className="text-[10px] text-brand-muted font-sans truncate">{inv.userEmail}</span>
                        <span className="text-xs text-brand-gold font-bold">{fmt(inv.amount)}</span>
                        <span className="text-xs text-green-400 font-sans">{((inv.dailyRate ?? 0) * 100).toFixed(2)}%</span>
                        <span className={badge(inv.status)}>{inv.status}</span>
                        <button onClick={() => setEditingInv(inv.id)} className="text-brand-muted hover:text-brand-gold transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {!loading && tab === 'transactions' && (
            <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-brand-border text-[10px] font-sans uppercase tracking-wider text-brand-muted">
                <span>User</span>
                <span>Type</span>
                <span className="col-span-2">Fund</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-brand-border/50 max-h-[600px] overflow-y-auto">
                {transactions.map(tx => (
                  <div key={tx.id} className="grid grid-cols-5 gap-3 px-4 py-3 items-center hover:bg-brand-bg/20">
                    <div className="min-w-0">
                      <div className="text-[10px] text-brand-text font-sans truncate">{tx.userFullName}</div>
                      <div className="text-[9px] text-brand-muted font-sans">{tx.date}</div>
                    </div>
                    <span className="text-[10px] font-sans text-brand-muted">{tx.type}</span>
                    <span className="col-span-2 text-xs text-brand-text truncate">{tx.fund}</span>
                    <span className={`text-xs font-bold text-right ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {!loading && tab === 'payments' && (
            <div className="space-y-4">
              <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-6 gap-3 px-4 py-3 border-b border-brand-border text-[10px] font-sans uppercase tracking-wider text-brand-muted">
                  <span className="col-span-2">User / Ref</span>
                  <span>Provider</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                <div className="divide-y divide-brand-border/50 max-h-[600px] overflow-y-auto">
                  {payments.map(p => (
                    <div key={p.id} className="grid grid-cols-6 gap-3 px-4 py-3 items-start">
                      <div className="col-span-2 min-w-0">
                        <div className="text-xs font-semibold text-brand-text truncate">{p.userFullName}</div>
                        <div className="text-[10px] text-brand-muted font-mono truncate">{p.txHash ?? p.referenceId ?? p.id}</div>
                        {p.metadata && (() => { try { const m = JSON.parse(p.metadata); return m.network ? <span className="text-[10px] text-brand-gold font-sans">{m.network}</span> : null; } catch { return null; } })()}
                      </div>
                      <span className={`text-[10px] font-sans font-bold uppercase ${p.provider === 'crypto' ? 'text-yellow-400' : 'text-brand-muted'}`}>{p.provider}</span>
                      <span className="text-xs text-brand-gold font-bold">{fmt(p.amount)}</span>
                      <span className={badge(p.status)}>{p.status.replace('_', ' ')}</span>
                      <div className="flex gap-1.5">
                        {p.status !== 'success' && (
                          <button onClick={() => setPaymentStatus(p.id, 'success')}
                            className="flex items-center gap-1 bg-green-700/70 hover:bg-green-700 text-white text-[10px] px-2 py-1 rounded font-sans transition-colors">
                            <Check className="w-3 h-3" /> Approve
                          </button>
                        )}
                        {p.status !== 'failed' && p.status !== 'success' && (
                          <button onClick={() => setPaymentStatus(p.id, 'failed')}
                            className="flex items-center gap-1 bg-red-700/70 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded font-sans transition-colors">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {payments.length === 0 && <div className="text-center py-8 text-brand-muted text-sm font-sans">No payment records found.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── WITHDRAWALS ── */}
          {!loading && tab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
                  <span className="text-xs font-sans font-bold text-brand-muted uppercase tracking-wider">Withdrawal Requests</span>
                  <span className="text-[10px] font-sans text-brand-muted">{withdrawals.filter(w => w.status === 'pending').length} pending</span>
                </div>
                <div className="divide-y divide-brand-border/50 max-h-[700px] overflow-y-auto">
                  {withdrawals.length === 0 && (
                    <div className="text-center py-8 text-brand-muted text-sm font-sans">No withdrawal requests.</div>
                  )}
                  {withdrawals.map(w => (
                    <div key={w.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={badge(w.status)}>{w.status}</span>
                            <span className="text-[10px] font-sans text-brand-muted uppercase">{w.method}</span>
                          </div>
                          <div className="text-sm font-bold text-brand-gold">{fmt(w.amount)}</div>
                          <div className="text-[10px] text-brand-muted font-sans">{w.userFullName} · {w.userEmail}</div>
                          <div className="text-[10px] text-brand-muted font-sans">{new Date(w.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right min-w-0">
                          {w.method === 'bank' && (
                            <div className="text-[10px] font-sans text-brand-muted text-right leading-loose">
                              <div>{w.bankName}</div>
                              <div className="flex items-center gap-1 justify-end">
                                <span className="font-mono">{w.bankAccountNumber}</span>
                                <button onClick={() => handleCopy(w.bankAccountNumber, `bank-${w.id}`)} className="text-brand-muted hover:text-brand-gold">
                                  {copiedId === `bank-${w.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <div>{w.bankAccountName}</div>
                            </div>
                          )}
                          {w.method === 'crypto' && (
                            <div className="text-[10px] font-sans text-brand-muted text-right leading-loose">
                              <div className="font-bold text-yellow-400">{w.cryptoNetwork}</div>
                              <div className="flex items-center gap-1 justify-end">
                                <span className="font-mono truncate max-w-[180px]">{w.cryptoAddress}</span>
                                <button onClick={() => handleCopy(w.cryptoAddress, `crypto-${w.id}`)} className="text-brand-muted hover:text-brand-gold shrink-0">
                                  {copiedId === `crypto-${w.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          )}
                          {w.method === 'paystack' && (
                            <div className="text-[10px] font-sans text-brand-muted">Via Paystack</div>
                          )}
                        </div>
                      </div>
                      {w.status === 'pending' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Admin note (optional)"
                            value={withdrawalNote[w.id] ?? ''}
                            onChange={e => setWithdrawalNote(prev => ({ ...prev, [w.id]: e.target.value }))}
                            className={inputCls}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleWithdrawal(w.id, 'approved')}
                              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded font-sans transition-colors">
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => handleWithdrawal(w.id, 'rejected')}
                              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded font-sans transition-colors">
                              <X className="w-3 h-3" /> Reject & Refund
                            </button>
                          </div>
                        </div>
                      )}
                      {w.adminNote && (
                        <div className="text-[10px] font-sans text-brand-muted bg-brand-bg/60 rounded px-3 py-1.5">Note: {w.adminNote}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── KYC ── */}
          {!loading && tab === 'kyc' && (
            <div className="space-y-4">
              <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
                  <span className="text-xs font-sans font-bold text-brand-muted uppercase tracking-wider">KYC Document Review</span>
                  <span className="text-[10px] font-sans text-brand-muted">{kycDocs.filter(d => d.status === 'pending').length} pending</span>
                </div>
                <div className="divide-y divide-brand-border/50 max-h-[700px] overflow-y-auto">
                  {kycDocs.length === 0 && (
                    <div className="text-center py-8 text-brand-muted text-sm font-sans">No KYC submissions.</div>
                  )}
                  {kycDocs.map(doc => (
                    <div key={doc.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={badge(doc.status)}>{doc.status}</span>
                            <span className="text-[10px] font-sans text-brand-gold uppercase">{doc.docType.replace('_', ' ')}</span>
                          </div>
                          <div className="text-sm font-bold text-brand-text">{doc.userFullName}</div>
                          <div className="text-[10px] text-brand-muted font-sans">{doc.userEmail}</div>
                          <div className="text-[10px] text-brand-muted font-sans">{doc.fileName} · {new Date(doc.createdAt).toLocaleDateString()}</div>
                        </div>
                        <button
                          onClick={() => downloadKycFile(doc.id)}
                          className="flex items-center gap-1.5 text-xs font-sans border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold/40 px-3 py-1.5 rounded transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" /> View File
                        </button>
                      </div>
                      {doc.status === 'pending' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Admin note (optional, shown to user on rejection)"
                            value={kycNote[doc.id] ?? ''}
                            onChange={e => setKycNote(prev => ({ ...prev, [doc.id]: e.target.value }))}
                            className={inputCls}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => handleKyc(doc.id, 'approved')}
                              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded font-sans transition-colors">
                              <ShieldCheck className="w-3 h-3" /> Approve & Verify
                            </button>
                            <button onClick={() => handleKyc(doc.id, 'rejected')}
                              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded font-sans transition-colors">
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        </div>
                      )}
                      {doc.adminNote && (
                        <div className="text-[10px] font-sans text-brand-muted bg-brand-bg/60 rounded px-3 py-1.5">Note: {doc.adminNote}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BROADCAST ── */}
          {!loading && tab === 'notifications' && (
            <div className="max-w-xl space-y-6">
              <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
                <h3 className="text-sm font-bold text-brand-text mb-4">Send Platform-wide Notification</h3>
                <form onSubmit={handleBroadcast} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">Title</label>
                    <input className={inputCls} value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Notification title" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">Message</label>
                    <textarea className={`${inputCls} h-24 resize-none`} value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Notification message" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">Type</label>
                    <select className={inputCls} value={broadcastType} onChange={e => setBroadcastType(e.target.value)}>
                      {['info', 'success', 'alert', 'security'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={broadcasting || !broadcastTitle || !broadcastMsg}
                    className="flex items-center gap-2 bg-brand-gold text-brand-bg font-sans font-bold text-xs px-6 py-2.5 rounded hover:brightness-110 transition-all disabled:opacity-60">
                    {broadcasting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                    Broadcast to All Users
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {!loading && tab === 'settings' && (
            <div className="max-w-3xl">
              <form onSubmit={saveSettings} className="space-y-6">

                {/* Platform Branding */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Platform Branding</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">The platform name appears everywhere — header, footer, page title, emails, and notifications. Change it here to rebrand the entire site.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'platform_name', label: 'Platform Name (e.g. BetterCapitalInvestment)' },
                      { key: 'support_email', label: 'Support Email' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <input className={inputCls} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tier Descriptions */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Tier Descriptions</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">Short description shown under each tier on the landing page and in the dashboard.</p>
                  <div className="space-y-3">
                    {[
                      { key: 'tier_desc_bronze', label: 'Bronze Ore' },
                      { key: 'tier_desc_silver', label: 'Silver Ore' },
                      { key: 'tier_desc_gold', label: 'Gold Ore' },
                      { key: 'tier_desc_platinum', label: 'Platinum Ore' },
                      { key: 'tier_desc_diamond', label: 'Diamond Ore' },
                    ].map(f => (
                      <div key={f.key} className="grid grid-cols-4 gap-3 items-center">
                        <label className="text-[10px] font-sans text-brand-muted uppercase tracking-wider col-span-1">{f.label}</label>
                        <input className={`${inputCls} col-span-3`} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* General */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-4 uppercase tracking-wider">General Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'min_investment', label: 'Min Investment ($)' },
                      { key: 'early_exit_penalty', label: 'Early Exit Penalty (e.g. 0.05 = 5%)' },
                      { key: 'max_withdrawal_daily', label: 'Max Daily Withdrawal ($)' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <input className={inputCls} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {[
                      { key: 'maintenance_mode', label: 'Maintenance Mode' },
                      { key: 'allow_new_signups', label: 'Allow New Signups' },
                      { key: 'allow_new_investments', label: 'Allow New Investments' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <select className={inputCls} value={settings[f.key] ?? 'true'} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}>
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Gateways */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-4 uppercase tracking-wider">Payment Gateways</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'gateway_monnify_enabled', label: 'Monnify' },
                      { key: 'gateway_paystack_enabled', label: 'Paystack' },
                      { key: 'gateway_flutterwave_enabled', label: 'Flutterwave' },
                      { key: 'gateway_crypto_enabled', label: 'Crypto' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <select className={inputCls} value={settings[f.key] ?? 'true'} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}>
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Withdrawal Method Toggles */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Withdrawal Methods</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">Control which withdrawal methods users can access.</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: 'withdraw_bank_enabled', label: 'Bank Transfer' },
                      { key: 'withdraw_paystack_enabled', label: 'Paystack' },
                      { key: 'withdraw_crypto_enabled', label: 'Crypto' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <select className={inputCls} value={settings[f.key] ?? 'true'} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}>
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tier ROI Rates */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Tier Daily ROI Rates (%)</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">Set the <strong>daily</strong> return on investment for each tier (applied every day over a 30-day term). Changing these will notify all users. Enter as a percentage (e.g. 0.25 for 0.25% per day).</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'tier_roi_bronze', label: 'Bronze Ore' },
                      { key: 'tier_roi_silver', label: 'Silver Ore' },
                      { key: 'tier_roi_gold', label: 'Gold Ore' },
                      { key: 'tier_roi_platinum', label: 'Platinum Ore' },
                      { key: 'tier_roi_diamond', label: 'Diamond Ore' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <div className="relative">
                          <input type="number" step="0.1" min="0" max="100" className={inputCls} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-muted font-sans">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tier Minimum Investment */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Tier Minimum Investment ($)</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">Set the minimum investment amount required to qualify for each tier.</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { key: 'tier_min_bronze', label: 'Bronze Ore' },
                      { key: 'tier_min_silver', label: 'Silver Ore' },
                      { key: 'tier_min_gold', label: 'Gold Ore' },
                      { key: 'tier_min_platinum', label: 'Platinum Ore' },
                      { key: 'tier_min_diamond', label: 'Diamond Ore' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-gold font-sans">$</span>
                          <input type="number" min="0" className={`${inputCls} pl-5`} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Social Media & Branding */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Social Media Links</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">Configure public-facing social links shown on the landing page. Leave blank to hide.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'social_linkedin', label: 'LinkedIn URL' },
                      { key: 'social_twitter', label: 'Twitter / X URL' },
                      { key: 'social_facebook', label: 'Facebook URL' },
                      { key: 'social_instagram', label: 'Instagram URL' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <input type="url" className={inputCls} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} placeholder="https://..." />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domain & Origin */}
                <div className="bg-brand-surface border border-brand-border rounded-lg p-5">
                  <h3 className="text-xs font-bold text-brand-text mb-1 uppercase tracking-wider">Domain & WebAuthn Config</h3>
                  <p className="text-[10px] text-brand-muted font-sans mb-4">Required for biometric (fingerprint) login to work correctly. Should match your Netlify domain.</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'app_domain', label: 'App Domain (e.g. BetterCapitalInvestment.space)', placeholder: 'BetterCapitalInvestment.space' },
                      { key: 'app_origin', label: 'App Origin (e.g. https://BetterCapitalInvestment.space)', placeholder: 'https://BetterCapitalInvestment.space' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">{f.label}</label>
                        <input className={inputCls} value={settings[f.key] ?? ''} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="flex items-center gap-2 bg-brand-gold text-brand-bg font-sans font-bold text-xs px-6 py-2.5 rounded hover:brightness-110 transition-all">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save All Settings
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
