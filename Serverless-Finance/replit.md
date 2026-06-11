# AlphaVest

Premium investment platform — accounts, investments, deposits (Monnify/Flutterwave/Paystack/crypto), withdrawals (bank/crypto), admin dashboard, Google OAuth, WebAuthn biometrics, email OTPs via Resend, KYC document upload.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + Lucide icons + Recharts
- API: Express 5 + express-session + connect-pg-simple (PostgreSQL session store)
- DB: PostgreSQL + Drizzle ORM
- Auth: bcrypt passwords, Google OAuth2, WebAuthn biometrics, Resend email OTPs
- Payments: Monnify, Flutterwave, Paystack, manual crypto
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Deployment: Netlify (serverless via `serverless-http` wrapping Express)

## Where things live

- `artifacts/alphavest/src/` — React frontend (App.tsx, components/, types.ts, data.ts)
- `artifacts/alphavest/src/components/` — All UI components (LandingView, DashboardView, AdminDashboard, PaymentModal, WithdrawModal, etc.)
- `artifacts/api-server/src/app.ts` — Express app setup (session, CORS, middleware)
- `artifacts/api-server/src/routes/` — All API routes (auth, investments, payments, admin, etc.)
- `artifacts/api-server/src/lib/` — Shared utilities (mailer, admin-middleware)
- `lib/db/src/schema/index.ts` — Full Drizzle ORM schema (all tables)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for generated hooks)
- `netlify/functions/api.ts` — Netlify serverless wrapper for Express
- `netlify.toml` — Netlify build config
- `CONFIGURATION.md` — Full deployment and API key configuration guide

## Architecture decisions

- Serverless via `serverless-http`: Express app wrapped as a single Netlify Function. Sessions stored in PostgreSQL so they survive across serverless invocations.
- Cookie-based sessions (not JWTs): uses `express-session` + `connect-pg-simple`. Session cookies are `httpOnly`, `secure`, `sameSite: none` in production.
- OpenAPI-first: generated React Query hooks from `lib/api-spec/openapi.yaml` handle all data fetching. Non-generated routes (payments, auth-otp, admin, biometric, kyc) use direct `fetch` in components.
- Admin access is list-based: `ADMIN_EMAILS` env var (comma-separated). Any user with a matching email gets `isAdmin: true` on login/signup.
- Graceful degradation: all external integrations (Resend, Google OAuth, payment gateways) fail gracefully with informative errors when not configured.

## Product

- **Landing page**: marketing site with live market ticker, investment plans, FAQ
- **Auth**: email/password signup, Google OAuth, email OTP verification, WebAuthn biometric login
- **Dashboard**: portfolio overview, active investments, transaction ledger, analytics charts, notifications, settings
- **Deposits**: Monnify (bank transfer), Flutterwave (card/bank), Paystack, manual crypto (BTC/USDT/ETH/SOL)
- **Withdrawals**: bank transfer, crypto, Paystack — all go to admin approval queue
- **Admin dashboard**: platform metrics, user management, investment oversight, withdrawal approvals, crypto payment verification, KYC review, platform settings

## User preferences

- Deploy target: Netlify (serverless)
- See `CONFIGURATION.md` for the complete API key and redirect URL setup guide

## Gotchas

- In Netlify Functions, `serverless-http` maps `/.netlify/functions/api` back to the full Express `/api/*` path via the redirect in `netlify.toml`
- `connect-pg-simple` creates the `user_sessions` table automatically via `createTableIfMissing: true`
- WebAuthn (`APP_DOMAIN`, `APP_ORIGIN`) must match the actual domain — biometric registration fails if these don't match
- The `@workspace/api-client-react` custom-fetch has `credentials: 'include'` set as default so session cookies are sent with all API requests
- Crypto wallet addresses: admin-configured values (via Admin → Platform Settings) take precedence over environment variable values
- Run `pnpm --filter @workspace/api-spec run codegen` after any change to `lib/api-spec/openapi.yaml`

## Pointers

- See `CONFIGURATION.md` for the full deployment guide (all env vars, webhook URLs, OAuth redirect URIs)
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
