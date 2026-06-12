import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const isProd = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : [];

app.use(
  cors({
    origin:
      isProd && allowedOrigins.length > 0
        ? (origin, cb) => {
            if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
              cb(null, true);
            } else {
              cb(new Error("Not allowed by CORS"));
            }
          }
        : true,
    credentials: true,
  }),
);

app.set("trust proxy", 1);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
  skip: (req) => req.path === "/api/healthz",
  // Disable key generator - use default behavior in serverless
  validate: { trustProxy: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again in 15 minutes." },
  // Disable key generator - use default behavior in serverless
  validate: { trustProxy: false },
});

const PgStore = connectPgSimple(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "BetterCapitalInvestment-fallback-secret",
    resave: false,
    saveUninitialized: false,
    store: isProd
      ? new PgStore({
          pool,
          tableName: "user_sessions",
          createTableIfMissing: true,
        })
      : undefined,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

export default app;
