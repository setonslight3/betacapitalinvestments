import { InvestmentSector, InvestmentTier, Transaction } from './types';

export const INVESTMENT_TIERS: InvestmentTier[] = [
  {
    name: 'Bronze Ore',
    minAmount: 3000,
    maxAmount: 9999,
    dailyROI: 0.0025,
    description: 'Bronze level entry ore for establishing a strong, diversified interest stream.'
  },
  {
    name: 'Silver Ore',
    minAmount: 10000,
    maxAmount: 49999,
    dailyROI: 0.0035,
    description: 'Silver level growth ore with enhanced daily yields for serious portfolios.'
  },
  {
    name: 'Gold Ore',
    minAmount: 50000,
    maxAmount: 249999,
    dailyROI: 0.0045,
    description: 'Our standard gold asset standard for securing prime real estate and premium commodities.'
  },
  {
    name: 'Platinum Ore',
    minAmount: 250000,
    maxAmount: 999999,
    dailyROI: 0.0055,
    description: 'Elite platinum tier backing large-scale global initiatives and customized liquidity accounts.'
  },
  {
    name: 'Diamond Ore',
    minAmount: 1000000,
    maxAmount: 100000000,
    dailyROI: 0.0070,
    description: 'Supreme-tier backing designated for absolute sovereign wealth and maximal return flows.'
  }
];

export interface InvestmentPlan {
  id: string;
  name: string;
  badge: string;
  minAmount: number;
  maxAmountLabel: string;
  rateLabel: string;
  rateDetail: string;
  features: string[];
  popular: boolean;
  colorClass: string;
  badgeClass: string;
}

export const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'classic',
    name: 'Classic Plan',
    badge: 'Automated',
    minAmount: 5000,
    maxAmountLabel: '$25,000',
    rateLabel: 'Daily Compounded',
    rateDetail: '30-Day Term',
    features: [
      'Min. $5,000 — Max. $25,000',
      'Daily compounded ROI for 30 days',
      'Automated portfolio management',
      'Real-time performance dashboard',
      'Email & push notifications',
      '24/7 customer support',
    ],
    popular: false,
    colorClass: 'border-blue-500/40 hover:border-blue-400/70',
    badgeClass: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    badge: 'Most Popular',
    minAmount: 25000,
    maxAmountLabel: '$50,000',
    rateLabel: '5% Interest Rate',
    rateDetail: 'Fixed Returns',
    features: [
      'Min. $25,000 — Max. $50,000',
      '5% fixed interest rate',
      'Priority fund allocation',
      'Dedicated account manager',
      'Advanced analytics access',
      'Bi-weekly ROI disbursements',
    ],
    popular: true,
    colorClass: 'border-brand-gold/60 hover:border-brand-gold',
    badgeClass: 'bg-brand-gold/20 text-brand-gold border-brand-gold/40',
  },
  {
    id: 'vip',
    name: 'VIP Plan',
    badge: 'Elite',
    minAmount: 50000,
    maxAmountLabel: '1 BTC & above',
    rateLabel: '8% Interest Rate',
    rateDetail: 'Premium Returns',
    features: [
      'Min. $50,000 — Max. 1 BTC+',
      '8% premium interest rate',
      'Gold & crypto diversification',
      'Private wealth concierge',
      'White-glove onboarding',
      'Weekly ROI disbursements',
    ],
    popular: false,
    colorClass: 'border-purple-500/40 hover:border-purple-400/70',
    badgeClass: 'bg-purple-900/40 text-purple-300 border-purple-500/30',
  },
];

