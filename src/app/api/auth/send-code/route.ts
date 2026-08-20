import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { connectToDatabase } from "@/lib/db";
import { EmailVerification } from "@/models/EmailVerification";
import { rateLimitOtp, getClientIp } from "@/lib/rateLimiter";
import { getSession } from "@/lib/session";

import dns from "dns";

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json();
    const cleanEmail = email?.trim()?.toLowerCase();

    // 1. Strict RFC 5322 Email Format Regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid, complete email address (e.g. user@company.com)." },
        { status: 400 }
      );
    }

    // 0b. Rate limit OTP requests per email and per IP to prevent brute-force / enumeration
    const rate = rateLimitOtp(cleanEmail, await getClientIp());
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Too many verification attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
      );
    }

    // 2. Disposable / Temporary Email Provider Blocking
    const domain = cleanEmail.split("@")[1];
    const disposableDomains = [
      "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
      "yopmail.com", "sharklasers.com", "dispostable.com", "trashmail.com",
      "getnada.com", "temp-mail.org", "throwawaymail.com", "fakeinbox.com",
      "maildrop.cc", "temp-mail.ru", "mohmal.com", "emailondeck.com"
    ];
    if (disposableDomains.includes(domain)) {
      return NextResponse.json(
        { error: "Disposable and temporary email addresses are not allowed. Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 3. DNS MX Record Validation (Verifies domain has active mail servers)
    // Only block if MX records explicitly return 0 records; skip if DNS is unreachable (network hiccup)
    try {
      const mxRecords = await dns.promises.resolveMx(domain);
      if (mxRecords && mxRecords.length === 0) {
        return NextResponse.json(
          { error: `The email domain '@${domain}' has no valid mail servers. Please check for spelling mistakes.` },
          { status: 400 }
        );
      }
    } catch {
      // DNS resolution failed (network error / timeout) — continue and attempt to send anyway
      console.warn(`[DNS] MX lookup failed for domain '${domain}' — proceeding with OTP send.`);
    }

    await connectToDatabase();

    // Import User model & verify if user already exists
    const { User } = await import("@/models/User");
    const existingUser = await User.findOne({ email: cleanEmail });
    
    const AUTHENTICATED_TYPES = ["change-email", "profile-update"];
    if (AUTHENTICATED_TYPES.includes(type)) {
      // These types send OTPs for existing accounts — require an active session
      const session = await getSession();
      if (!session) {
        return NextResponse.json(
          { error: "Authentication required for this operation." },
          { status: 401 }
        );
      }
    }

    if (!AUTHENTICATED_TYPES.includes(type) && existingUser) {
      return NextResponse.json(
        { error: "An account with this email address is already registered. Please sign in or reset your password." },
        { status: 400 }
      );
    }

    // Generate cryptographically secure 6-digit code with rejection sampling to eliminate modulo bias
    let randomVal = 0;
    const limit = Math.floor(0x100000000 / 900000) * 900000;
    const randArr = new Uint32Array(1);
    do {
      crypto.getRandomValues(randArr);
      randomVal = randArr[0];
    } while (randomVal >= limit);
    const code = String(100000 + (randomVal % 900000));

    // Save/update code in DB
    await EmailVerification.findOneAndUpdate(
      { email: cleanEmail },
      { code, createdAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    // Import unified email sender
    const { sendEmail } = await import("@/lib/mail");
    const mailResult = await sendEmail({
      to: cleanEmail,
      subject: "[NexAce CRM] Verify Your Email Address",
      text: `Your verification code is: ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 2.5rem 1.5rem; background-color: #f8fafc; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2.5rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 2rem;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.025em;">✦ NexAce CRM</h2>
              <p style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; font-weight: 500;">Email Verification</p>
            </div>
            <p style="font-size: 0.95rem; color: #0f172a; line-height: 1.6; margin-bottom: 0.75rem;">Hello,</p>
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin-bottom: 1.75rem;">Please use the following 6-digit verification code to authorize email verification on your NexAce CRM account:</p>
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 1.25rem; border-radius: 12px; text-align: center; margin: 1.75rem 0;">
              <span style="font-size: 2.2rem; font-weight: 800; letter-spacing: 6px; color: #4338ca; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${code}</span>
            </div>
            <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 2rem; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      devCode: mailResult.isDev ? code : undefined,
      previewUrl: mailResult.isDev ? mailResult.previewUrl : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send verification code.";
    console.error("Failed to send verification code:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
