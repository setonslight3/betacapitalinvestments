import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  usersTable, investmentsTable, transactionsTable, notificationsTable,
  paymentsTable, platformSettingsTable, withdrawalRequestsTable, kycDocumentsTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/admin-middleware";
import { sendEmail, withdrawalEmailHtml } from "../lib/mailer";

const router: IRouter = Router();

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

const DEFAULT_SETTINGS: Record<string, string> = {
  min_investment: "5000",
  early_exit_penalty: "0.05",
  maintenance_mode: "false",
  allow_new_signups: "true",
  allow_new_investments: "true",
  max_withdrawal_daily: "50000",
  platform_name: "BetterCapitalInvestment",
  support_email: "support@BetterCapitalInvestment.space",
  // Gateway toggles
  gateway_monnify_enabled: "true",
  gateway_paystack_enabled: "true",
  gateway_flutterwave_enabled: "true",
  gateway_crypto_enabled: "true",
  // Withdrawal method toggles
  withdraw_bank_enabled: "true",
  withdraw_paystack_enabled: "true",
  withdraw_crypto_enabled: "true",
  // Crypto wallet addresses (set by admin, override env)
  crypto_btc_address: "",
  crypto_usdt_trc20_address: "",
  crypto_usdt_erc20_address: "",
  crypto_eth_address: "",
  crypto_sol_address: "",
  // Tier daily ROI rates (%)
  tier_roi_bronze: "0.25",
  tier_roi_silver: "0.35",
  tier_roi_gold: "0.45",
  tier_roi_platinum: "0.55",
  tier_roi_diamond: "0.70",
  // Tier minimum investment amounts ($)
  tier_min_bronze: "3000",
  tier_min_silver: "10000",
  tier_min_gold: "50000",
  tier_min_platinum: "250000",
  tier_min_diamond: "1000000",
  // Tier descriptions (configurable copy)
  tier_desc_bronze: "Bronze level entry ore for establishing a strong, diversified interest stream.",
  tier_desc_silver: "Silver level growth ore with enhanced daily yields for serious portfolios.",
  tier_desc_gold: "Our standard gold asset for securing prime real estate and premium commodities.",
  tier_desc_platinum: "Elite platinum tier backing large-scale global initiatives and customized liquidity accounts.",
  tier_desc_diamond: "Supreme-tier backing designated for absolute sovereign wealth and maximal return flows.",
  // Social media links
  social_linkedin: "",
  social_twitter: "",
  social_facebook: "",
  social_instagram: "",
  // Domain / branding
  app_domain: "",
  app_origin: "",
};

// Keys that trigger broadcast notifications on change
const NOTIFY_ON_CHANGE: Record<string, (oldVal: string, newVal: string) => { title: string; message: string } | null> = {
  tier_roi_bronze: (_o, n) => ({ title: "Bronze Ore ROI Updated", message: `The daily ROI for Bronze Ore tier has been updated to ${n}% per day.` }),
  tier_roi_silver: (_o, n) => ({ title: "Silver Ore ROI Updated", message: `The daily ROI for Silver Ore tier has been updated to ${n}% per day.` }),
  tier_roi_gold: (_o, n) => ({ title: "Gold Ore ROI Updated", message: `The daily ROI for Gold Ore tier has been updated to ${n}% per day.` }),
  tier_roi_platinum: (_o, n) => ({ title: "Platinum Ore ROI Updated", message: `The daily ROI for Platinum Ore tier has been updated to ${n}% per day.` }),
  tier_roi_diamond: (_o, n) => ({ title: "Diamond Ore ROI Updated", message: `The daily ROI for Diamond Ore tier has been updated to ${n}% per day.` }),
  early_exit_penalty: (_o, n) => {
    const pct = Math.round(parseFloat(n) * 100);
    return { title: "Early Exit Policy Update", message: `The early withdrawal penalty has been updated to ${pct}%. Please review your investment terms.` };
  },
};

// ─── PUBLIC SETTINGS (no auth) ─────────────────────────────────────────────────

const SAFE_KEYS = new Set([
  "gateway_monnify_enabled", "gateway_paystack_enabled",
  "gateway_flutterwave_enabled", "gateway_crypto_enabled",
  "withdraw_bank_enabled", "withdraw_paystack_enabled", "withdraw_crypto_enabled",
  "support_email", "social_linkedin", "social_twitter", "social_facebook", "social_instagram",
  "platform_name", "maintenance_mode", "allow_new_signups",
  "tier_desc_bronze", "tier_desc_silver", "tier_desc_gold", "tier_desc_platinum", "tier_desc_diamond",
  "tier_roi_bronze", "tier_roi_silver", "tier_roi_gold", "tier_roi_platinum", "tier_roi_diamond",
  "tier_min_bronze", "tier_min_silver", "tier_min_gold", "tier_min_platinum", "tier_min_diamond",
]);

