import { Router, type IRouter, type Request, type Response } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { db } from "@workspace/db";
import { usersTable, biometricCredentialsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const RP_NAME = "AlphaVest";
const RP_ID = process.env.APP_DOMAIN ?? "localhost";
const ORIGIN = process.env.APP_ORIGIN ?? (RP_ID === "localhost" ? "http://localhost:80" : `https://${RP_ID}`);

declare module "express-session" {
  interface SessionData {
    userId: number;
    webauthnChallenge?: string;
    webauthnEmail?: string;
  }
}

router.post("/auth/biometric/register-options", async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ message: "Not authenticated" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  const existingCreds = await db.select().from(biometricCredentialsTable).where(eq(biometricCredentialsTable.userId, userId));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: user.fullName,
    excludeCredentials: existingCreds.map(c => ({
      id: c.id,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  req.session.webauthnChallenge = options.challenge;
  res.json(options);
});

router.post("/auth/biometric/register", async (req: Request, res: Response) => {
  const userId = req.session?.userId;
  const challenge = req.session?.webauthnChallenge;
  if (!userId || !challenge) { res.status(401).json({ message: "Session invalid" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ message: "User not found" }); return; }

  try {
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ message: "Biometric registration failed" });
      return;
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await db.insert(biometricCredentialsTable).values({
      id: Buffer.from(credential.id).toString("base64url"),
      userId,
      credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    }).onConflictDoUpdate({
      target: biometricCredentialsTable.id,
      set: {
        credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
    });

    await db.update(usersTable).set({ biometricEnabled: true }).where(eq(usersTable.id, userId));

    delete req.session.webauthnChallenge;
    res.json({ verified: true });
  } catch (err) {
    res.status(400).json({ message: "Verification failed" });
  }
});

router.post("/auth/biometric/login-options", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ message: "email required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.biometricEnabled) {
    res.status(404).json({ message: "Biometric login not set up for this account" });
    return;
  }

  const creds = await db.select().from(biometricCredentialsTable).where(eq(biometricCredentialsTable.userId, user.id));
  if (creds.length === 0) {
    res.status(404).json({ message: "No biometric credentials found" });
    return;
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: creds.map(c => ({
      id: c.id,
      type: "public-key" as const,
      transports: [] as AuthenticatorTransportFuture[],
    })),
    userVerification: "preferred",
  });

  req.session.webauthnChallenge = options.challenge;
  req.session.webauthnEmail = email.toLowerCase();
  res.json(options);
});

router.post("/auth/biometric/login", async (req: Request, res: Response) => {
  const challenge = req.session?.webauthnChallenge;
  const email = req.session?.webauthnEmail;
  if (!challenge || !email) { res.status(401).json({ message: "Session invalid" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) { res.status(401).json({ message: "User not found" }); return; }

  const credId = req.body.id as string;
  const [cred] = await db.select().from(biometricCredentialsTable).where(eq(biometricCredentialsTable.id, credId)).limit(1);
  if (!cred) { res.status(401).json({ message: "Credential not found" }); return; }

  try {
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: cred.id,
        publicKey: Buffer.from(cred.credentialPublicKey, "base64"),
        counter: cred.counter,
        transports: [] as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      res.status(401).json({ message: "Biometric verification failed" });
      return;
    }

    await db.update(biometricCredentialsTable)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(biometricCredentialsTable.id, credId));

    delete req.session.webauthnChallenge;
    delete req.session.webauthnEmail;

    req.session.userId = user.id;
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      tier: user.tier,
      theme: user.theme,
      biometricEnabled: user.biometricEnabled,
      liquidity: user.liquidity,
    });
  } catch {
    res.status(401).json({ message: "Biometric verification failed" });
  }
});

export default router;
