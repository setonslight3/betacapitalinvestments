import { Router, type IRouter, type Request, type Response } from "express";
import axios from "axios";
import crypto from "crypto";
import { db } from "@workspace/db";
import { paymentsTable, usersTable, transactionsTable, notificationsTable, withdrawalRequestsTable, platformSettingsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/admin-middleware";
import { sendEmail, withdrawalEmailHtml } from "../lib/mailer";
import { tierFromWealth } from "./auth";

const router: IRouter = Router();

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

function genId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

async function creditUser(userId: number, amount: number, fund: string, type: string = "Bank Deposit") {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return;
  const newLiquidity = (user.liquidity ?? 0) + amount;
  // Recalculate tier
  const { investmentsTable: inv } = await import("@workspace/db/schema");
  const investments = await db.select().from(inv).where(eq(inv.userId, userId));
  const activePrincipal = investments.filter((i) => i.status === "active").reduce((s, i) => s + i.amount, 0);
  const tier = tierFromWealth(newLiquidity + activePrincipal);
  await db.update(usersTable).set({ liquidity: newLiquidity, tier }).where(eq(usersTable.id, userId));

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(transactionsTable).values({
    id: txId,
    userId,
    type,
    fund,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    amount,
  });
}

// ─── MONNIFY ───────────────────────────────────────────────────────────────────

async function monnifyToken(): Promise<string> {
  const key = `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`;
  const base64 = Buffer.from(key).toString("base64");
  const baseUrl = process.env.MONNIFY_BASE_URL ?? "https://sandbox.monnify.com";
  const resp = await axios.post(`${baseUrl}/api/v1/auth/login`, {}, {
    headers: { Authorization: `Basic ${base64}` },
  });
  return resp.data.responseBody.accessToken;
}

router.post("/payments/monnify/initialize", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const enabled = await getSetting("gateway_monnify_enabled", "true");
  if (enabled === "false") { res.status(503).json({ message: "Monnify is currently disabled" }); return; }
  if (!process.env.MONNIFY_API_KEY) { res.status(503).json({ message: "Monnify not configured" }); return; }

  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ message: "Valid amount required" }); return; }
  
  // Enforce minimum deposit of $5,000
  const MIN_DEPOSIT = 5000;
  if (amount < MIN_DEPOSIT) {
    res.status(400).json({ message: `Minimum deposit is ${fmt(MIN_DEPOSIT)}` });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    
    req.log.info({ userId, amount, provider: "monnify" }, "Initializing Monnify payment");
    
    const token = await monnifyToken();
    const baseUrl = process.env.MONNIFY_BASE_URL ?? "https://sandbox.monnify.com";
    const reference = `av_monnify_${Date.now()}_${userId}`;

    const resp = await axios.post(
      `${baseUrl}/api/v1/merchant/transactions/init-transaction`,
      {
        amount,
        customerName: user.fullName,
        customerEmail: user.email,
        paymentReference: reference,
        paymentDescription: "Beta Capital Investment Deposit",
        currencyCode: "NGN",
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: `${process.env.FRONTEND_URL ?? ""}?deposit=success`,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const payId = genId();
    await db.insert(paymentsTable).values({
      id: payId, userId, provider: "monnify", referenceId: reference,
      amount, currency: "NGN", status: "pending",
      metadata: JSON.stringify(resp.data.responseBody),
    });

    req.log.info({ paymentId: payId, reference }, "Monnify payment initialized successfully");
    res.json({ checkoutUrl: resp.data.responseBody.checkoutUrl, reference, paymentId: payId });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? {
      message: err.message,
      ...(axios.isAxiosError(err) && {
        status: err.response?.status,
        data: err.response?.data,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
        }
      })
    } : { raw: String(err) };
    
    req.log.error({ err: errorDetails, userId, amount }, "Monnify init failed");
    res.status(500).json({ 
      message: "Failed to initialize Monnify payment",
      ...(process.env.NODE_ENV !== "production" && { details: errorDetails })
    });
  }
});