export const INVESTMENT_SECTORS: InvestmentSector[] = [
  {
    id: 'gold',
    category: 'PRECIOUS METALS',
    title: 'Gold Investment',
    description: 'Physical gold, ETFs, and futures — hedge against inflation with the world\'s oldest store of value.',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&q=80',
    defaultDailyROI: 0.0020
  },
  {
    id: 'crypto',
    category: 'DIGITAL ASSETS',
    title: 'Crypto',
    description: 'Algorithmic trading and strategic long-term positions in top-tier protocols.',
    imageUrl: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=800&q=80',
    defaultDailyROI: 0.0035
  },
  {
    id: 'real-estate',
    category: 'PRIME ASSETS',
    title: 'Real Estate',
    description: 'Commercial and residential acquisition in high-appreciation urban centers.',
    imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80',
    defaultDailyROI: 0.0025,
    comingSoon: true
  },
  {
    id: 'agriculture',
    category: 'FUTURE COMMODITIES',
    title: 'Agriculture',
    description: 'Sustainable vertical farming and high-yield technological agricultural initiatives.',
    imageUrl: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
    defaultDailyROI: 0.0030,
    comingSoon: true
  }
];

export const FAQ_ITEMS = [
  {
    q: 'How do I get started with AlphaVest?',
    a: 'Create a free account, complete identity verification, deposit funds using any supported payment method, then choose an investment plan that matches your goals. Our onboarding team will guide you every step of the way.'
  },
  {
    q: 'What are the minimum investment amounts?',
    a: 'Our Classic Plan starts at $5,000, the Pro Plan at $25,000, and the VIP Plan at $50,000 (or 1 BTC equivalent). There is no upper limit on VIP investments.'
  },
  {
    q: 'How and when are returns paid out?',
    a: 'Classic Plan investors receive daily compounded ROI over 30 days. Pro Plan disbursements occur bi-weekly. VIP Plan disbursements are made weekly. All returns are credited directly to your account balance.'
  },
  {
    q: 'Is my investment insured or protected?',
    a: 'Client funds are held in segregated accounts protected by AES-256 encryption and multi-signature cold storage. We conduct regular third-party audits. While all investments carry risk, our risk management framework is built to institutional standards.'
  },
  {
    q: 'Can I withdraw my capital before maturity?',
    a: 'Early withdrawals are permitted with a 5% early-exit fee applied to the principal. Accrued yield up to the withdrawal date is retained in full. Contact support to initiate an early exit.'
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept bank transfers (Monnify), card payments (Flutterwave), and cryptocurrency deposits including BTC, USDT-TRC20, and USDT-ERC20. All payment methods are listed in your deposit portal.'
  },
  {
    q: 'How is AlphaVest regulated?',
    a: 'AlphaVest is certified and registered as a financial services provider. Our operations comply with international AML and KYC requirements. A copy of our certification is available upon request from compliance@alphavest.com.'
  },
  {
    q: 'How do I contact support?',
    a: 'Support is available 24/7 via live chat (click the chat icon at the bottom-right), email at support@alphavest.com, or by phone at +1 (800) 425-8392. Average response time is under 2 hours.'
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'AV-9482-TX',
    type: 'ROI Payout',
    fund: 'Alpha Real Estate Fund II',
    date: 'Sep 28, 2023',
    amount: 14205.18
  },
  {
    id: 'AV-9210-TX',
    type: 'Bank Deposit',
    fund: 'JP Morgan Chase ****9012',
    date: 'Sep 22, 2023',
    amount: 250000.00
  },
  {
    id: 'AV-8955-TX',
    type: 'Withdrawal',
    fund: 'External Wallet 0x71...2b',
    date: 'Sep 15, 2023',
    amount: -50000.00
  },
  {
    id: 'AV-8421-TX',
    type: 'ROI Payout',
    fund: 'Global Tech Equities I',
    date: 'Aug 30, 2023',
    amount: 8900.22
  },
  {
    id: 'AV-8109-TX',
    type: 'ROI Payout',
    fund: 'Sovereign Debt Fund IV',
    date: 'Aug 15, 2023',
    amount: 7210.45
  },
  {
    id: 'AV-7822-TX',
    type: 'Bank Deposit',
    fund: 'Bank of America ****3110',
    date: 'Aug 04, 2023',
    amount: 125000.00
  }
];
