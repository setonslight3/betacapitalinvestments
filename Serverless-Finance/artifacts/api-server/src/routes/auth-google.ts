import { Router, type IRouter, type Request, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { db } from "@workspace/db";
import { usersTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { isAdminEmail, serializeUser } from "./auth";

const router: IRouter = Router();

function getClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL,
  );
}

const SCOPES = ["openid", "email", "profile"];

router.get("/auth/google/redirect", (req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ message: "Google OAuth not configured" });
    return;
  }
  const client = getClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "select_account",
    // Pass redirect_uri explicitly so it matches what's configured in Google Console
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
  });
  res.json({ url });
});

router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;
  const frontendBase = process.env.FRONTEND_URL ?? "/";

  if (error || !code) {
    res.redirect(`${frontendBase}?auth_error=google_denied`);
    return;
  }

  try {
    const client = getClient();
    const { tokens } = await client.getToken({
      code: String(code),
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    });
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.redirect(`${frontendBase}?auth_error=no_email`);
      return;
    }

    const email = payload.email.toLowerCase();
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      [user] = await db
        .insert(usersTable)
        .values({
          email,
          fullName: payload.name ?? email.split("@")[0],
          passwordHash: null,
          googleId: payload.sub,
          avatarUrl: payload.picture ?? null,
          emailVerified: true,
          isAdmin: isAdminEmail(email),
          tier: "Gold Ore",
          theme: "sovereign",
          biometricEnabled: false,
          liquidity: 0,
        })
        .returning();

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db
        .insert(notificationsTable)
        .values({
          id: notifId,
          userId: user.id,
          title: "Welcome to AlphaVest",
          message: "Your account has been created via Google. Deposit funds to start investing.",
          timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
          read: false,
          type: "success",
        })
        .catch(() => {});
    } else {
      // Update google link and optionally promote admin
      const updates: Partial<typeof usersTable.$inferInsert> = {};
      if (!user.googleId) updates.googleId = payload.sub;
      if (!user.emailVerified) updates.emailVerified = true;
      if (isAdminEmail(email) && !user.isAdmin) updates.isAdmin = true;
      if (payload.picture && !user.avatarUrl) updates.avatarUrl = payload.picture;
      if (Object.keys(updates).length > 0) {
        await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
        Object.assign(user, updates);
      }
    }

    req.session.userId = user.id;
    await new Promise<void>((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
    res.redirect(`${frontendBase}?google_auth=success`);
  } catch {
    res.redirect(`${frontendBase}?auth_error=google_failed`);
  }
});

export default router;