router.get("/settings", async (_req: Request, res: Response) => {
  const rows = await db.select().from(platformSettingsTable);
  const all: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) all[row.key] = row.value;
  const pub: Record<string, string> = {};
  for (const key of SAFE_KEYS) pub[key] = all[key] ?? "";
  res.json(pub);
});

// ─── METRICS ───────────────────────────────────────────────────────────────────

router.get("/admin/metrics", requireAdmin, async (_req: Request, res: Response) => {
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [verifiedCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.emailVerified, true));
  const investments = await db.select().from(investmentsTable);
  const activeInvestments = investments.filter((i) => i.status === "active");
  const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "success"));
  const transactions = await db.select().from(transactionsTable);

  const totalAUM = activeInvestments.reduce((s, i) => s + i.amount, 0);
  const totalROIPaid = transactions.filter((t) => t.type === "ROI Payout").reduce((s, t) => s + t.amount, 0);
  const totalDeposits = payments.reduce((s, p) => s + p.amount, 0);
  const [pendingPayments] = await db.select({ count: sql<number>`count(*)` }).from(paymentsTable).where(eq(paymentsTable.status, "manual_review"));
  const [pendingWithdrawals] = await db.select({ count: sql<number>`count(*)` }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "pending"));
  const [pendingKyc] = await db.select({ count: sql<number>`count(*)` }).from(kycDocumentsTable).where(eq(kycDocumentsTable.status, "pending"));

  const allUsers = await db.select().from(usersTable);
  const totalLiquidity = allUsers.reduce((s, u) => s + u.liquidity, 0);
  const totalPlatformWealth = totalLiquidity + totalAUM;

  res.json({
    totalUsers: Number(userCount.count),
    verifiedUsers: Number(verifiedCount.count),
    activeInvestments: activeInvestments.length,
    totalInvestments: investments.length,
    totalAUM,
    totalPlatformWealth,
    totalROIPaid: Math.abs(totalROIPaid),
    totalDepositsConfirmed: totalDeposits,
    pendingCryptoPayments: Number(pendingPayments.count),
    pendingWithdrawals: Number(pendingWithdrawals.count),
    pendingKyc: Number(pendingKyc.count),
  });
});

// ─── USERS ─────────────────────────────────────────────────────────────────────

router.get("/admin/users", requireAdmin, async (_req: Request, res: Response) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map((u) => ({
    id: u.id, email: u.email, fullName: u.fullName, phoneNumber: u.phoneNumber, tier: u.tier,
    isAdmin: u.isAdmin, emailVerified: u.emailVerified, accountStatus: u.accountStatus,
    liquidity: u.liquidity, theme: u.theme, createdAt: u.createdAt,
    googleId: !!u.googleId,
    bankName: u.bankName, bankAccountNumber: u.bankAccountNumber,
    bankAccountName: u.bankAccountName,
    cryptoWithdrawAddress: u.cryptoWithdrawAddress,
    cryptoWithdrawNetwork: u.cryptoWithdrawNetwork,
  })));
});

router.patch("/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { tier, isAdmin, emailVerified, liquidity, fullName, accountStatus, phoneNumber } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (tier !== undefined) updates.tier = tier;
  if (isAdmin !== undefined) updates.isAdmin = isAdmin;
  if (emailVerified !== undefined) updates.emailVerified = emailVerified;
  if (liquidity !== undefined) updates.liquidity = liquidity;
  if (fullName !== undefined) updates.fullName = fullName;
  if (accountStatus !== undefined) updates.accountStatus = accountStatus;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ message: "User not found" }); return; }
  
  // Send notification if account status changed to approved/rejected
  if (accountStatus !== undefined) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await db.insert(notificationsTable).values({
      id: notifId,
      userId: user.id,
      title: accountStatus === "approved" ? "Account Approved" : accountStatus === "rejected" ? "Account Rejected" : "Account Status Updated",
      message: accountStatus === "approved" 
        ? "Your account has been approved! You can now start investing." 
        : accountStatus === "rejected" 
        ? "Your account has been rejected. Please contact support for more information." 
        : "Your account status has been updated.",
      timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      read: false,
      type: accountStatus === "approved" ? "success" : accountStatus === "rejected" ? "alert" : "info",
    });
  }
  
  res.json({ id: user.id, email: user.email, fullName: user.fullName, tier: user.tier, isAdmin: user.isAdmin, liquidity: user.liquidity, emailVerified: user.emailVerified, accountStatus: user.accountStatus, phoneNumber: user.phoneNumber });
});

