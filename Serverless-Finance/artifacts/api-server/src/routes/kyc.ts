import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { kycDocumentsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/admin-middleware";

const router: IRouter = Router();

router.post("/kyc/submit", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { docType, fileDataBase64, fileName, mimeType } = req.body;
  if (!docType || !fileDataBase64 || !fileName || !mimeType) {
    res.status(400).json({ message: "docType, fileDataBase64, fileName, and mimeType are required" });
    return;
  }

  const allowedTypes = ["passport", "national_id", "drivers_license", "utility_bill"];
  if (!allowedTypes.includes(docType)) {
    res.status(400).json({ message: "Invalid document type" });
    return;
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedMimes.includes(mimeType)) {
    res.status(400).json({ message: "Only JPEG, PNG, WebP or PDF files are accepted" });
    return;
  }

  // Max 5MB base64
  if (fileDataBase64.length > 7_000_000) {
    res.status(400).json({ message: "File too large. Max 5MB." });
    return;
  }

  const [doc] = await db
    .insert(kycDocumentsTable)
    .values({ userId, docType, fileDataBase64, fileName, mimeType, status: "pending" })
    .returning();

  res.status(201).json({
    id: doc.id,
    docType: doc.docType,
    fileName: doc.fileName,
    status: doc.status,
    createdAt: doc.createdAt,
  });
});

router.get("/kyc/status", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const docs = await db
    .select({
      id: kycDocumentsTable.id,
      docType: kycDocumentsTable.docType,
      fileName: kycDocumentsTable.fileName,
      status: kycDocumentsTable.status,
      adminNote: kycDocumentsTable.adminNote,
      createdAt: kycDocumentsTable.createdAt,
      reviewedAt: kycDocumentsTable.reviewedAt,
    })
    .from(kycDocumentsTable)
    .where(eq(kycDocumentsTable.userId, userId))
    .orderBy(desc(kycDocumentsTable.createdAt));

  res.json(docs);
});

export default router;