router.post("/payments/monnify/webhook", async (req: Request, res: Response) => {
  // Verify Monnify webhook hash
  const hash = process.env.MONNIFY_SECRET_KEY ?? "";
  const signature = req.headers["monnify-signature"] as string | undefined;
  if (hash && signature) {
    const computedHash = crypto.createHmac("sha512", hash).update(JSON.stringify(req.body)).digest("hex");
    if (computedHash !== signature) { res.status(401).json({ message: "Invalid signature" }); return; }
  }

  const payload = req.body;
  if (payload.paymentStatus !== "PAID") { res.json({ message: "ignored" }); return; }

  const reference = payload.paymentReference;
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.referenceId, reference)).limit(1);
  if (!payment || payment.status === "success") { res.json({ message: "already processed" }); return; }

  await db.update(paymentsTable).set({ status: "success" }).where(eq(paymentsTable.id, payment.id));
  await creditUser(payment.userId, payment.amount, "Monnify Bank Transfer", "Bank Deposit");

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId, userId: payment.userId, title: "Deposit Confirmed",
    message: `${fmt(payment.amount)} received via Monnify and credited to your account.`,
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false, type: "success",
  });

  res.json({ message: "processed" });
});

// ─── PAYSTACK ──────────────────────────────────────────────────────────────────

router.post("/payments/paystack/initialize", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const enabled = await getSetting("gateway_paystack_enabled", "true");
  if (enabled === "false") { res.status(503).json({ message: "Paystack is currently disabled" }); return; }
  if (!process.env.PAYSTACK_SECRET_KEY) { res.status(503).json({ message: "Paystack not configured" }); return; }

  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ message: "Valid amount required" }); return; }
  
  // Enforce minimum deposit of $5,000
  const MIN_DEPOSIT = 5000;
  if (amount < MIN_DEPOSIT) {
    res.status(400).json({ message: `Minimum deposit is ${fmt(MIN_DEPOSIT)}` });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    
    req.log.info({ userId, amount, provider: "paystack" }, "Initializing Paystack payment");
    
    const reference = `av_pstk_${Date.now()}_${userId}`;
    // Paystack amount is in kobo (NGN) or USD cents — we'll use USD cents
    const amountCents = Math.round(amount * 100);

    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: amountCents,
        reference,
        currency: "USD",
        callback_url: `${process.env.FRONTEND_URL ?? ""}?deposit=success`,
        metadata: { userId, fullName: user.fullName },
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" } },
    );

    const payId = genId();
    await db.insert(paymentsTable).values({
      id: payId, userId, provider: "paystack", referenceId: reference,
      amount, currency: "USD", status: "pending",
      metadata: JSON.stringify(resp.data.data),
    });

    req.log.info({ paymentId: payId, reference }, "Paystack payment initialized successfully");
    res.json({ checkoutUrl: resp.data.data?.authorization_url, reference, paymentId: payId });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? {
      message: err.message,
      ...(axios.isAxiosError(err) && {
        status: err.response?.status,
        data: err.response?.data,
      })
    } : { raw: String(err) };
    
    req.log.error({ err: errorDetails, userId, amount }, "Paystack init failed");
    res.status(500).json({ 
      message: "Failed to initialize Paystack payment",
      ...(process.env.NODE_ENV !== "production" && { details: errorDetails })
    });
  }
});

router.post("/payments/paystack/webhook", async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const signature = req.headers["x-paystack-signature"] as string;
  if (secret && signature) {
    const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex");
    if (hash !== signature) { res.status(401).json({ message: "Invalid signature" }); return; }
  }

  const payload = req.body;
  if (payload.event !== "charge.success") { res.json({ message: "ignored" }); return; }

  const reference = payload.data?.reference;
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.referenceId, reference)).limit(1);
  if (!payment || payment.status === "success") { res.json({ message: "already processed" }); return; }

  await db.update(paymentsTable).set({ status: "success" }).where(eq(paymentsTable.id, payment.id));
  await creditUser(payment.userId, payment.amount, "Paystack", "Bank Deposit");

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId, userId: payment.userId, title: "Deposit Confirmed",
    message: `${fmt(payment.amount)} received via Paystack and credited to your account.`,
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false, type: "success",
  });

  res.json({ message: "processed" });
});

// ─── FLUTTERWAVE ───────────────────────────────────────────────────────────────

