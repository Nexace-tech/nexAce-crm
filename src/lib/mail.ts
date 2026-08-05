import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: SendMailOptions) {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM || (user ? `NexAce CRM <${user}>` : "NexAce CRM <noreply@nexace.com>");
  const isProduction = process.env.NODE_ENV === "production";

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
          // Only bypass certificate verification in development; enforce in production
          rejectUnauthorized: process.env.NODE_ENV === "production",
        },
      });

      await transporter.sendMail({
        from,
        to: to.toLowerCase(),
        subject,
        text,
        html,
      });
      console.log(`[SMTP] Live email sent successfully to ${to}`);
      return { success: true, isDev: false };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[SMTP Error] Failed to send email via SMTP:", errMsg);
      if (isProduction) {
        throw new Error(`SMTP Email Error: ${errMsg}`);
      }
      console.log("[SMTP Fallback] Falling back to simulated dev mail due to SMTP error...");
    }
  }

  // Developer Ethereal Email fallback
  console.log("[SMTP] Using Ethereal simulated dev email transport...");
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
      to: to.toLowerCase(),
      subject: `[DEV] ${subject}`,
      text,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || "";
    console.log(`[SMTP Dev Mail] Sent to ${to}. Preview: ${previewUrl}`);
    return { success: true, isDev: true, previewUrl };
  } catch (err: unknown) {
    console.error("[SMTP Dev Error]", err);
    return { success: true, isDev: true };
  }
}
