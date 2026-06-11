import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ message: "Not authenticated" });
    return null;
  }
  return userId;
}

function serialize(r: typeof notificationsTable.$inferSelect) {
  return { id: r.id, title: r.title, message: r.message, timestamp: r.timestamp, read: r.read, type: r.type };
}

router.get("/notifications", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt));
  res.json(rows.map(serialize));
});

router.post("/notifications/read-all", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, userId));
  res.json({ message: "All notifications marked read" });
});

router.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = String(req.params.id);
  const [row] = await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)))
    .returning();
  if (!row) {
    res.status(404).json({ message: "Notification not found" });
    return;
  }
  res.json(serialize(row));
});

export default router;