router.post("/payments/flutterwave/initialize", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const enabled = await getSetting("gateway_flutterwave_enabled", "true");
  if (enabled === "false") { res.status(503).json({ message: "Flutterwave is currently disabled" }); return; }
  if (!process.env.FLW_SECRET_KEY) { res.status(503).json({ message: "Flutterwave not configured" }); return; }

  const { amount } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ message: "Valid amount required" }); return; }
  
  // Enforce minimum deposit of $5,000
  const MIN_DEPOSIT = 5000;
  if (amount < MIN_DEPOSIT) {
    res.status(400).json({ message: `Minimum deposit is ${fmt(MIN_DEPOSIT)}` });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    
    req.log.info({ userId, amount, provider: "flutterwave" }, "Initializing Flutterwave payment");
    
    const txRef = `av_flw_${Date.now()}_${userId}`;

    const resp = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      {
        tx_ref: txRef,
        amount,
        currency: "USD",
        payment_options: "card,banktransfer,ussd",
        redirect_url: `${process.env.FRONTEND_URL ?? ""}?deposit=success`,
        customer: { email: user.email, name: user.fullName },
        customizations: {
          title: "Beta Capital Investment Deposit",
          description: "Fund your investment account",
        },
      },
      { headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`, "Content-Type": "application/json" } },
    );

    const payId = genId();
    await db.insert(paymentsTable).values({
      id: payId, userId, provider: "flutterwave", referenceId: txRef,
      amount, currency: "USD", status: "pending",
      metadata: JSON.stringify({ link: resp.data.data?.link }),
    });

    req.log.info({ paymentId: payId, reference: txRef }, "Flutterwave payment initialized successfully");
    res.json({ checkoutUrl: resp.data.data?.link, reference: txRef, paymentId: payId });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? {
      message: err.message,
      ...(axios.isAxiosError(err) && {
        status: err.response?.status,
        data: err.response?.data,
      })
    } : { raw: String(err) };
    
    req.log.error({ err: errorDetails, userId, amount }, "Flutterwave init failed");
    res.status(500).json({ 
      message: "Failed to initialize Flutterwave payment",
      ...(process.env.NODE_ENV !== "production" && { details: errorDetails })
    });
  }
});

router.post("/payments/flutterwave/webhook", async (req: Request, res: Response) => {
  const secretHash = process.env.FLW_SECRET_HASH ?? "";
  const signature = req.headers["verif-hash"] as string;
  if (secretHash && signature !== secretHash) { res.status(401).json({ message: "Invalid signature" }); return; }

  const payload = req.body;
  if (payload.event !== "charge.completed" || payload.data?.status !== "successful") {
    res.json({ message: "ignored" }); return;
  }

  const txRef = payload.data.tx_ref;
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.referenceId, txRef)).limit(1);
  if (!payment || payment.status === "success") { res.json({ message: "already processed" }); return; }

  await db.update(paymentsTable).set({ status: "success" }).where(eq(paymentsTable.id, payment.id));
  await creditUser(payment.userId, payment.amount, "Flutterwave", "Bank Deposit");

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId, userId: payment.userId, title: "Deposit Confirmed",
    message: `${fmt(payment.amount)} received via Flutterwave and credited to your account.`,
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false, type: "success",
  });

  res.json({ message: "processed" });
});

// ─── CRYPTO DEPOSITS ───────────────────────────────────────────────────────────

router.get("/payments/crypto/addresses", async (_req: Request, res: Response) => {
  // First check admin-configured addresses in platform_settings, fall back to env
  const [btcRow] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "crypto_btc_address")).limit(1);
  const [usdtTrc20Row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "crypto_usdt_trc20_address")).limit(1);
  const [usdtErc20Row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "crypto_usdt_erc20_address")).limit(1);
  const [ethRow] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "crypto_eth_address")).limit(1);
  const [solRow] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "crypto_sol_address")).limit(1);

  res.json({
    btc: btcRow?.value ?? process.env.CRYPTO_BTC_ADDRESS ?? null,
    usdtTrc20: usdtTrc20Row?.value ?? process.env.CRYPTO_USDT_TRC20_ADDRESS ?? null,
    usdtErc20: usdtErc20Row?.value ?? process.env.CRYPTO_USDT_ERC20_ADDRESS ?? null,
    eth: ethRow?.value ?? process.env.CRYPTO_ETH_ADDRESS ?? null,
    sol: solRow?.value ?? process.env.CRYPTO_SOL_ADDRESS ?? null,
  });
});

router.post("/payments/crypto/submit", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { amount, network, txHash } = req.body;
  if (!amount || !network || !txHash) {
    res.status(400).json({ message: "amount, network, and txHash required" });
    return;
  }
  
  // Enforce minimum deposit of $5,000
  const MIN_DEPOSIT = 5000;
  if (amount < MIN_DEPOSIT) {
    res.status(400).json({ message: `Minimum deposit is ${fmt(MIN_DEPOSIT)}` });
    return;
  }

  const payId = genId();
  await db.insert(paymentsTable).values({
    id: payId, userId, provider: "crypto", txHash,
    amount, currency: "USD", status: "manual_review",
    metadata: JSON.stringify({ network }),
  });

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId, userId,
    title: "Crypto Deposit Submitted",
    message: `Your ${network} deposit of ${fmt(amount)} is under review. Funds will be credited within 1–3 hours after confirmation.`,
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false, type: "info",
  });

  res.status(201).json({ message: "Submission received. Pending review.", paymentId: payId });
});

// ─── WITHDRAWALS ───────────────────────────────────────────────────────────────

router.post("/payments/withdraw", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { amount, method, bankName, bankAccountNumber, bankAccountName, cryptoAddress, cryptoNetwork } = req.body;

  if (!amount || amount <= 0) { res.status(400).json({ message: "Valid amount required" }); return; }
  if (!["bank", "crypto", "paystack"].includes(method)) { res.status(400).json({ message: "Invalid method" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  // Check max daily withdrawal
  const maxDaily = parseFloat(await getSetting("max_withdrawal_daily", "50000"));
  if (amount > maxDaily) {
    res.status(400).json({ message: `Maximum single withdrawal is ${fmt(maxDaily)}` });
    return;
  }

  if (user.liquidity < amount) {
    res.status(400).json({ message: "Insufficient available balance" });
    return;
  }

  // Deduct immediately, hold in pending
  const newLiquidity = user.liquidity - amount;
  await db.update(usersTable).set({ liquidity: newLiquidity }).where(eq(usersTable.id, userId));

  const wdId = `wd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(withdrawalRequestsTable).values({
    id: wdId, userId, amount, currency: "USD",
    method, status: "pending",
    bankName: bankName ?? user.bankName ?? null,
    bankAccountNumber: bankAccountNumber ?? user.bankAccountNumber ?? null,
    bankAccountName: bankAccountName ?? user.bankAccountName ?? null,
    cryptoAddress: cryptoAddress ?? user.cryptoWithdrawAddress ?? null,
    cryptoNetwork: cryptoNetwork ?? user.cryptoWithdrawNetwork ?? null,
  });

  // Log transaction
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fundLabel = method === "crypto"
    ? `Crypto (${(cryptoNetwork ?? user.cryptoWithdrawNetwork) ?? "Unknown"})`
    : method === "paystack" ? "Paystack" : `Bank (${(bankName ?? user.bankName) ?? "Unknown"})`;

  await db.insert(transactionsTable).values({
    id: txId, userId, type: "Withdrawal", fund: fundLabel,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    amount: -amount,
  });

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId, userId, title: "Withdrawal Requested",
    message: `Your withdrawal of ${fmt(amount)} via ${fundLabel} is being processed. You'll be notified upon completion.`,
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false, type: "info",
  });

  res.status(201).json({ message: "Withdrawal request submitted", withdrawalId: wdId, newLiquidity });
});

