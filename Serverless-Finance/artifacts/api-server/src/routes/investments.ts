import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { investmentsTable, notificationsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return userId;
}

router.get("/investments", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rows = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  res.json(rows.map(r => ({
    id: r.id,
    sectorId: r.sectorId,
    sectorTitle: r.sectorTitle,
    amount: r.amount,
    startDateStamp: r.startDateStamp,
    daysActive: r.daysActive,
    dailyRate: r.dailyRate,
    accruedYield: r.accruedYield,
    tierName: r.tierName,
    status: r.status,
  })));
});

router.post("/investments", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { sectorId, sectorTitle, amount, dailyRate, tierName } = req.body;
  if (!sectorId || !sectorTitle || !amount || !dailyRate || !tierName) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }
  const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = new Date();
  const startDateStamp = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const [row] = await db.insert(investmentsTable).values({
    id,
    userId,
    sectorId,
    sectorTitle,
    amount,
    startDateStamp,
    daysActive: 0,
    dailyRate,
    accruedYield: 0,
    tierName,
    status: "active",
  }).returning();

  // Add notification
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
  await db.insert(notificationsTable).values({
    id: notifId,
    userId,
    title: "Investment Confirmed",
    message: `${fmt(amount)} pledged to ${sectorTitle} at ${(dailyRate * 100).toFixed(2)}% daily via ${tierName} tier.`,
    timestamp: startDateStamp,
    read: false,
    type: "success",
  });

  res.status(201).json({
    id: row.id,
    sectorId: row.sectorId,
    sectorTitle: row.sectorTitle,
    amount: row.amount,
    startDateStamp: row.startDateStamp,
    daysActive: row.daysActive,
    dailyRate: row.dailyRate,
    accruedYield: row.accruedYield,
    tierName: row.tierName,
    status: row.status,
  });
});

router.patch("/investments/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = String(req.params.id);
  const { status, daysActive, accruedYield } = req.body;

  const updates: Partial<typeof investmentsTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (daysActive !== undefined) updates.daysActive = daysActive;
  if (accruedYield !== undefined) updates.accruedYield = accruedYield;

  const [row] = await db
    .update(investmentsTable)
    .set(updates)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, userId)))
    .returning();

  if (!row) {
    res.status(404).json({ message: "Investment not found" });
    return;
  }

  if (status === "withdrawn_early") {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
    await db.insert(notificationsTable).values({
      id: notifId,
      userId,
      title: "Early Exit Applied",
      message: `Your ${row.sectorTitle} position was closed early. A 5% penalty was applied on the principal of ${fmt(row.amount)}.`,
      timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      read: false,
      type: "alert",
    });
  }

  res.json({
    id: row.id,
    sectorId: row.sectorId,
    sectorTitle: row.sectorTitle,
    amount: row.amount,
    startDateStamp: row.startDateStamp,
    daysActive: row.daysActive,
    dailyRate: row.dailyRate,
    accruedYield: row.accruedYield,
    tierName: row.tierName,
    status: row.status,
  });
});

export default router;
