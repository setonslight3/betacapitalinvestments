import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return userId;
}

router.patch("/profile", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { fullName, theme, biometricEnabled } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (theme !== undefined) updates.theme = theme;
  if (biometricEnabled !== undefined) updates.biometricEnabled = biometricEnabled;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    tier: user.tier,
    theme: user.theme,
    biometricEnabled: user.biometricEnabled,
    liquidity: user.liquidity,
  });
});

export default router;