router.delete("/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "User deleted" });
});

// ─── INVESTMENTS ───────────────────────────────────────────────────────────────

router.get("/admin/investments", requireAdmin, async (_req: Request, res: Response) => {
  const investments = await db.select({
    id: investmentsTable.id,
    userId: investmentsTable.userId,
    sectorTitle: investmentsTable.sectorTitle,
    amount: investmentsTable.amount,
    dailyRate: investmentsTable.dailyRate,
    accruedYield: investmentsTable.accruedYield,
    tierName: investmentsTable.tierName,
    status: investmentsTable.status,
    daysActive: investmentsTable.daysActive,
    startDateStamp: investmentsTable.startDateStamp,
    createdAt: investmentsTable.createdAt,
    userEmail: usersTable.email,
    userFullName: usersTable.fullName,
  }).from(investmentsTable)
    .leftJoin(usersTable, eq(investmentsTable.userId, usersTable.id))
    .orderBy(desc(investmentsTable.createdAt));
  res.json(investments);
});

router.patch("/admin/investments/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status, daysActive, accruedYield, dailyRate, amount } = req.body;
  const updates: Partial<typeof investmentsTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (daysActive !== undefined) updates.daysActive = daysActive;
  if (accruedYield !== undefined) updates.accruedYield = accruedYield;
  if (dailyRate !== undefined) updates.dailyRate = dailyRate;
  if (amount !== undefined) updates.amount = amount;

  const [inv] = await db.update(investmentsTable).set(updates).where(eq(investmentsTable.id, id)).returning();
  if (!inv) { res.status(404).json({ message: "Investment not found" }); return; }
  res.json(inv);
});

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────────

router.get("/admin/transactions", requireAdmin, async (_req: Request, res: Response) => {
  const txs = await db.select({
    id: transactionsTable.id,
    type: transactionsTable.type,
    fund: transactionsTable.fund,
    date: transactionsTable.date,
    amount: transactionsTable.amount,
    createdAt: transactionsTable.createdAt,
    userId: transactionsTable.userId,
    userEmail: usersTable.email,
    userFullName: usersTable.fullName,
  }).from(transactionsTable)
    .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(500);
  res.json(txs);
});

// ─── PAYMENTS ──────────────────────────────────────────────────────────────────

router.get("/admin/payments", requireAdmin, async (_req: Request, res: Response) => {
  const payments = await db.select({
    id: paymentsTable.id,
    provider: paymentsTable.provider,
    referenceId: paymentsTable.referenceId,
    txHash: paymentsTable.txHash,
    receiptFileName: paymentsTable.receiptFileName,
    receiptMimeType: paymentsTable.receiptMimeType,
    amount: paymentsTable.amount,
    currency: paymentsTable.currency,
    status: paymentsTable.status,
    metadata: paymentsTable.metadata,
    createdAt: paymentsTable.createdAt,
    userId: paymentsTable.userId,
    userEmail: usersTable.email,
    userFullName: usersTable.fullName,
  }).from(paymentsTable)
    .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(payments);
});

