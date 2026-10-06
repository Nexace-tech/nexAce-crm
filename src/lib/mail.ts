import nodemailer from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigKey = "";

function getLiveTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");

  if (!host || !user || !pass) {
    return null;
  }

  const configKey = `${host}:${port}:${user}:${pass}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
  cachedConfigKey = configKey;
  return cachedTransporter;
}

export async function sendEmail({ to, subject, text, html, attachments }: SendMailOptions) {
  const user = process.env.SMTP_USER?.trim();
  const rawFrom = process.env.SMTP_FROM?.trim()?.replace(/^["']|["']$/g, "");
  const from = rawFrom || (user ? `NexAce CRM <${user}>` : "NexAce CRM <noreply@nexace.com>");
  const isProduction = process.env.NODE_ENV === "production";

  const liveTransporter = getLiveTransporter();

  // 1. Live SMTP Mode
  if (liveTransporter) {
    try {
      await liveTransporter.sendMail({
        from,
        to: to.toLowerCase().trim(),
        subject,
        text,
        html,
        attachments,
      });
      console.log(`[SMTP] Live email sent successfully to ${to}`);
      return { success: true, isDev: false };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[SMTP Error] Failed to send email via live SMTP:", errMsg);
      // In live SMTP mode, throw an error so the caller and user are informed rather than masking delivery failure
      throw new Error(`SMTP Email Delivery Failed: ${errMsg}`);
    }
  }

  // 2. Production Guard: Never fall back to mock/dev mail in production
  if (isProduction) {
    throw new Error(
      "Live SMTP server is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your environment."
    );
  }

  // 3. Developer Ethereal Email sandbox (ONLY in local development when no SMTP credentials are provided)
  console.warn("[SMTP Dev Sandbox] No live SMTP configured in .env.local. Falling back to Ethereal sandbox...");
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"NexAce CRM Dev" <noreply@nexace.com>',
      to: to.toLowerCase().trim(),
      subject: `[DEV] ${subject}`,
      text,
      html,
      attachments,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || "";
    console.log(`[SMTP Dev Mail] Sent to ${to}. Preview: ${previewUrl}`);
    return { success: true, isDev: true, previewUrl };
  } catch (err: unknown) {
    console.error("[SMTP Dev Error]", err);
    return { success: true, isDev: true };
  }
}
