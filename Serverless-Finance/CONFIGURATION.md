# AlphaVest — Configuration & Deployment Guide

This document covers every environment variable, API key, redirect URL, and configuration step needed to deploy AlphaVest on Netlify.

---

## 1. Netlify Setup

### Build Settings (auto-detected from `netlify.toml`)

| Field | Value |
|---|---|
| Base directory | `.` (workspace root) |
| Build command | `pnpm install && pnpm run typecheck:libs && pnpm --filter @workspace/alphavest run build` |
| Publish directory | `artifacts/alphavest/dist/public` |
| Functions directory | `netlify/functions` |

### Architecture

```
Browser → Netlify CDN → /api/* → Netlify Function (serverless Express)
                      → /*    → Static React SPA (artifacts/alphavest/dist/public)
```

The entire Express API server is wrapped in `netlify/functions/api.ts` using `serverless-http`. Sessions are stored in PostgreSQL so they survive across serverless invocations.

---

## 2. Required Environment Variables

Set these in **Netlify → Site Settings → Environment Variables**.

### Core (Required)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Use [Neon](https://neon.tech) (recommended for serverless) or any PostgreSQL host | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | Random 64-char string used to sign session cookies. Generate with: `openssl rand -hex 32` | `a1b2c3d4e5f6...` |
| `NODE_ENV` | Must be `production` in Netlify | `production` |

### Auth

| Variable | Description | Required? |
|---|---|---|
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses | Optional (defaults to `bonnieprincewill6@gmail.com,setonslight1@gmail.com`) |

---

## 3. Google OAuth

### Step 1: Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add Authorized redirect URIs:
   - Production: `https://YOUR-SITE.netlify.app/api/auth/google/callback`
   - Development: `http://localhost:80/api/auth/google/callback`
5. Copy the **Client ID** and **Client Secret**

### Step 2: Set environment variables

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Your OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Your OAuth 2.0 Client Secret |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-SITE.netlify.app/api/auth/google/callback` |
| `FRONTEND_URL` | `https://YOUR-SITE.netlify.app` |

> **Important**: `GOOGLE_CALLBACK_URL` must exactly match one of the authorized redirect URIs in Google Console.

### How it works

1. User clicks "Sign in with Google" → hits `/api/auth/google/redirect` → gets auth URL
2. User is redirected to Google → authenticates
3. Google redirects to `GOOGLE_CALLBACK_URL` → session created → user redirected to frontend

---

## 4. Email OTPs (Resend)

