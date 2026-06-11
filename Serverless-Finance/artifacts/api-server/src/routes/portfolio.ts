import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { investmentsTable, transactionsTable, usersTable } from "@workspace/db/schema";
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

router.get("/portfolio/summary", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const txs = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));

  const activeInvestments = investments.filter(i => i.status === "active");
  const activePrincipal = activeInvestments.reduce((s, i) => s + i.amount, 0);
  const accruedYield = activeInvestments.reduce((s, i) => s + i.accruedYield, 0);
  const totalROIReceived = txs.filter(t => t.type === "ROI Payout").reduce((s, t) => s + t.amount, 0);
  const liquidity = user?.liquidity ?? 0;
  const totalWealth = liquidity + activePrincipal + accruedYield;

  res.json({
    totalWealth,
    activePrincipal,
    totalROIReceived,
    liquidity,
    activeInvestmentCount: activeInvestments.length,
  });
});

router.get("/liquidity", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.json({ liquidity: user?.liquidity ?? 0 });
});

router.patch("/liquidity", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { delta } = req.body;
  if (delta === undefined || isNaN(Number(delta))) {
    res.status(400).json({ message: "delta is required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const current = user?.liquidity ?? 0;
  const next = Math.max(0, current + Number(delta));

  // Update tier based on new total wealth
  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const activePrincipal = investments.filter(i => i.status === "active").reduce((s, i) => s + i.amount, 0);
  const totalWealth = next + activePrincipal;
  let tier = "Gold Ore";
  if (totalWealth >= 500000) tier = "Diamond Reserve";
  else if (totalWealth >= 100000) tier = "Platinum Vault";
  else if (totalWealth >= 25000) tier = "Silver Sterling";

  const [updated] = await db
    .update(usersTable)
    .set({ liquidity: next, tier })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({ liquidity: updated.liquidity });
});

export default router;
