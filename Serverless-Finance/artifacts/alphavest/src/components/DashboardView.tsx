import { useState, useMemo, FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Lock,
  PlusCircle,
  ArrowDownCircle,
  Search,
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  Settings,
  ShieldCheck,
  Coins,
  BarChart3,
  Palette,
  Activity,
  Fingerprint,
  Trash2,
  Loader2,
  LogOut,
  ChevronRight,
  Wallet,
  ArrowDownRight,
  Shield,
  ChevronDown,
  IdCard,
  BadgeCheck,
  UserCheck,
  FileCheck,
  Clock,
} from "lucide-react";
import MarketCharts from "./MarketCharts";
import PaymentModal from "./PaymentModal";
import WithdrawModal from "./WithdrawModal";
import KycModal from "./KycModal";
import { startRegistration } from "@simplewebauthn/browser";
import {
  useGetMe,
  useGetInvestments,
  useGetTransactions,
  useGetNotifications,
  useGetPortfolioSummary,
  useGetLiquidity,
  useCreateInvestment,
  useUpdateInvestment,
  useCreateTransaction,
  useUpdateLiquidity,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useUpdateProfile,
  useLogout as useLogoutHook,
  getGetInvestmentsQueryKey,
  getGetTransactionsQueryKey,
  getGetNotificationsQueryKey,
  getGetPortfolioSummaryQueryKey,
  getGetLiquidityQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import {
  ScreenType,
  UserSession,
  ColorThemeType,
  DashboardTab,
} from "../types";
import { INVESTMENT_SECTORS, INVESTMENT_TIERS } from "../data";
import LogoIcon from "./LogoIcon";
import MobileNav from "./MobileNav";

interface DashboardViewProps {
  onNavigate: (screen: ScreenType) => void;
  session: UserSession;
  onLogout: () => void;
  onUpdateTheme: (theme: ColorThemeType) => void;
  onUpdateSession?: (fields: Partial<UserSession>) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);

const THEMES: { key: ColorThemeType; label: string; color: string }[] = [
  { key: "sovereign", label: "Sovereign Slate", color: "#f2ca50" },
  { key: "emperor-purple", label: "Emperor Purple", color: "#ccaaff" },
  { key: "emerald-reserve", label: "Emerald Reserve", color: "#66fca1" },
  { key: "royal-marine", label: "Royal Marine", color: "#f7b538" },
];

const NAV_ITEMS: { id: DashboardTab; label: string; icon: typeof Activity }[] =
  [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "positions", label: "Positions", icon: Layers },
    { id: "ledger", label: "Ledger", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ];

export default function DashboardView({
  onNavigate,
  session,
  onLogout,
  onUpdateTheme,
  onUpdateSession,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [activePledgeSector, setActivePledgeSector] = useState<
    (typeof INVESTMENT_SECTORS)[0] | null
  >(null);
  const [pledgeAmount, setPledgeAmount] = useState("3000");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTarget, setWithdrawTarget] = useState("External Wallet");
  const [txFilter, setTxFilter] = useState<
    "All" | "ROI" | "Deposit" | "Withdrawal" | "Pledge"
  >("All");
  const [txSearch, setTxSearch] = useState("");
  const [withdrawInvestment, setWithdrawInvestment] = useState<string | null>(
    null,
  );
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState("");
  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [kycLoading, setKycLoading] = useState(false);

  // Settings states
  const [profileName, setProfileName] = useState(session.fullName);
  const [profileEmail, setProfileEmail] = useState(session.email);

  const qc = useQueryClient();

  // Load KYC docs when settings tab is active
  const loadKycDocs = async () => {
    setKycLoading(true);
    try {
      const r = await fetch("/api/kyc/status", { credentials: "include" });
      if (r.ok) setKycDocs(await r.json());
    } catch {
      /* ignore */
    }
    setKycLoading(false);
  };

  const { data: me } = useGetMe();
  const { data: investments = [], isLoading: invLoading } = useGetInvestments();
  const { data: transactions = [], isLoading: txLoading } =
    useGetTransactions();
  const { data: notifications = [] } = useGetNotifications();
  const { data: summary } = useGetPortfolioSummary();
  const { data: liquidityData } = useGetLiquidity();

  const createInvestment = useCreateInvestment();
  const updateInvestment = useUpdateInvestment();
  const createTransaction = useCreateTransaction();
  const updateLiquidity = useUpdateLiquidity();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const updateProfile = useUpdateProfile();
  const logoutMutation = useLogoutHook();

  const liquidity = liquidityData?.liquidity ?? 0;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const triggerFeedback = (text: string, success = true) => {
    setFeedbackMsg({ text, success });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getGetInvestmentsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPortfolioSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetLiquidityQueryKey() });
    qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
  };

  const computedTier = useMemo(() => {
    const amt = parseFloat(pledgeAmount);
    if (isNaN(amt) || amt < 3000) return null;
    let selected = INVESTMENT_TIERS[0];
    for (let i = INVESTMENT_TIERS.length - 1; i >= 0; i--) {
      if (amt >= INVESTMENT_TIERS[i].minAmount) {
        selected = INVESTMENT_TIERS[i];
        break;
      }
    }
    return selected;
  }, [pledgeAmount]);

  const handleWithdraw = (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerFeedback("Please enter a valid withdrawal amount.", false);
      return;
    }
    if (amt > liquidity) {
      triggerFeedback("Insufficient liquidity for this withdrawal.", false);
      return;
    }
    updateLiquidity.mutate(
      { data: { delta: -amt } },
      {
        onSuccess: () => {
          createTransaction.mutate({
            data: { type: "Withdrawal", fund: withdrawTarget, amount: -amt },
          });
          setShowWithdrawModal(false);
          setWithdrawAmount("");
          triggerFeedback(`Withdrawal of ${fmt(amt)} dispatched.`);
          invalidateAll();
        },
        onError: () =>
          triggerFeedback("Withdrawal failed. Please try again.", false),
      },
    );
  };

  const handlePledge = (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(pledgeAmount);
    if (isNaN(amt) || amt < 3000) {
      triggerFeedback("Minimum investment is $3,000.", false);
      return;
    }
    if (amt > liquidity) {
      triggerFeedback("Insufficient cash balance for this pledge.", false);
      return;
    }
    if (!activePledgeSector || !computedTier) {
      triggerFeedback("Please select a valid sector.", false);
      return;
    }

    createInvestment.mutate(
      {
        data: {
          sectorId: activePledgeSector.id,
          sectorTitle: activePledgeSector.title,
          amount: amt,
          dailyRate: computedTier.dailyROI,
          tierName: computedTier.name,
        },
      },
      {
        onSuccess: () => {
          updateLiquidity.mutate({ data: { delta: -amt } });
          createTransaction.mutate({
            data: {
              type: "Investment Pledge",
              fund: `Pledge to ${activePledgeSector.title}`,
              amount: -amt,
            },
          });
          setShowPledgeModal(false);
          setPledgeAmount("3000");
          setActivePledgeSector(null);
          triggerFeedback(
            `${fmt(amt)} pledged to ${activePledgeSector.title}.`,
          );
          invalidateAll();
        },
        onError: () =>
          triggerFeedback("Investment failed. Please try again.", false),
      },
    );
  };

  const handleEarlyWithdraw = (invId: string) => {
    const inv = investments.find((i) => i.id === invId);
    if (!inv) return;
    const penalty = inv.amount * 0.05;
    const returned = inv.amount - penalty + inv.accruedYield;
    updateInvestment.mutate(
      { id: invId, data: { status: "withdrawn_early" } },
      {
        onSuccess: () => {
          updateLiquidity.mutate({ data: { delta: returned } });
          createTransaction.mutate({
            data: {
              type: "Pre-Maturity Penalty",
              fund: `Early exit: ${inv.sectorTitle}`,
              amount: -penalty,
            },
          });
          createTransaction.mutate({
            data: {
              type: "Withdrawal",
              fund: `${inv.sectorTitle} principal returned`,
              amount: returned,
            },
          });
          setWithdrawInvestment(null);
          triggerFeedback(
            `Position closed. ${fmt(returned)} returned after 5% early exit fee.`,
          );
          invalidateAll();
        },
      },
    );
  };

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      {
        data: {
          fullName: profileName,
          theme: session.theme,
          biometricEnabled: session.biometricEnabled,
        },
      },
      {
        onSuccess: (data) => {
          onUpdateSession?.({ fullName: data.fullName });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          triggerFeedback("Profile updated successfully.");
        },
        onError: () => triggerFeedback("Failed to update profile.", false),
      },
    );
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => onLogout(),
      onError: () => onLogout(),
    });
  };

  const handleBiometricRegister = async () => {
    setBiometricLoading(true);
    setBiometricMsg("");
    try {
      const optR = await fetch("/api/auth/biometric/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!optR.ok) {
        setBiometricMsg("Failed to start registration.");
        setBiometricLoading(false);
        return;
      }
      const options = await optR.json();
      const response = await startRegistration({ optionsJSON: options });
      const verifyR = await fetch("/api/auth/biometric/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
        credentials: "include",
      });
      const data = await verifyR.json();
      if (!verifyR.ok) {
        setBiometricMsg(data.message ?? "Registration failed.");
        setBiometricLoading(false);
        return;
      }
      onUpdateSession?.({ biometricEnabled: true });
      setBiometricMsg(
        "Biometric registered! You can now sign in with your fingerprint or Face ID.",
      );
      triggerFeedback("Biometric authentication enabled.");
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setBiometricMsg("Registration was cancelled.");
      } else {
        setBiometricMsg(
          "Biometric registration failed. This device may not support it.",
        );
      }
    }
    setBiometricLoading(false);
  };

  const filteredTx = useMemo(() => {
    let list = [...transactions];
    if (txFilter !== "All") {
      list = list.filter((tx) => {
        if (txFilter === "ROI") return tx.type === "ROI Payout";
        if (txFilter === "Deposit") return tx.type === "Bank Deposit";
        if (txFilter === "Withdrawal") return tx.type === "Withdrawal";
        if (txFilter === "Pledge") return tx.type === "Investment Pledge";
        return true;
      });
    }
    if (txSearch)
      list = list.filter(
        (tx) =>
          tx.fund.toLowerCase().includes(txSearch.toLowerCase()) ||
          tx.type.toLowerCase().includes(txSearch.toLowerCase()),
      );
    return list;
  }, [transactions, txFilter, txSearch]);

  const activeInvestments = investments.filter((i) => i.status === "active");

  const txTypeColor = (type: string) => {
    if (type === "ROI Payout") return "text-green-400";
    if (type === "Bank Deposit") return "text-blue-400";
    if (type === "Withdrawal" || type === "Pre-Maturity Penalty")
      return "text-red-400";
    if (type === "Investment Pledge") return "text-brand-gold";
    return "text-brand-muted";
  };

  const notifIcon = (type: string) => {
    if (type === "success")
      return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
    if (type === "alert")
      return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
    if (type === "security")
      return <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />;
    return <Bell className="w-4 h-4 text-brand-gold shrink-0" />;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-serif flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 fixed top-0 left-0 h-full bg-brand-surface border-r border-brand-border z-40">
        <div className="px-5 py-4 border-b border-brand-border">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <LogoIcon size={28} />
            <span className="font-serif text-base font-bold text-brand-gold tracking-wider uppercase">
              AlphaVest
            </span>
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all ${active ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20" : "text-brand-muted hover:text-brand-text hover:bg-brand-bg/50"}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-sans text-xs tracking-wide">
                  {item.label}
                </span>
                {item.id === "notifications" && unreadCount > 0 && (
                  <span className="ml-auto bg-brand-gold text-brand-bg text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center font-sans">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-brand-border pt-3 space-y-2">
          <div className="px-3 py-2">
            <div className="text-[10px] font-sans uppercase tracking-wider text-brand-muted mb-0.5">
              Signed in as
            </div>
            <div className="text-sm text-brand-text truncate">
              {session.fullName}
            </div>
            <div className="text-[11px] font-sans text-brand-gold">
              {session.tier}
            </div>
          </div>
          {session.isAdmin && (
            <button
              onClick={() => onNavigate("admin")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-colors text-xs font-sans"
            >
              <Shield className="w-3.5 h-3.5" /> Admin Panel
            </button>
          )}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-brand-muted hover:text-red-400 hover:bg-red-950/20 transition-colors text-xs font-sans"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 w-full z-50 flex items-center justify-between px-3 h-14 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border">
        <div className="flex items-center gap-2 min-w-0">
          <MobileNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            session={session}
            onLogout={onLogout}
            onUpdateTheme={onUpdateTheme}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("notifications")}
            className="relative text-brand-muted hover:text-brand-gold transition-colors p-1.5"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand-gold text-brand-bg text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        session={session}
        onLogout={onLogout}
        onUpdateTheme={onUpdateTheme}
      />

      {/* Main content */}
      <main className="md:ml-60 flex-1 min-h-screen pt-14 md:pt-0">
        {/* Feedback toast */}
        {feedbackMsg && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded border shadow-lg text-xs font-sans flex items-center gap-3 fade-in ${feedbackMsg.success ? "bg-brand-surface border-brand-gold/30 text-brand-text" : "bg-red-950/80 border-red-500/30 text-red-300"}`}
          >
            {feedbackMsg.success ? (
              <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="ml-auto text-brand-muted hover:text-brand-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="p-6 md:p-8 max-w-6xl">
            {/* Header row with client ID and portfolio selector */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">
                  Portfolio Overview
                </h1>
                <p className="text-brand-muted text-sm font-sans">
                  Welcome back,{" "}
                  {(session.fullName || "").split(" ")[0] || "there"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <IdCard className="w-3.5 h-3.5 text-brand-gold" />
                  <span className="text-[11px] font-sans text-brand-muted">
                    Client ID:
                  </span>
                  <span className="text-[11px] font-sans font-bold text-brand-gold tracking-wider">
                    AV-
                    {(session.email || "")
                      .substring(0, 4)
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "X")}
                    -{Date.now().toString(36).slice(-5).toUpperCase()}
                  </span>
                </div>
              </div>
              {/* Portfolio selector */}
              <div className="flex-shrink-0">
                <label className="block text-[10px] font-sans font-bold text-brand-muted uppercase tracking-widest mb-1.5">
                  Account / Portfolio
                </label>
                <div className="relative">
                  <select
                    className="appearance-none bg-brand-surface border border-brand-border rounded px-4 py-2.5 pr-8 text-xs font-sans text-brand-text focus:border-brand-gold focus:outline-none transition-all cursor-pointer min-w-[200px]"
                    defaultValue="all"
                  >
                    <option value="all">All Portfolios</option>
                    <option value="gold">Gold & Precious Metals</option>
                    <option value="crypto">Digital Assets (Crypto)</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="agriculture">
                      Agriculture & Commodities
                    </option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Capital stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Capital (Balance)",
                  value: summary ? fmt(summary.totalWealth) : "—",
                  sub: "Total account capital",
                  color: "text-brand-gold",
                },
                {
                  label: "Capital (Interest)",
                  value: summary ? fmt(summary.totalROIReceived) : "—",
                  sub: "Interest profit earned",
                  color: "text-green-400",
                },
                {
                  label: "Available Cash",
                  value: fmt(liquidity),
                  sub: "Ready to deploy",
                  color: "text-blue-400",
                },
                {
                  label: "Active Principal",
                  value: summary ? fmt(summary.activePrincipal) : "—",
                  sub: `${activeInvestments.length} position(s)`,
                  color: "text-purple-400",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-brand-surface border border-brand-border rounded p-5"
                >
                  <div className="text-xs text-brand-muted font-sans uppercase tracking-wide mb-2">
                    {stat.label}
                  </div>
                  <div
                    className={`text-xl md:text-2xl font-bold ${stat.color} mb-1`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-brand-muted font-sans">
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setShowDepositModal(true)}
                className="flex items-center gap-3 bg-brand-surface border border-brand-border hover:border-brand-gold/40 p-4 rounded transition-all group"
              >
                <div className="w-10 h-10 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <ArrowDownCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-brand-text group-hover:text-brand-gold transition-colors">
                    Deposit Funds
                  </div>
                  <div className="text-[11px] text-brand-muted font-sans">
                    Add cash to your account
                  </div>
                </div>
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex items-center gap-3 bg-brand-surface border border-brand-border hover:border-brand-gold/40 p-4 rounded transition-all group"
              >
                <div className="w-10 h-10 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-brand-text group-hover:text-brand-gold transition-colors">
                    Withdraw
                  </div>
                  <div className="text-[11px] text-brand-muted font-sans">
                    Move funds out
                  </div>
                </div>
              </button>
            </div>

            {/* Live market charts in overview */}
            <div className="mb-8">
              <MarketCharts compact />
            </div>

            {/* Recent transactions */}
            <div className="bg-brand-surface border border-brand-border rounded">
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
                <h3 className="font-semibold text-brand-text text-sm">
                  Recent Activity
                </h3>
                <button
                  onClick={() => setActiveTab("ledger")}
                  className="text-xs text-brand-gold font-sans hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {txLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin w-5 h-5 text-brand-muted" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-brand-muted text-sm font-sans">
                  No transactions yet. Deposit funds to get started.
                </div>
              ) : (
                <div className="divide-y divide-brand-border">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-6 py-3.5"
                    >
                      <div>
                        <div
                          className={`text-sm font-semibold ${txTypeColor(tx.type)}`}
                        >
                          {tx.type}
                        </div>
                        <div className="text-xs text-brand-muted font-sans truncate max-w-48">
                          {tx.fund}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {tx.amount >= 0 ? "+" : ""}
                          {fmt(tx.amount)}
                        </div>
                        <div className="text-[11px] text-brand-muted font-sans">
                          {tx.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── POSITIONS ── */}
        {activeTab === "positions" && (
          <div className="p-6 md:p-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">
                  Investment Positions
                </h1>
                <p className="text-brand-muted text-sm font-sans">
                  Manage your active capital allocations
                </p>
              </div>
              <button
                onClick={() => setShowPledgeModal(true)}
                className="bg-brand-gold text-brand-bg px-4 py-2.5 rounded text-xs font-bold font-sans uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Investment
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3 bg-brand-surface border border-brand-border rounded p-4">
              <Wallet className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs text-brand-muted font-sans">
                Available to invest:
              </span>
              <span className="text-sm font-bold text-blue-400">
                {fmt(liquidity)}
              </span>
            </div>

            {invLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin w-6 h-6 text-brand-muted" />
              </div>
            ) : investments.length === 0 ? (
              <div className="bg-brand-surface border border-brand-border rounded p-10 text-center">
                <Coins className="w-10 h-10 text-brand-muted mx-auto mb-4 opacity-50" />
                <p className="text-brand-text mb-2">No active positions</p>
                <p className="text-sm text-brand-muted font-sans mb-6">
                  Deposit funds and pledge capital to start earning returns.
                </p>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="bg-brand-gold text-brand-bg px-6 py-2.5 rounded text-xs font-bold font-sans uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  Deposit Funds
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((inv) => (
                  <div
                    key={inv.id}
                    className={`bg-brand-surface border rounded p-5 ${inv.status === "active" ? "border-brand-border" : "border-brand-border/40 opacity-60"}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border ${inv.status === "active" ? "text-green-400 border-green-400/30 bg-green-400/10" : inv.status === "matured" ? "text-blue-400 border-blue-400/30 bg-blue-400/10" : "text-brand-muted border-brand-border bg-brand-bg"}`}
                          >
                            {inv.status.replace("_", " ").toUpperCase()}
                          </span>
                          <span className="text-[10px] font-sans text-brand-gold">
                            {inv.tierName}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-brand-text">
                          {inv.sectorTitle}
                        </h3>
                        <p className="text-xs text-brand-muted font-sans">
                          {inv.id} · Started {inv.startDateStamp}
                        </p>
                      </div>
                      {inv.status === "active" && (
                        <button
                          onClick={() => setWithdrawInvestment(inv.id)}
                          className="text-xs text-brand-muted hover:text-red-400 border border-brand-border hover:border-red-400/30 px-3 py-1.5 rounded font-sans transition-colors flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" /> Close
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        {
                          label: "Principal",
                          value: fmt(inv.amount),
                          color: "text-brand-text",
                        },
                        {
                          label: "Daily ROI",
                          value: `${(inv.dailyRate * 100).toFixed(2)}%`,
                          color: "text-brand-gold",
                        },
                        {
                          label: "Days Active",
                          value: `${inv.daysActive}`,
                          color: "text-brand-muted",
                        },
                        {
                          label: "Accrued Yield",
                          value: fmt(inv.accruedYield),
                          color: "text-green-400",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="bg-brand-bg border border-brand-border rounded p-3"
                        >
                          <div className="text-[10px] text-brand-muted font-sans uppercase tracking-wide mb-1">
                            {s.label}
                          </div>
                          <div className={`text-sm font-bold ${s.color}`}>
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Investment sectors */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-brand-text mb-4">
                Available Sectors
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INVESTMENT_SECTORS.map((sector) => (
                  <div
                    key={sector.id}
                    onClick={() => {
                      if (sector.comingSoon) {
                        setShowComingSoon(sector.title);
                      } else {
                        setActivePledgeSector(sector);
                        setShowPledgeModal(true);
                      }
                    }}
                    className="group relative overflow-hidden rounded border border-brand-border hover:border-brand-gold/50 cursor-pointer transition-all"
                  >
                    <div className="h-28 overflow-hidden">
                      <img
                        src={sector.imageUrl}
                        alt={sector.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/90 via-brand-bg/50 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[9px] text-brand-gold font-sans uppercase tracking-widest font-bold">
                            {sector.category}
                          </div>
                          <div className="text-sm font-semibold text-brand-text">
                            {sector.title}
                          </div>
                        </div>
                        {sector.comingSoon ? (
                          <span className="flex items-center gap-1 text-[10px] font-sans font-bold text-brand-muted border border-brand-border px-2 py-1 rounded bg-brand-bg/70">
                            <Clock className="w-3 h-3" /> Coming Soon
                          </span>
                        ) : (
                          <div className="text-right">
                            <div className="text-[10px] text-brand-muted font-sans">
                              Daily ROI
                            </div>
                            <div className="text-sm font-bold text-brand-gold">
                              {(sector.defaultDailyROI * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── LEDGER ── */}
        {activeTab === "ledger" && (
          <div className="p-6 md:p-8 max-w-5xl">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">
                Transaction Ledger
              </h1>
              <p className="text-brand-muted text-sm font-sans">
                Full audit trail of all account activity
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border py-2.5 pl-9 pr-4 text-brand-text placeholder-brand-muted/40 text-sm focus:border-brand-gold focus:outline-none rounded font-sans"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(
                  ["All", "ROI", "Deposit", "Withdrawal", "Pledge"] as const
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTxFilter(f)}
                    className={`px-3 py-2 rounded text-xs font-sans font-semibold transition-all ${txFilter === f ? "bg-brand-gold text-brand-bg" : "bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold/40"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
              <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-brand-border text-[10px] font-sans uppercase tracking-wider text-brand-muted">
                <span>Type</span>
                <span className="col-span-2">Fund / Source</span>
                <span className="text-right">Amount</span>
              </div>
              {txLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin w-5 h-5 text-brand-muted" />
                </div>
              ) : filteredTx.length === 0 ? (
                <div className="text-center py-8 text-brand-muted text-sm font-sans">
                  No transactions found.
                </div>
              ) : (
                <div className="divide-y divide-brand-border/50 max-h-[500px] overflow-y-auto">
                  {filteredTx.map((tx) => (
                    <div
                      key={tx.id}
                      className="grid grid-cols-4 gap-4 px-5 py-3.5 hover:bg-brand-bg/30 transition-colors items-center"
                    >
                      <div>
                        <div
                          className={`text-xs font-semibold ${txTypeColor(tx.type)}`}
                        >
                          {tx.type}
                        </div>
                        <div className="text-[10px] text-brand-muted font-sans">
                          {tx.date}
                        </div>
                      </div>
                      <div className="col-span-2 text-sm text-brand-text truncate">
                        {tx.fund}
                      </div>
                      <div
                        className={`text-sm font-bold text-right ${tx.amount >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {fmt(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <div className="p-6 md:p-8 max-w-5xl">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">
                Portfolio Analytics
              </h1>
              <p className="text-brand-muted text-sm font-sans">
                Performance breakdown and allocation overview
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "Total Wealth",
                  value: summary ? fmt(summary.totalWealth) : "—",
                  delta: "+0.45%",
                  up: true,
                  icon: TrendingUp,
                },
                {
                  label: "Total ROI Earned",
                  value: summary ? fmt(summary.totalROIReceived) : "—",
                  delta: "All time",
                  up: true,
                  icon: TrendingUp,
                },
                {
                  label: "Active Positions",
                  value: String(summary?.activeInvestmentCount ?? 0),
                  delta: "Investments",
                  up: true,
                  icon: Layers,
                },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.label}
                    className="bg-brand-surface border border-brand-border rounded p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-brand-muted font-sans uppercase tracking-wide">
                        {c.label}
                      </span>
                      <Icon className="w-4 h-4 text-brand-gold" />
                    </div>
                    <div className="text-2xl font-bold text-brand-gold mb-1">
                      {c.value}
                    </div>
                    <div
                      className={`text-xs font-sans ${c.up ? "text-green-400" : "text-red-400"}`}
                    >
                      {c.delta}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Allocation breakdown */}
            <div className="bg-brand-surface border border-brand-border rounded mb-6">
              <div className="px-6 py-4 border-b border-brand-border">
                <h3 className="font-semibold text-brand-text text-sm">
                  Capital Allocation by Sector
                </h3>
              </div>
              {activeInvestments.length === 0 ? (
                <div className="text-center py-8 text-brand-muted text-sm font-sans">
                  No active investments to analyze.
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {activeInvestments.map((inv) => {
                    const totalPrincipal = activeInvestments.reduce(
                      (s, i) => s + i.amount,
                      0,
                    );
                    const pct =
                      totalPrincipal > 0
                        ? (inv.amount / totalPrincipal) * 100
                        : 0;
                    return (
                      <div key={inv.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-brand-text">
                            {inv.sectorTitle}
                          </span>
                          <span className="text-brand-gold font-bold">
                            {pct.toFixed(1)}% · {fmt(inv.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-gold rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live market charts */}
            <div className="mb-6">
              <MarketCharts />
            </div>

            {/* Tier summary */}
            <div className="bg-brand-surface border border-brand-border rounded">
              <div className="px-6 py-4 border-b border-brand-border">
                <h3 className="font-semibold text-brand-text text-sm">
                  Investment Tiers Reference
                </h3>
              </div>
              <div className="divide-y divide-brand-border/50">
                {INVESTMENT_TIERS.map((tier) => {
                  const isActive = activeInvestments.some(
                    (i) => i.tierName === tier.name,
                  );
                  return (
                    <div
                      key={tier.name}
                      className={`px-6 py-4 flex items-center justify-between ${isActive ? "bg-brand-gold/5" : ""}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-brand-text">
                            {tier.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-sans font-bold text-brand-gold border border-brand-gold/30 px-1.5 py-0.5 rounded-full bg-brand-gold/10">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-brand-muted font-sans">
                          Min: {fmt(tier.minAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-brand-gold font-bold">
                          {(tier.dailyROI * 100).toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-brand-muted font-sans">
                          per day
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === "notifications" && (
          <div className="p-6 md:p-8 max-w-3xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">
                  Notifications
                </h1>
                <p className="text-brand-muted text-sm font-sans">
                  {unreadCount} unread
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() =>
                    markAllRead.mutate(undefined, {
                      onSuccess: () =>
                        qc.invalidateQueries({
                          queryKey: getGetNotificationsQueryKey(),
                        }),
                    })
                  }
                  className="text-xs font-sans text-brand-gold hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="bg-brand-surface border border-brand-border rounded p-10 text-center">
                <Bell className="w-8 h-8 text-brand-muted mx-auto mb-3 opacity-40" />
                <p className="text-brand-muted text-sm font-sans">
                  No notifications yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`bg-brand-surface border rounded p-4 flex items-start gap-3 transition-all ${notif.read ? "border-brand-border opacity-60" : "border-brand-gold/20 bg-brand-gold/5"}`}
                  >
                    {notifIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-semibold text-brand-text">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-brand-muted font-sans shrink-0 ml-2">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-brand-muted font-sans leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.read && (
                      <button
                        onClick={() =>
                          markRead.mutate(
                            { id: notif.id },
                            {
                              onSuccess: () =>
                                qc.invalidateQueries({
                                  queryKey: getGetNotificationsQueryKey(),
                                }),
                            },
                          )
                        }
                        className="text-brand-muted hover:text-brand-gold transition-colors shrink-0"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="p-6 md:p-8 max-w-2xl">
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-brand-text mb-1">
                Account Settings
              </h1>
              <p className="text-brand-muted text-sm font-sans">
                Manage your profile and preferences
              </p>
            </div>

            {/* Profile */}
            <div className="bg-brand-surface border border-brand-border rounded mb-5">
              <div className="px-6 py-4 border-b border-brand-border flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-gold" />
                <h3 className="font-semibold text-brand-text text-sm">
                  Profile
                </h3>
              </div>
              <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-text text-sm focus:border-brand-gold focus:outline-none rounded transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileEmail}
                    disabled
                    className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-muted text-sm rounded font-sans cursor-not-allowed opacity-60"
                  />
                  <p className="text-[10px] text-brand-muted font-sans mt-1">
                    Email cannot be changed.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider mb-1">
                    Membership Tier
                  </label>
                  <div className="bg-brand-bg border border-brand-border py-3 px-4 rounded text-sm text-brand-gold font-semibold">
                    {session.tier}
                  </div>
                </div>
                <div className="py-3 px-4 bg-brand-bg border border-brand-border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="text-brand-gold w-4 h-4" />
                      <span className="text-xs text-brand-muted font-sans">
                        Biometric Login
                      </span>
                    </div>
                    {session.biometricEnabled && (
                      <span className="text-[10px] font-sans bg-green-900/30 border border-green-500/30 text-green-400 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  {biometricMsg && (
                    <p
                      className={`text-[11px] font-sans mb-2 leading-relaxed ${biometricMsg.startsWith("Biometric registered") ? "text-green-400" : "text-red-400"}`}
                    >
                      {biometricMsg}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleBiometricRegister}
                    disabled={biometricLoading}
                    className="flex items-center gap-2 text-xs font-sans border border-brand-border text-brand-muted hover:border-brand-gold/40 hover:text-brand-gold px-3 py-2 rounded transition-colors disabled:opacity-60"
                  >
                    {biometricLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Fingerprint className="w-3.5 h-3.5" />
                    )}
                    {biometricLoading
                      ? "Registering..."
                      : session.biometricEnabled
                        ? "Re-register Biometric"
                        : "Register Biometric"}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3 px-6 rounded hover:brightness-110 transition-all tracking-widest uppercase flex items-center gap-2 disabled:opacity-70"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="animate-spin w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </form>
            </div>

            {/* Registration & Identification */}
            <div className="bg-brand-surface border border-brand-border rounded mb-5">
              <div className="px-6 py-4 border-b border-brand-border flex items-center gap-2">
                <IdCard className="w-4 h-4 text-brand-gold" />
                <h3 className="font-semibold text-brand-text text-sm">
                  Registration & Means of Identification
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-brand-bg border border-brand-border rounded p-4">
                    <p className="text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">
                      Client Reference ID
                    </p>
                    <p className="text-sm font-bold text-brand-gold font-sans tracking-wider">
                      AV-
                      {(session.email || "")
                        .substring(0, 4)
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "X")}
                      -
                      {(session.email || "").length.toString().padStart(4, "0")}
                    </p>
                  </div>
                  <div className="bg-brand-bg border border-brand-border rounded p-4">
                    <p className="text-[10px] font-sans text-brand-muted uppercase tracking-wider mb-1">
                      Membership Tier
                    </p>
                    <p className="text-sm font-bold text-brand-gold font-sans">
                      {session.tier}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-sans font-bold text-brand-muted uppercase tracking-wider mb-2">
                    Verification Checklist
                  </p>
                  {[
                    {
                      icon: UserCheck,
                      label: "Email Address Verified",
                      done: !!session.emailVerified,
                    },
                    {
                      icon: BadgeCheck,
                      label: "Account Registered",
                      done: session.isLoggedIn,
                    },
                    {
                      icon: FileCheck,
                      label: "Identity Document Submitted",
                      done: kycDocs.some((d) => d.status === "approved"),
                    },
                    {
                      icon: ShieldCheck,
                      label: "Biometric Authentication",
                      done: !!session.biometricEnabled,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between px-4 py-3 rounded border text-sm font-sans ${item.done ? "border-green-500/30 bg-green-900/10" : "border-brand-border bg-brand-bg/40"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          className={`w-4 h-4 ${item.done ? "text-green-400" : "text-brand-muted"}`}
                        />
                        <span
                          className={
                            item.done ? "text-brand-text" : "text-brand-muted"
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.done ? (
                        <span className="text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-500/30 px-2 py-0.5 rounded">
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-brand-muted bg-brand-surface border border-brand-border px-2 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {/* KYC Upload */}
                <div className="bg-brand-bg border border-brand-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-sans font-bold text-brand-muted uppercase tracking-wider">
                      KYC Documents
                    </p>
                    {kycLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-brand-muted" />
                    )}
                  </div>
                  {kycDocs.length > 0 ? (
                    <div className="space-y-1.5 mb-3">
                      {kycDocs.slice(0, 3).map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between text-xs font-sans"
                        >
                          <span className="text-brand-muted truncate">
                            {doc.docType.replace("_", " ")} — {doc.fileName}
                          </span>
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded text-[10px] border ${doc.status === "approved" ? "text-green-400 border-green-500/30 bg-green-900/20" : doc.status === "rejected" ? "text-red-400 border-red-500/30 bg-red-900/20" : "text-yellow-400 border-yellow-500/30 bg-yellow-900/20"}`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] font-sans text-brand-muted mb-3">
                      No documents submitted yet.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowKycModal(true)}
                    className="flex items-center gap-2 text-xs font-sans border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 px-3 py-1.5 rounded transition-colors"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    {kycDocs.some((d) =>
                      ["approved", "pending"].includes(d.status),
                    )
                      ? "Submit Another Document"
                      : "Submit ID Document"}
                  </button>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="bg-brand-surface border border-brand-border rounded mb-5">
              <div className="px-6 py-4 border-b border-brand-border flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-gold" />
                <h3 className="font-semibold text-brand-text text-sm">
                  Color Theme
                </h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      onUpdateTheme(t.key);
                      updateProfile.mutate({ data: { theme: t.key } });
                    }}
                    className={`flex items-center gap-3 p-3 rounded border transition-all ${session.theme === t.key ? "border-brand-gold bg-brand-gold/10" : "border-brand-border hover:border-brand-gold/40"}`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-sans text-brand-text">
                      {t.label}
                    </span>
                    {session.theme === t.key && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-brand-surface border border-brand-border rounded">
              <div className="px-6 py-4 border-b border-brand-border flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-gold" />
                <h3 className="font-semibold text-brand-text text-sm">
                  Security
                </h3>
              </div>
              <div className="p-6">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-sans transition-colors border border-red-400/20 hover:border-red-400/40 px-4 py-2.5 rounded"
                >
                  <LogOut className="w-4 h-4" /> Sign Out of Account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ── */}

      {/* Deposit — PaymentModal */}
      {showDepositModal && (
        <PaymentModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => {
            setShowDepositModal(false);
            triggerFeedback(
              "Payment initiated. Funds will appear once confirmed.",
            );
            invalidateAll();
          }}
        />
      )}

      {/* Withdraw — real modal with bank/crypto/paystack */}
      {showWithdrawModal && (
        <WithdrawModal
          liquidity={liquidity}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={(newLiquidity) => {
            setShowWithdrawModal(false);
            triggerFeedback(
              `Withdrawal submitted. New balance: ${fmt(newLiquidity)}`,
            );
            invalidateAll();
          }}
        />
      )}

      {/* Pledge */}
      {showPledgeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="h-[2px] bg-brand-gold" />
            <div className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-semibold text-brand-text">
                  New Investment
                </h3>
                <button
                  onClick={() => {
                    setShowPledgeModal(false);
                    setActivePledgeSector(null);
                  }}
                  className="text-brand-muted hover:text-brand-gold transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handlePledge} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider mb-2">
                    Select Sector
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {INVESTMENT_SECTORS.filter((s) => !s.comingSoon).map(
                      (s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActivePledgeSector(s)}
                          className={`text-left p-3 rounded border text-xs transition-all ${activePledgeSector?.id === s.id ? "border-brand-gold bg-brand-gold/10 text-brand-gold" : "border-brand-border text-brand-muted hover:border-brand-gold/40 hover:text-brand-text"}`}
                        >
                          <div className="font-bold">{s.title}</div>
                          <div className="font-sans opacity-70">
                            {(s.defaultDailyROI * 100).toFixed(2)}%/day
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-semibold text-brand-muted uppercase tracking-wider mb-1">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="3000"
                    placeholder="Min. $3,000"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border py-3 px-4 text-brand-text text-sm focus:border-brand-gold focus:outline-none rounded font-sans"
                  />
                </div>
                {computedTier && (
                  <div className="bg-brand-gold/10 border border-brand-gold/20 rounded p-3">
                    <div className="text-xs font-sans text-brand-gold font-bold">
                      {computedTier.name} ·{" "}
                      {(computedTier.dailyROI * 100).toFixed(2)}% daily
                    </div>
                    <div className="text-[11px] text-brand-muted font-sans mt-0.5">
                      {computedTier.description}
                    </div>
                  </div>
                )}
                <div className="bg-brand-bg border border-brand-border rounded p-3 text-xs font-sans text-brand-muted">
                  Available cash:{" "}
                  <span className="text-brand-gold font-bold">
                    {fmt(liquidity)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={
                    createInvestment.isPending ||
                    !activePledgeSector ||
                    !computedTier
                  }
                  className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3.5 rounded hover:brightness-110 transition-all tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {createInvestment.isPending ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  Confirm Investment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Early withdraw confirm */}
      {withdrawInvestment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-red-500/30 rounded shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-brand-text">
                Early Exit Warning
              </h3>
            </div>
            <p className="text-sm text-brand-muted font-sans leading-relaxed mb-6">
              Closing this position before maturity incurs a{" "}
              <span className="text-red-400 font-bold">5% penalty</span> on your
              principal. Accrued yield will still be returned. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setWithdrawInvestment(null)}
                className="flex-1 border border-brand-border text-brand-muted py-2.5 rounded text-xs font-sans font-semibold hover:text-brand-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEarlyWithdraw(withdrawInvestment)}
                disabled={updateInvestment.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded text-xs font-sans font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {updateInvestment.isPending ? (
                  <Loader2 className="animate-spin w-3.5 h-3.5" />
                ) : null}
                Close Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon modal */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="h-[2px] bg-brand-gold" />
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-brand-gold" />
              </div>
              <h3 className="text-lg font-semibold text-brand-text mb-2">
                Coming Soon
              </h3>
              <p className="text-sm text-brand-muted font-sans leading-relaxed mb-6">
                <span className="text-brand-gold font-semibold">
                  {showComingSoon}
                </span>{" "}
                investments are currently being onboarded to the platform. We'll
                notify you as soon as this sector is available for pledging.
              </p>
              <button
                onClick={() => setShowComingSoon(null)}
                className="w-full bg-brand-gold text-brand-bg font-sans font-bold text-xs py-3 rounded hover:brightness-110 transition-all tracking-widest uppercase"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC modal */}
      {showKycModal && (
        <KycModal
          onClose={() => {
            setShowKycModal(false);
            loadKycDocs();
          }}
        />
      )}

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-surface border border-brand-border rounded shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-brand-text mb-3">
              Sign Out
            </h3>
            <p className="text-sm text-brand-muted font-sans mb-6">
              Are you sure you want to sign out of your account?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-brand-border text-brand-muted py-2.5 rounded text-xs font-sans font-semibold hover:text-brand-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-brand-gold text-brand-bg py-2.5 rounded text-xs font-sans font-bold hover:brightness-110 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
