import { pgTable, serial, text, real, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash"),
  googleId: varchar("google_id", { length: 255 }),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  tier: varchar("tier", { length: 50 }).notNull().default("Gold Ore"),
  theme: varchar("theme", { length: 50 }).notNull().default("sovereign"),
  biometricEnabled: boolean("biometric_enabled").notNull().default(false),
  liquidity: real("liquidity").notNull().default(0),
  // Withdrawal payout settings
  bankName: text("bank_name"),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankAccountName: text("bank_account_name"),
  cryptoWithdrawAddress: text("crypto_withdraw_address"),
  cryptoWithdrawNetwork: varchar("crypto_withdraw_network", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpsTable = pgTable("otps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // email_verify | password_reset
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const biometricCredentialsTable = pgTable("biometric_credentials", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  credentialPublicKey: text("credential_public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: varchar("device_type", { length: 50 }),
  backedUp: boolean("backed_up").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 30 }).notNull(), // monnify | flutterwave | paystack | crypto
  referenceId: varchar("reference_id", { length: 255 }),
  txHash: text("tx_hash"),
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | success | failed | manual_review
  metadata: text("metadata"), // JSON string for provider-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  method: varchar("method", { length: 30 }).notNull(), // bank | crypto | paystack
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | processing
  bankName: text("bank_name"),
  bankAccountNumber: varchar("bank_account_number", { length: 50 }),
  bankAccountName: text("bank_account_name"),
  cryptoAddress: text("crypto_address"),
  cryptoNetwork: varchar("crypto_network", { length: 30 }),
  paystackRecipientCode: varchar("paystack_recipient_code", { length: 100 }),
  adminNote: text("admin_note"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kycDocumentsTable = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 50 }).notNull(), // passport | national_id | drivers_license | utility_bill
  fileDataBase64: text("file_data_base64").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: varchar("mime_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected
  adminNote: text("admin_note"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSettingsTable = pgTable("platform_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const investmentsTable = pgTable("investments", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sectorId: varchar("sector_id", { length: 50 }).notNull(),
  sectorTitle: text("sector_title").notNull(),
  amount: real("amount").notNull(),
  startDateStamp: text("start_date_stamp").notNull(),
  daysActive: integer("days_active").notNull().default(0),
  dailyRate: real("daily_rate").notNull(),
  accruedYield: real("accrued_yield").notNull().default(0),
  tierName: text("tier_name").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  fund: text("fund").notNull(),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: varchar("id", { length: 50 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  type: varchar("type", { length: 20 }).notNull().default("info"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Investment = typeof investmentsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type Payment = typeof paymentsTable.$inferSelect;
export type BiometricCredential = typeof biometricCredentialsTable.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
export type KycDocument = typeof kycDocumentsTable.$inferSelect;
