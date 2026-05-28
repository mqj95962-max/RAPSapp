import nodemailer from "nodemailer";

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) {
    throw new Error("Email is not configured (SMTP_USER, SMTP_PASS).");
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;
  const user = process.env.SMTP_USER?.trim();
  if (user) return `RAPS Photography Club <${user}>`;
  throw new Error("EMAIL_FROM or SMTP_USER is required.");
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (process.env.NOTIFICATIONS_DISABLED === "true") return;

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const recipients = [...new Set(to.map((e) => e.trim()).filter(Boolean))];
  if (!recipients.length) return;

  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  await getTransporter().sendMail({
    from: getFromAddress(),
    to: recipients,
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(replyTo ? { replyTo } : {}),
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailShell(title: string, bodyHtml: string): string {
  const appUrl = getAppBaseUrl();
  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#18181b;max-width:32rem;">
  <p style="font-size:0.75rem;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">RAPS Photography Club</p>
  <h1 style="font-size:1.125rem;margin:0 0 1rem;">${escapeHtml(title)}</h1>
  ${bodyHtml}
  <p style="margin-top:1.5rem;font-size:0.875rem;">
    <a href="${escapeHtml(appUrl)}">Open the club portal</a>
  </p>
</body>
</html>`;
}