router.get("/payments/withdrawals", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const wds = await db.select().from(withdrawalRequestsTable)
    .where(eq(withdrawalRequestsTable.userId, userId))
    .orderBy(desc(withdrawalRequestsTable.createdAt));
  res.json(wds);
});

// ─── PAYMENT HISTORY ───────────────────────────────────────────────────────────

router.get("/payments/history", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const payments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.userId, userId))
    .orderBy(desc(paymentsTable.createdAt));
  res.json(payments.map((p) => ({
    id: p.id, provider: p.provider, amount: p.amount,
    currency: p.currency, status: p.status, createdAt: p.createdAt,
    txHash: p.txHash, referenceId: p.referenceId,
    metadata: p.metadata,
  })));
});

// ─── MARKET DATA PROXY ────────────────────────────────────────────────────────

const COIN_IDS = "bitcoin,ethereum,solana,binancecoin,ripple,tether,cardano,dogecoin,matic-network,litecoin";
const COINGECKO_HEADERS = { Accept: "application/json", "User-Agent": "BetterCapitalInvestment/1.0" };

// Simple in-memory cache to avoid hammering free APIs
const cache: Map<string, { data: unknown; ts: number }> = new Map();
function getCached<T>(key: string, ttlMs: number): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data as T;
  return null;
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

