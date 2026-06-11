import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable, otpsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { sendEmail, otpEmailHtml } from "../lib/mailer";

const router: IRouter = Router();

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function expiresAt(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}

router.post("/auth/request-otp", async (req: Request, res: Response) => {
  const { email, type } = req.body;
  if (!email || !["email_verify", "password_reset"].includes(type)) {
    res.status(400).json({ message: "email and valid type required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.json({ message: "If that email exists, a code was sent." });
    return;
  }

  // Invalidate existing unused OTPs of same type
  await db.update(otpsTable).set({ used: true }).where(
    and(eq(otpsTable.email, email.toLowerCase()), eq(otpsTable.type, type), eq(otpsTable.used, false))
  );

  const code = generateCode();
  await db.insert(otpsTable).values({
    userId: user.id,
    email: email.toLowerCase(),
    code,
    type,
    expiresAt: expiresAt(),
    used: false,
  });

  const subject = type === "email_verify" ? "Verify Your AlphaVest Account" : "Reset Your AlphaVest Password";
  await sendEmail(user.email, subject, otpEmailHtml(code, type === "email_verify" ? "verify" : "reset", user.fullName));

  res.json({ message: "Code sent. Check your email." });
});

router.post("/auth/verify-email", async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ message: "email and code required" });
    return;
  }

  const now = new Date();
  const [otp] = await db.select().from(otpsTable).where(
    and(
      eq(otpsTable.email, email.toLowerCase()),
      eq(otpsTable.code, code),
      eq(otpsTable.type, "email_verify"),
      eq(otpsTable.used, false),
      gt(otpsTable.expiresAt, now)
    )
  ).limit(1);

  if (!otp) {
    res.status(400).json({ message: "Invalid or expired code." });
    return;
  }

  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otp.id));
  const [user] = await db.update(usersTable).set({ emailVerified: true }).where(eq(usersTable.email, email.toLowerCase())).returning();

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  req.session.userId = user.id;

  // Welcome notification
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId,
    userId: user.id,
    title: "Account Verified",
    message: "Your email has been verified. Welcome to AlphaVest — deposit funds to begin investing.",
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false,
    type: "success",
  }).catch(() => {});

  res.json({ message: "Email verified", userId: user.id });
});

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ message: "email required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) { res.json({ message: "If that email exists, a code was sent." }); return; }

  await db.update(otpsTable).set({ used: true }).where(
    and(eq(otpsTable.email, email.toLowerCase()), eq(otpsTable.type, "password_reset"), eq(otpsTable.used, false))
  );

  const code = generateCode();
  await db.insert(otpsTable).values({
    userId: user.id,
    email: email.toLowerCase(),
    code,
    type: "password_reset",
    expiresAt: expiresAt(),
    used: false,
  });

  const emailConfigured = !!process.env.RESEND_API_KEY;
  if (emailConfigured) {
    await sendEmail(user.email, "Reset Your AlphaVest Password", otpEmailHtml(code, "reset", user.fullName));
    res.json({ message: "Reset code sent. Check your email." });
  } else {
    // No email service configured — return code directly so user can still reset password
    res.json({ message: "Email service not configured. Use the code shown below.", devCode: code, devMode: true });
  }
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ message: "email, code, and newPassword required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const now = new Date();
  const [otp] = await db.select().from(otpsTable).where(
    and(
      eq(otpsTable.email, email.toLowerCase()),
      eq(otpsTable.code, code),
      eq(otpsTable.type, "password_reset"),
      eq(otpsTable.used, false),
      gt(otpsTable.expiresAt, now)
    )
  ).limit(1);

  if (!otp) {
    res.status(400).json({ message: "Invalid or expired code." });
    return;
  }

  await db.update(otpsTable).set({ used: true }).where(eq(otpsTable.id, otp.id));
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, email.toLowerCase()));

  res.json({ message: "Password reset successful. You may now sign in." });
});

export default router;
