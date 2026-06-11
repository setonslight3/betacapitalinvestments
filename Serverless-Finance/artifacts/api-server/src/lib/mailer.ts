import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "AlphaVest <noreply@alphavest.com>";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured — email logged to console");
    logger.info({ to, subject, preview: html.replace(/<[^>]*>/g, "").slice(0, 200) }, "Email (not sent)");
    return;
  }

  const body = JSON.stringify({ from: FROM, to, subject, html });

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!resp.ok) {
    const err = await resp.text();
    logger.error({ to, subject, status: resp.status, err }, "Resend email failed");
    throw new Error(`Resend error ${resp.status}: ${err}`);
  }

  logger.info({ to, subject }, "Email sent via Resend");
}

export function otpEmailHtml(code: string, type: "verify" | "reset", name: string): string {
  const title = type === "verify" ? "Verify Your Email" : "Reset Your Password";
  const body =
    type === "verify"
      ? "You're almost set. Enter this code to verify your AlphaVest account."
      : "We received a request to reset your password. Use the code below.";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#0d1419;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#131d26;border:1px solid #1e2d3d;border-radius:8px;overflow:hidden;">
        <tr><td style="height:3px;background:#f2ca50;"></td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#e8dcc8;letter-spacing:2px;text-transform:uppercase;">AlphaVest</p>
          <h1 style="margin:0 0 16px;font-size:28px;color:#e8dcc8;">${title}</h1>
          <p style="color:#8a9ab5;font-family:sans-serif;font-size:14px;line-height:1.6;">Hi ${name},</p>
          <p style="color:#8a9ab5;font-family:sans-serif;font-size:14px;line-height:1.6;">${body}</p>
          <div style="margin:32px 0;text-align:center;">
            <div style="display:inline-block;background:#0d1419;border:1px solid #f2ca50;border-radius:8px;padding:20px 48px;">
              <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#f2ca50;font-family:monospace;">${code}</span>
            </div>
          </div>
          <p style="color:#8a9ab5;font-family:sans-serif;font-size:12px;">This code expires in <strong style="color:#e8dcc8;">10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color:#4a5a6b;font-family:sans-serif;font-size:11px;margin-top:24px;">If you did not request this, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 40px;border-top:1px solid #1e2d3d;">
          <p style="margin:0;color:#4a5a6b;font-family:sans-serif;font-size:11px;">&copy; ${new Date().getFullYear()} AlphaVest. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function withdrawalEmailHtml(name: string, amount: string, method: string, status: string, note?: string): string {
  const isApproved = status === "approved";
  const color = isApproved ? "#22c55e" : "#ef4444";
  const statusLabel = isApproved ? "Approved" : "Rejected";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0d1419;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#131d26;border:1px solid #1e2d3d;border-radius:8px;overflow:hidden;">
        <tr><td style="height:3px;background:${color};"></td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#e8dcc8;letter-spacing:2px;text-transform:uppercase;">AlphaVest</p>
          <h1 style="margin:0 0 16px;font-size:24px;color:#e8dcc8;">Withdrawal ${statusLabel}</h1>
          <p style="color:#8a9ab5;font-family:sans-serif;font-size:14px;">Hi ${name},</p>
          <p style="color:#8a9ab5;font-family:sans-serif;font-size:14px;">Your withdrawal request of <strong style="color:#e8dcc8;">${amount}</strong> via <strong style="color:#e8dcc8;">${method}</strong> has been <strong style="color:${color};">${statusLabel.toLowerCase()}</strong>.</p>
          ${note ? `<p style="color:#8a9ab5;font-family:sans-serif;font-size:13px;background:#0d1419;padding:12px;border-radius:4px;">Note: ${note}</p>` : ""}
          <p style="color:#4a5a6b;font-family:sans-serif;font-size:11px;margin-top:24px;">Contact support@alphavest.com for questions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
