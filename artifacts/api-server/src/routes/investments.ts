import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { investmentsTable, notificationsTable, usersTable, transactionsTable } from "@workspace/db/schema";
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

// Automatic ROI calculation - serverless approach
// Calculates ROI based on time elapsed since creation
function calculateAutoROI(investment: any) {
  if (investment.status !== "active") {
    return investment; // Don't recalculate for completed/withdrawn investments
  }

  // Use createdAt timestamp for accurate calculation
  const startDate = new Date(investment.createdAt);
  const now = new Date();
  const msElapsed = now.getTime() - startDate.getTime();
  const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  
  // Cap at 30 days (standard investment term)
  const actualDays = Math.min(daysElapsed, 30);
  
  // Calculate accrued yield: principal × daily rate × days
  const newAccruedYield = investment.amount * investment.dailyRate * actualDays;
  
  return {
    ...investment,
    daysActive: actualDays,
    accruedYield: newAccruedYield,
    // Mark as completed if 30 days have passed
    status: daysElapsed >= 30 ? "completed" : "active"
  };
}

// Sync investment to database if it has changed
async function syncInvestmentIfNeeded(original: any, calculated: any) {
  // Check if days or status changed
  if (calculated.daysActive !== original.daysActive || 
      calculated.status !== original.status) {
    
    await db
      .update(investmentsTable)
      .set({
        daysActive: calculated.daysActive,
        accruedYield: calculated.accruedYield,
        status: calculated.status,
      })
      .where(eq(investmentsTable.id, original.id));
    
    // If investment just completed (hit 30 days), credit the user
    if (calculated.status === "completed" && original.status === "active") {
      await creditUserWithROI(original.userId, original.id, calculated.accruedYield, original.sectorTitle);
    }
  }
}

// Credit user with final ROI payout
async function creditUserWithROI(userId: number, investmentId: string, roiAmount: number, sectorTitle: string) {
  // Get user and update liquidity
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return;
  
  const newLiquidity = (user.liquidity ?? 0) + roiAmount;
  await db.update(usersTable).set({ liquidity: newLiquidity }).where(eq(usersTable.id, userId));
  
  // Create transaction record
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
  
  await db.insert(transactionsTable).values({
    id: txId,
    userId,
    type: "ROI Payout",
    fund: sectorTitle,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    amount: roiAmount,
  });
  
  // Create notification
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.insert(notificationsTable).values({
    id: notifId,
    userId,
    title: "Investment Matured",
    message: `Your ${sectorTitle} investment has completed its 30-day term. ROI of ${fmt(roiAmount)} has been credited to your account.`,
    timestamp: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    read: false,
    type: "success",
  });
}

router.get("/investments", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  
  const rows = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  
  // Calculate ROI automatically for each investment
  const updatedRows = await Promise.all(rows.map(async (r) => {
    const calculated = calculateAutoROI(r);
    
    // Sync to database if needed (async, don't wait)
    syncInvestmentIfNeeded(r, calculated).catch(err => {
      console.error("Failed to sync investment:", err);
    });
    
    return {
      id: calculated.id,
      sectorId: calculated.sectorId,
      sectorTitle: calculated.sectorTitle,
      amount: calculated.amount,
      startDateStamp: calculated.startDateStamp,
      daysActive: calculated.daysActive,
      dailyRate: calculated.dailyRate,
      accruedYield: calculated.accruedYield,
      tierName: calculated.tierName,
      status: calculated.status,
    };
  }));
  
  res.json(updatedRows);
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
    createdAt: now, // Store exact timestamp for ROI calculation
  }).returning();

  // Add notification
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
  await db.insert(notificationsTable).values({
    id: notifId,
    userId,
    title: "Investment Confirmed",
    message: `${fmt(amount)} pledged to ${sectorTitle} at ${(dailyRate * 100).toFixed(2)}% daily via ${tierName} tier. ROI will accrue automatically every 24 hours.`,
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
