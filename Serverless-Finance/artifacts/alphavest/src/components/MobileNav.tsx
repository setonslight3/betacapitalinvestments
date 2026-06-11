import {
  Menu,
  LogOut,
  Activity,
  Layers,
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  Palette,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DashboardTab, UserSession, ColorThemeType } from "../types";

const NAV_ITEMS: { id: DashboardTab; label: string; icon: typeof Activity }[] =
  [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "positions", label: "Positions", icon: Layers },
    { id: "ledger", label: "Ledger", icon: BarChart3 },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings },
  ];

const THEMES: { key: ColorThemeType; label: string }[] = [
  { key: "sovereign", label: "Sovereign Slate" },
  { key: "emperor-purple", label: "Emperor Purple" },
  { key: "emerald-reserve", label: "Emerald Reserve" },
  { key: "royal-marine", label: "Royal Marine" },
];

interface MobileNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  session: UserSession;
  onLogout: () => void;
  onUpdateTheme: (theme: ColorThemeType) => void;
}

export default function MobileNav({
  activeTab,
  onTabChange,
  session,
  onLogout,
  onUpdateTheme,
}: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="md:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center w-11 h-11 rounded-md bg-brand-surface border border-brand-border text-brand-text hover:bg-brand-border active:scale-95 transition-all shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="bg-brand-surface border-brand-border w-72 p-0 flex flex-col"
      >
        <SheetHeader className="p-6 pb-4 border-b border-brand-border">
          <SheetTitle className="text-brand-gold font-serif text-xl">
            {session.fullName || "Alphavest"}
          </SheetTitle>
          {session.email && (
            <p className="text-xs text-brand-muted truncate">{session.email}</p>
          )}
          {session.tier && (
            <p className="text-[10px] uppercase tracking-wider text-brand-gold/70 mt-1">
              {session.tier}
            </p>
          )}
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 text-[10px] uppercase tracking-wider text-brand-muted mb-2">
            Navigation
          </p>
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-md text-left transition-colors ${
                    active
                      ? "bg-brand-gold/10 text-brand-gold"
                      : "text-brand-text hover:bg-brand-border"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-sans text-sm">{label}</span>
                </button>
              );
            })}
          </div>

          <p className="px-3 mt-6 mb-2 text-[10px] uppercase tracking-wider text-brand-muted flex items-center gap-1.5">
            <Palette className="w-3 h-3" /> Theme
          </p>
          <div className="grid grid-cols-2 gap-1.5 px-1">
            {THEMES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onUpdateTheme(key)}
                className={`px-2 py-1.5 rounded text-[11px] font-sans border transition-colors ${
                  session.theme === key
                    ? "border-brand-gold text-brand-gold bg-brand-gold/5"
                    : "border-brand-border text-brand-muted hover:text-brand-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-brand-border">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-sans text-sm">Sign out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
