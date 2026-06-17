import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "bonnieprincewill6@gmail.com,setonslight1@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    accountStatus: user.accountStatus,
    tier: user.tier,
    theme: user.theme,
    biometricEnabled: user.biometricEnabled,
    liquidity: user.liquidity,
    isAdmin: user.isAdmin,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    bankName: user.bankName,
    bankAccountNumber: user.bankAccountNumber,
    bankAccountName: user.bankAccountName,
    cryptoWithdrawAddress: user.cryptoWithdrawAddress,
    cryptoWithdrawNetwork: user.cryptoWithdrawNetwork,
  };
}

export function tierFromWealth(wealth: number): string {
  if (wealth >= 500000) return "Diamond Ore";
  if (wealth >= 100000) return "Platinum Ore";
  if (wealth >= 25000) return "Gold Ore";
  if (wealth >= 5000) return "Silver Ore";
  return "Bronze Ore";
}

router.post("/auth/signup", async (req: Request, res: Response) => {
  const { email, password, fullName, phoneNumber } = req.body;
  if (!email || !password || !fullName || !phoneNumber) {
    res.status(400).json({ message: "All fields required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = isAdminEmail(email);

  // Auto-verify email when no email service is configured (Resend API key missing)
  const autoVerify = !process.env.RESEND_API_KEY || admin;

  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      fullName,
      phoneNumber,
      passwordHash,
      isAdmin: admin,
      emailVerified: autoVerify,
      accountStatus: admin ? "approved" : "pending",
      tier: "Bronze Ore",
      theme: "sovereign",
      biometricEnabled: false,
      liquidity: 0,
    })
    .returning();

  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId,
    userId: user.id,
    title: "Welcome to BetterCapitalInvestment",
    message: "Your account has been created. Complete email verification then deposit funds to start building wealth.",
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false,
    type: "success",
  });

  req.session.userId = user.id;
  res.status(201).json(serializeUser(user));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ message: "Email and password required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ message: "This account uses Google sign-in. Please sign in with Google." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  // Auto-promote admin emails
  if (isAdminEmail(email) && !user.isAdmin) {
    await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.id, user.id));
    user.isAdmin = true;
  }

  req.session.userId = user.id;
  await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
  res.json(serializeUser(user));
});

router.post("/auth/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ message: "User not found" });
    return;
  }
  res.json(serializeUser(user));
});

export default router;
export { ADMIN_EMAILS };
