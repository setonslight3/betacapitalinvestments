import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse DATABASE_URL and explicitly set SSL mode to avoid future deprecation warnings
const databaseUrl = process.env.DATABASE_URL;
const isProd = process.env.NODE_ENV === "production";

// For production, explicitly use verify-full SSL mode as recommended
// For development, allow connection without SSL
const poolConfig: pg.PoolConfig = {
  connectionString: databaseUrl,
  ssl: isProd
    ? {
        rejectUnauthorized: true, // verify-full equivalent
      }
    : false,
};

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });

export * from "./schema";
