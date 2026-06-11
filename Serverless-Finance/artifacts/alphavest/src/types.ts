export type ScreenType = 'landing' | 'login' | 'signup' | 'dashboard' | 'verify-email' | 'forgot-password' | 'admin';

export type ColorThemeType = 'sovereign' | 'royal-marine' | 'emerald-reserve' | 'emperor-purple';

export type DashboardTab = 'overview' | 'positions' | 'ledger' | 'analytics' | 'notifications' | 'settings';

export interface UserSession {
  fullName: string;
  email: string;
  isLoggedIn: boolean;
  biometricEnabled: boolean;
  tier: string;
  theme: ColorThemeType;
  isAdmin?: boolean;
  avatarUrl?: string;
  emailVerified?: boolean;
}

export interface Transaction {
  id: string;
  type: string;
  fund: string;
  date: string;
  amount: number;
}

export interface Investment {
  id: string;
  sectorId: string;
  sectorTitle: string;
  amount: number;
  startDateStamp: string;
  daysActive: number;
  dailyRate: number;
  accruedYield: number;
  tierName: string;
  status: string;
}

export interface InvestmentTier {
  name: string;
  minAmount: number;
  maxAmount: number;
  dailyROI: number;
  description: string;
}

export interface InvestmentSector {
  id: string;
  category: string;
  title: string;
  description: string;
  imageUrl: string;
  defaultDailyROI: number;
  comingSoon?: boolean;
}
