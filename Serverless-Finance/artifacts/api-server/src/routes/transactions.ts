import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { transactionsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return userId;
}

router.get("/transactions", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(rows.map(r => ({
    id: r.id,
    type: r.type,
    fund: r.fund,
    date: r.date,
    amount: r.amount,
  })));
});

router.post("/transactions", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const { type, fund, amount } = req.body;
  if (!type || !fund || amount === undefined) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const [row] = await db.insert(transactionsTable).values({ id, userId, type, fund, date, amount }).returning();
  res.status(201).json({ id: row.id, type: row.type, fund: row.fund, date: row.date, amount: row.amount });
});

export default router;
