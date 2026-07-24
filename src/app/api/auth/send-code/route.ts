import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/db";
import { EmailVerification } from "@/models/EmailVerification";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    await connectToDatabase();

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save/update code in DB
    await EmailVerification.findOneAndUpdate(
      { email: email.toLowerCase() },
      { code, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // Retrieve SMTP configs
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user || "NexAce CRM <noreply@nexace.com>";

    let previewUrl = "";
    let transporter;
    const isProduction = process.env.NODE_ENV === "production";

    if (host && user && pass) {
      // 1. Production SMTP Configuration
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from,
        to: email.toLowerCase(),
        subject: "[NexAce CRM] Verify Your Email Address",
        text: `Your verification code is: ${code}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 2rem; background-color: #121212; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #222;">
            <h2 style="color: #6366f1; margin-bottom: 1.5rem; text-align: center;">✦ NexAce CRM</h2>
            <p>Hello,</p>
            <p>Please use the following verification code to authorize email registration or changes on your NexAce CRM account:</p>
            <div style="background-color: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; padding: 1.5rem; border-radius: 8px; text-align: center; margin: 1.5rem 0;">
              <span style="font-size: 2.2rem; font-weight: 800; letter-spacing: 6px; color: #818cf8;">${code}</span>
            </div>
            <p style="font-size: 0.85rem; color: #aaaaaa; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`[SMTP] Verification email sent successfully to ${email}.`);
    } else {
      if (isProduction) {
        console.error("[SMTP] Error: SMTP credentials are not configured in production environment variables.");
        return NextResponse.json({ error: "Email verification service is currently misconfigured. Please contact support." }, { status: 500 });
      }

      // 2. Fallback to programmatically created Ethereal Email account (developer mock) in non-production only
      console.log("[SMTP] SMTP credentials not fully configured. Creating a simulated test account...");
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
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
        to: email.toLowerCase(),
        subject: "[DEV ONLY] Verify Your Email Address",
        text: `Your verification code is: ${code}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 2rem; background-color: #121212; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #222;">
            <h2 style="color: #6366f1; margin-bottom: 1.5rem; text-align: center;">✦ NexAce CRM (Dev Environment)</h2>
            <p>Hello,</p>
            <p>Please use the following verification code to authorize email registration or changes on your NexAce CRM account:</p>
            <div style="background-color: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; padding: 1.5rem; border-radius: 8px; text-align: center; margin: 1.5rem 0;">
              <span style="font-size: 2.2rem; font-weight: 800; letter-spacing: 6px; color: #818cf8;">${code}</span>
            </div>
            <p style="font-size: 0.85rem; color: #aaaaaa; text-align: center;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      previewUrl = nodemailer.getTestMessageUrl(info) || "";
      console.log(`[SMTP] Developer Ethereal Email Sent! Code: ${code}`);
      console.log(`[SMTP] Preview URL: ${previewUrl}`);
    }

    return NextResponse.json({ 
      success: true, 
      previewUrl: isProduction ? undefined : previewUrl, 
      devCode: isProduction ? undefined : (previewUrl ? code : undefined) 
    });
  } catch (error: any) {
    console.error("Failed to send verification code:", error);
    return NextResponse.json({ error: error.message || "Failed to send verification code." }, { status: 500 });
  }
}