AlphaVest sends OTP codes for email verification and password reset using [Resend](https://resend.com).

### Setup

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create an API key with sending permissions

### Environment Variables

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (starts with `re_`) |
| `EMAIL_FROM` | Sender address (must match your verified domain). Example: `AlphaVest <noreply@yourdomain.com>` |

> **Without `RESEND_API_KEY`**: Email is logged to the server console instead of being sent. Users' emails are auto-verified on signup (useful for testing).

---

## 5. Payment Gateways

### Monnify (Bank Transfer — Nigeria)

| Variable | Description |
|---|---|
| `MONNIFY_API_KEY` | From Monnify merchant dashboard |
| `MONNIFY_SECRET_KEY` | From Monnify merchant dashboard |
| `MONNIFY_CONTRACT_CODE` | Your Monnify contract code |
| `MONNIFY_BASE_URL` | `https://api.monnify.com` (production) or `https://sandbox.monnify.com` (testing) |

**Webhook URL to configure in Monnify:**
```
https://YOUR-SITE.netlify.app/api/payments/monnify/webhook
```

### Flutterwave (Card, Bank Transfer, USSD)

| Variable | Description |
|---|---|
| `FLW_SECRET_KEY` | From Flutterwave dashboard → API Keys |
| `FLW_SECRET_HASH` | Webhook secret hash from Flutterwave dashboard |

**Webhook URL to configure in Flutterwave:**
```
https://YOUR-SITE.netlify.app/api/payments/flutterwave/webhook
```

### Paystack

| Variable | Description |
|---|---|
| `PAYSTACK_SECRET_KEY` | From Paystack dashboard → Settings → API Keys |

**Webhook URL to configure in Paystack:**
```
https://YOUR-SITE.netlify.app/api/payments/paystack/webhook
```

### Crypto Payments

Crypto deposits are handled manually — users submit a transaction hash and admin approves them.

Set wallet addresses either as environment variables **or** via the admin dashboard (Admin → Platform Settings):

| Variable | Description |
|---|---|
| `CRYPTO_BTC_ADDRESS` | Bitcoin deposit address |
| `CRYPTO_USDT_TRC20_ADDRESS` | USDT TRC-20 deposit address |
| `CRYPTO_USDT_ERC20_ADDRESS` | USDT ERC-20 deposit address |
| `CRYPTO_ETH_ADDRESS` | Ethereum deposit address |
| `CRYPTO_SOL_ADDRESS` | Solana deposit address |

> Admin-configured addresses (via dashboard) override environment variables.

---

## 6. Withdrawal Flow

### How withdrawals work

1. User submits withdrawal request with method (`bank`, `crypto`, or `paystack`)
2. Funds are immediately deducted from user's available balance and held as `pending`
3. Admin reviews the request in the Admin Dashboard → Withdrawals
4. Admin clicks **Approve** or **Reject**
5. On approval: funds transfer is processed manually + user is notified by email
6. On rejection: funds are returned to user's balance

### Withdrawal bank/crypto details

Users can save their payout details in **Settings → Withdrawal Settings**:
- Bank name, account number, account name (for bank withdrawals)
- Crypto wallet address + network (for crypto withdrawals)

These are stored on the user profile and pre-filled in the withdrawal form.

---

## 7. Biometric Authentication (WebAuthn)

Biometric login uses the WebAuthn standard (fingerprint/face ID). It works on supported browsers (Chrome, Safari, Firefox) on devices with biometric hardware.

| Variable | Description | Default |
|---|---|---|
| `APP_DOMAIN` | Your site's domain (no `https://`) | `localhost` |
| `APP_ORIGIN` | Full origin URL | `https://{APP_DOMAIN}` |

For Netlify, set:
```
APP_DOMAIN = YOUR-SITE.netlify.app
APP_ORIGIN = https://YOUR-SITE.netlify.app
```

---

## 8. Admin Dashboard

### Access

Any email listed in `ADMIN_EMAILS` automatically receives admin access. The admin panel is accessible at the `/admin` route after login.

### Admin capabilities

- **Dashboard**: Platform-wide metrics (AUM, users, deposits, withdrawals)
- **Users**: View all users, edit tier/balance/admin status, verify emails
- **Investments**: View all active and historical investments
- **Withdrawals**: Approve or reject pending withdrawal requests
- **Crypto Payments**: Manually verify and approve crypto deposits
- **KYC**: Review submitted identity documents (approve/reject)
- **Platform Settings**: Toggle payment gateways, set crypto wallet addresses, configure limits

---

## 9. KYC (Identity Verification)

Users can upload identity documents from the Dashboard → Settings → KYC. Supported document types:
- Passport
- National ID
- Driver's License
- Utility Bill

Documents are stored as Base64 in the database. Admin reviews them in the Admin Dashboard → KYC.

> **Note**: For production, consider integrating a dedicated KYC provider and using object storage (S3/Cloudflare R2) instead of Base64 in the database for large files.

---

## 10. Database

### Recommended: Neon (serverless PostgreSQL)

[Neon](https://neon.tech) is the recommended PostgreSQL host for Netlify serverless functions. It supports connection pooling via their serverless driver.

1. Create a Neon account and project
2. Copy the **Connection string** (choose "Pooled connection" for serverless)
3. Set as `DATABASE_URL` in Netlify

### Migrations

The schema is automatically pushed via `pnpm --filter @workspace/db run push` (uses Drizzle Kit). After deploying, Netlify's Publish flow handles production schema changes.

---

## 11. Tawk.to Live Chat (Optional)

The app includes a tawk.to chat widget stub. To enable it:

1. Create a free account at [tawk.to](https://tawk.to)
2. Copy your Property ID from the integration snippet
3. In `artifacts/alphavest/src/App.tsx`, replace `'YOUR_TAWK_PROPERTY_ID'` with your actual Property ID

---

## 12. Full Environment Variables Checklist

```bash
# ── Required ──────────────────────────────────────────────
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-64-char-hex>
NODE_ENV=production

# ── Auth ──────────────────────────────────────────────────
ADMIN_EMAILS=admin@yourdomain.com,other@yourdomain.com
FRONTEND_URL=https://YOUR-SITE.netlify.app

# ── Google OAuth ──────────────────────────────────────────
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://YOUR-SITE.netlify.app/api/auth/google/callback

# ── Email (Resend) ────────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=AlphaVest <noreply@yourdomain.com>

# ── Payments: Monnify ─────────────────────────────────────
MONNIFY_API_KEY=...
MONNIFY_SECRET_KEY=...
MONNIFY_CONTRACT_CODE=...
MONNIFY_BASE_URL=https://api.monnify.com

# ── Payments: Flutterwave ─────────────────────────────────
FLW_SECRET_KEY=...
FLW_SECRET_HASH=...

# ── Payments: Paystack ────────────────────────────────────
PAYSTACK_SECRET_KEY=...

# ── Crypto Wallet Addresses ───────────────────────────────
CRYPTO_BTC_ADDRESS=bc1q...
CRYPTO_USDT_TRC20_ADDRESS=T...
CRYPTO_USDT_ERC20_ADDRESS=0x...
CRYPTO_ETH_ADDRESS=0x...
CRYPTO_SOL_ADDRESS=...

# ── WebAuthn Biometrics ───────────────────────────────────
APP_DOMAIN=YOUR-SITE.netlify.app
APP_ORIGIN=https://YOUR-SITE.netlify.app
```

---

## 13. Graceful Degradation

Most integrations are optional. The app degrades gracefully when keys are missing:

| Missing Key | Behavior |
|---|---|
| `RESEND_API_KEY` | Emails logged to console; users auto-verified |
| `GOOGLE_CLIENT_ID/SECRET` | `/api/auth/google/redirect` returns 503 |
| `MONNIFY_API_KEY` | Monnify payment option hidden/disabled |
| `FLW_SECRET_KEY` | Flutterwave payment option hidden/disabled |
| `PAYSTACK_SECRET_KEY` | Paystack payment option hidden/disabled |
| Crypto addresses | Crypto deposit option shows no address |

---

## 14. Development Setup

```bash
# 1. Clone and install
pnpm install

# 2. Set environment variables (copy and fill)
cp .env.example .env   # if provided, otherwise set manually

# 3. Push DB schema to dev database
pnpm --filter @workspace/db run push

# 4. Start the API server
pnpm --filter @workspace/api-server run dev

# 5. Start the frontend (separate terminal)
# The frontend workflow starts automatically in Replit
```

---

## 15. Security Notes

- Session cookies use `httpOnly: true`, `secure: true` (production), `sameSite: 'none'` (to work with Netlify cross-origin)
- Webhook signatures are verified for Monnify (HMAC-SHA512), Flutterwave (header match), and Paystack (HMAC-SHA512)
- Admin access is enforced server-side via `requireAdmin` middleware on every admin route
- KYC documents stored as Base64 in PostgreSQL — consider migrating to object storage for production at scale