router.get("/market/prices", async (_req: Request, res: Response) => {
  const KEY = "prices";
  const cached = getCached(KEY, 60_000); // 1-min cache
  if (cached) { res.json(cached); return; }
  try {
    const [cryptoResp, goldResp] = await Promise.allSettled([
      axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_IDS}&vs_currencies=usd&include_24hr_change=true`,
        { timeout: 8000, headers: COINGECKO_HEADERS }
      ),
      // Gold spot via Yahoo Finance (server-side, no CORS)
      axios.get(
        "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=2d",
        { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
      ),
    ]);

    const data: Record<string, unknown> = cryptoResp.status === "fulfilled" ? { ...cryptoResp.value.data } : {};

    // Attach gold price
    if (goldResp.status === "fulfilled") {
      const result = goldResp.value.data?.chart?.result?.[0];
      const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
      const validCloses = closes.filter((c: number) => c != null && c > 0);
      if (validCloses.length > 0) {
        const last = validCloses[validCloses.length - 1];
        const prev = validCloses.length > 1 ? validCloses[validCloses.length - 2] : last;
        data["gold"] = {
          usd: parseFloat(last.toFixed(2)),
          usd_24h_change: prev > 0 ? ((last - prev) / prev) * 100 : 0,
        };
      }
    }

    setCache(KEY, data);
    res.json(data);
  } catch {
    res.status(503).json({ message: "Market data temporarily unavailable" });
  }
});

// Coin ID → Coinbase Exchange product ID (free public API, global access)
const COINBASE_PRODUCT: Record<string, string> = {
  bitcoin: "BTC-USD",
  ethereum: "ETH-USD",
  solana: "SOL-USD",
  ripple: "XRP-USD",
  cardano: "ADA-USD",
  dogecoin: "DOGE-USD",
  litecoin: "LTC-USD",
  binancecoin: "BNB-USD",
  "matic-network": "MATIC-USD",
};

// Historical chart data — Coinbase Exchange public candles API (no auth required)
// Returns CoinGecko-compatible shape: { prices: [[timestamp_ms, close_price], ...] }
router.get("/market/chart/:coinId", async (req: Request, res: Response) => {
  const coinId = String(req.params.coinId).replace(/[^a-z0-9-]/gi, "");
  const days = Math.min(Number(req.query.days) || 7, 365);
  const KEY = `chart_${coinId}_${days}`;
  const cached = getCached(KEY, 5 * 60_000);
  if (cached) { res.json(cached); return; }

  const product = COINBASE_PRODUCT[coinId];
  if (!product) { res.status(404).json({ message: `Unsupported coin: ${coinId}` }); return; }

  try {
    // granularity: 3600 (1h) for ≤7d, 86400 (1d) for anything longer
    // Coinbase max 300 candles per request; 30d×1h = 720 candles (exceeds limit)
    const granularity = days <= 7 ? 3600 : 86400;
    const end = Math.floor(Date.now() / 1000);
    const start = end - days * 86400;
    const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=${granularity}&start=${start}&end=${end}`;
    const resp = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "BetterCapitalInvestment/1.0", Accept: "application/json" },
    });
    // Coinbase candles: [[timestamp_sec, low, high, open, close, volume], ...]
    // Returned newest-first → reverse to get oldest-first
    const candles: number[][] = Array.isArray(resp.data) ? (resp.data as number[][]).reverse() : [];
    const prices: [number, number][] = candles.map((c) => [c[0] * 1000, c[4]]); // ts→ms, close
    const result = { prices };
    setCache(KEY, result);
    res.set("Cache-Control", "public, max-age=300");
    res.json(result);
  } catch {
    res.status(503).json({ message: "Chart data temporarily unavailable" });
  }
});

// Gold historical chart — proxies Yahoo Finance (fixes browser CORS)
router.get("/market/gold", async (req: Request, res: Response) => {
  const days = Math.min(Number(req.query.days) || 7, 365);
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 86400;
  const interval = days <= 7 ? "1h" : "1d";
  const KEY = `gold_${days}`;
  const cached = getCached(KEY, 5 * 60_000);
  if (cached) { res.json(cached); return; }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=${interval}&period1=${start}&period2=${end}&includePrePost=false`;
    const resp = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    setCache(KEY, resp.data);
    res.set("Cache-Control", "public, max-age=300");
    res.json(resp.data);
  } catch {
    res.status(503).json({ message: "Gold data temporarily unavailable" });
  }
});

router.get("/market/forex", async (_req: Request, res: Response) => {
  try {
    const resp = await axios.get("https://open.er-api.com/v6/latest/USD", { timeout: 8000 });
    res.json({ usdToNgn: resp.data.rates?.NGN ?? null });
  } catch {
    res.json({ usdToNgn: null });
  }
});

export default router;