router.get("/admin/payments/:id/receipt", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  if (!payment || !payment.receiptImageBase64) { res.status(404).json({ message: "Receipt not found" }); return; }
  const buffer = Buffer.from(payment.receiptImageBase64, "base64");
  res.setHeader("Content-Type", payment.receiptMimeType ?? "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${payment.receiptFileName ?? "receipt"}"`);
  res.send(buffer);
});

router.patch("/admin/payments/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status, adminNote } = req.body;
  if (!status) { res.status(400).json({ message: "status required" }); return; }

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  if (!payment) { res.status(404).json({ message: "Payment not found" }); return; }

  const [updated] = await db.update(paymentsTable).set({ status }).where(eq(paymentsTable.id, id)).returning();

  if (status === "success" && payment.status !== "success") {
    const network = payment.metadata ? (JSON.parse(payment.metadata).network ?? "Crypto") : "Crypto";
    const fund = payment.provider === "crypto" ? `Crypto (${network})` : payment.provider;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
    if (user) {
      const { investmentsTable: inv } = await import("@workspace/db/schema");
      const { tierFromWealth } = await import("./auth");
      const investments = await db.select().from(inv).where(eq(inv.userId, payment.userId));
      const activePrincipal = investments.filter((i) => i.status === "active").reduce((s, i) => s + i.amount, 0);
      const newLiquidity = user.liquidity + payment.amount;
      const tier = tierFromWealth(newLiquidity + activePrincipal);
      await db.update(usersTable).set({ liquidity: newLiquidity, tier }).where(eq(usersTable.id, payment.userId));

      const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db.insert(transactionsTable).values({
        id: txId, userId: payment.userId, type: "Bank Deposit", fund,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        amount: payment.amount,
      });

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db.insert(notificationsTable).values({
        id: notifId, userId: payment.userId, title: "Deposit Approved",
        message: `${fmt(payment.amount)} has been credited to your account after verification.`,
        timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        read: false, type: "success",
      });
    }
  }

  void adminNote;
  res.json(updated);
});

// ─── WITHDRAWALS ───────────────────────────────────────────────────────────────

router.get("/admin/withdrawals", requireAdmin, async (_req: Request, res: Response) => {
  const wds = await db.select({
    id: withdrawalRequestsTable.id,
    userId: withdrawalRequestsTable.userId,
    amount: withdrawalRequestsTable.amount,
    currency: withdrawalRequestsTable.currency,
    method: withdrawalRequestsTable.method,
    status: withdrawalRequestsTable.status,
    bankName: withdrawalRequestsTable.bankName,
    bankAccountNumber: withdrawalRequestsTable.bankAccountNumber,
    bankAccountName: withdrawalRequestsTable.bankAccountName,
    cryptoAddress: withdrawalRequestsTable.cryptoAddress,
    cryptoNetwork: withdrawalRequestsTable.cryptoNetwork,
    adminNote: withdrawalRequestsTable.adminNote,
    createdAt: withdrawalRequestsTable.createdAt,
    processedAt: withdrawalRequestsTable.processedAt,
    userEmail: usersTable.email,
    userFullName: usersTable.fullName,
  }).from(withdrawalRequestsTable)
    .leftJoin(usersTable, eq(withdrawalRequestsTable.userId, usersTable.id))
    .orderBy(desc(withdrawalRequestsTable.createdAt));
  res.json(wds);
});

router.patch("/admin/withdrawals/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status, adminNote } = req.body;
  if (!status) { res.status(400).json({ message: "status required" }); return; }

  const [wd] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, id)).limit(1);
  if (!wd) { res.status(404).json({ message: "Withdrawal not found" }); return; }

  const [updated] = await db.update(withdrawalRequestsTable).set({
    status,
    adminNote: adminNote ?? wd.adminNote,
    processedAt: ["approved", "rejected"].includes(status) ? new Date() : wd.processedAt,
  }).where(eq(withdrawalRequestsTable.id, id)).returning();

  if (status === "rejected" && wd.status === "pending") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, wd.userId)).limit(1);
    if (user) {
      await db.update(usersTable).set({ liquidity: user.liquidity + wd.amount }).where(eq(usersTable.id, wd.userId));

      const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db.insert(transactionsTable).values({
        id: txId, userId: wd.userId, type: "Withdrawal Reversal", fund: "Refunded — Request Rejected",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        amount: wd.amount,
      });

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db.insert(notificationsTable).values({
        id: notifId, userId: wd.userId, title: "Withdrawal Rejected",
        message: `Your withdrawal of ${fmt(wd.amount)} was rejected. ${adminNote ? `Reason: ${adminNote}` : "Funds have been returned to your balance."}`,
        timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        read: false, type: "alert",
      });

      sendEmail(user.email, "Withdrawal Request Rejected — BetterCapitalInvestment",
        withdrawalEmailHtml(user.fullName, fmt(wd.amount), wd.method, "rejected", adminNote)).catch(() => {});
    }
  }

  if (status === "approved" && wd.status === "pending") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, wd.userId)).limit(1);
    if (user) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db.insert(notificationsTable).values({
        id: notifId, userId: wd.userId, title: "Withdrawal Approved",
        message: `Your withdrawal of ${fmt(wd.amount)} via ${wd.method} has been approved and is being processed.`,
        timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        read: false, type: "success",
      });
      sendEmail(user.email, "Withdrawal Approved — BetterCapitalInvestment",
        withdrawalEmailHtml(user.fullName, fmt(wd.amount), wd.method, "approved", adminNote)).catch(() => {});
    }
  }

  res.json(updated);
});

// ─── KYC DOCUMENTS ─────────────────────────────────────────────────────────────

router.get("/admin/kyc", requireAdmin, async (_req: Request, res: Response) => {
  const docs = await db.select({
    id: kycDocumentsTable.id,
    userId: kycDocumentsTable.userId,
    docType: kycDocumentsTable.docType,
    fileName: kycDocumentsTable.fileName,
    mimeType: kycDocumentsTable.mimeType,
    status: kycDocumentsTable.status,
    adminNote: kycDocumentsTable.adminNote,
    createdAt: kycDocumentsTable.createdAt,
    reviewedAt: kycDocumentsTable.reviewedAt,
    userEmail: usersTable.email,
    userFullName: usersTable.fullName,
  }).from(kycDocumentsTable)
    .leftJoin(usersTable, eq(kycDocumentsTable.userId, usersTable.id))
    .orderBy(desc(kycDocumentsTable.createdAt));
  res.json(docs);
});

router.get("/admin/kyc/:id/file", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(kycDocumentsTable).where(eq(kycDocumentsTable.id, id)).limit(1);
  if (!doc) { res.status(404).json({ message: "Document not found" }); return; }
  const buffer = Buffer.from(doc.fileDataBase64, "base64");
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  res.send(buffer);
});

router.patch("/admin/kyc/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, adminNote } = req.body;
  if (!["approved", "rejected"].includes(status)) { res.status(400).json({ message: "status must be approved or rejected" }); return; }

  const [doc] = await db.update(kycDocumentsTable).set({
    status, adminNote, reviewedAt: new Date(),
  }).where(eq(kycDocumentsTable.id, id)).returning();

  if (!doc) { res.status(404).json({ message: "Document not found" }); return; }

  if (status === "approved") {
    await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.id, doc.userId));
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, doc.userId)).limit(1);
  if (user) {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const isApproved = status === "approved";
    await db.insert(notificationsTable).values({
      id: notifId, userId: doc.userId,
      title: isApproved ? "KYC Verified" : "KYC Rejected",
      message: isApproved
        ? "Your identity document has been verified. Your account is now fully verified."
        : `Your KYC submission was rejected. ${adminNote ? `Reason: ${adminNote}` : "Please resubmit with a clearer document."}`,
      timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      read: false, type: isApproved ? "success" : "alert",
    });
  }

  res.json(doc);
});

// ─── PLATFORM SETTINGS ─────────────────────────────────────────────────────────

router.get("/admin/settings", requireAdmin, async (_req: Request, res: Response) => {
  const rows = await db.select().from(platformSettingsTable);
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

router.patch("/admin/settings", requireAdmin, async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;

  // Gather current values for broadcast comparison
  const currentRows = await db.select().from(platformSettingsTable);
  const current: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of currentRows) current[row.key] = row.value;

  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(platformSettingsTable)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value, updatedAt: new Date() } });
  }

  // Broadcast notifications for sensitive setting changes
  const timestamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  for (const [key, newValue] of Object.entries(updates)) {
    const oldValue = current[key] ?? "";
    if (newValue !== oldValue && NOTIFY_ON_CHANGE[key]) {
      const notifDef = NOTIFY_ON_CHANGE[key](oldValue, newValue);
      if (notifDef) {
        const users = await db.select({ id: usersTable.id }).from(usersTable);
        const values = users.map((u) => ({
          id: `notif_${Date.now()}_${u.id}_${Math.random().toString(36).slice(2)}`,
          userId: u.id,
          title: notifDef.title,
          message: notifDef.message,
          timestamp,
          read: false,
          type: "info" as const,
        }));
        if (values.length > 0) await db.insert(notificationsTable).values(values);
      }
    }
  }

  res.json({ message: "Settings updated" });
});

// ─── BROADCAST NOTIFICATION ────────────────────────────────────────────────────

router.post("/admin/notify-all", requireAdmin, async (req: Request, res: Response) => {
  const { title, message, type } = req.body;
  if (!title || !message) { res.status(400).json({ message: "title and message required" }); return; }

  const users = await db.select({ id: usersTable.id }).from(usersTable);
  const timestamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const values = users.map((u) => ({
    id: `notif_${Date.now()}_${u.id}_${Math.random().toString(36).slice(2)}`,
    userId: u.id, title, message, timestamp, read: false, type: type ?? "info",
  }));

  if (values.length > 0) await db.insert(notificationsTable).values(values);
  res.json({ message: `Notification sent to ${values.length} users` });
});

export default router;
