"use server";

import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { EmailVerification } from "@/models/EmailVerification";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/mail";
import { Notification } from "@/models/Notification";
import { validatePasswordPattern } from "@/lib/utils";
import { rateLimitOtp, rateLimitVerify, rateLimitLogin, getClientIp } from "@/lib/rateLimiter";

export interface FormState {
  errors?: {
    companyName?: string[];
    companySlug?: string[];
    adminName?: string[];
    username?: string[];
    adminEmail?: string[];
    adminPassword?: string[];
    email?: string[];
    password?: string[];
    code?: string[];
    newPassword?: string[];
  };
  message?: string;
  success?: boolean;
  step?: "request" | "reset" | "completed";
  resetEmail?: string;
  enteredEmail?: string;
  enteredPassword?: string;
  enteredCode?: string;
  devCode?: string;
  previewUrl?: string;
}

/**
 * Helper to translate internal connection/configuration errors into descriptive user-facing tips.
 */
function getDescriptiveErrorMessage(error: unknown, defaultMessage: string): string {
  const err = error as { message?: string; name?: string };
  const errMsg = err?.message || "";
  const errName = err?.name || "";

  if (errMsg.includes("MONGODB_URI") || errMsg.includes("environment variable")) {
    return "Database connection failed: The MONGODB_URI environment variable is not defined in your Vercel project settings. Please add it to your project configuration.";
  }

  if (
    errMsg.includes("timeout") ||
    errMsg.includes("ETIMEDOUT") ||
    errMsg.includes("connection limit") ||
    errMsg.includes("IP") ||
    errName === "MongooseServerSelectionError"
  ) {
    return "Database connection timed out. Please ensure that your MongoDB Atlas Network Access is configured to allow connections from all IP addresses (whitelist 0.0.0.0/0) so Vercel can connect.";
  }

  if (errMsg.includes("key size") || errMsg.includes("secret") || errMsg.includes("HS256")) {
    return "Session configuration error: The SESSION_SECRET environment variable must be a secure key of at least 32 characters/bytes.";
  }

  return `${defaultMessage} (Details: ${errMsg || error})`;
}

/**
 * Server Action to register a new tenant (company) and its initial admin user.
 */
export async function registerAction(state: FormState | undefined, formData: FormData): Promise<FormState> {
  const companyName = formData.get("companyName") as string;
  const companySlug = formData.get("companySlug") as string;
  const adminName = formData.get("adminName") as string;
  const usernameRaw = (formData.get("username") as string)?.trim()?.toLowerCase()?.replace(/^@/, "");
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;
  const code = formData.get("code") as string;

  // 1. Simple Server-Side Validation
  const errors: NonNullable<FormState["errors"]> = {};

  if (!adminName || adminName.trim().length < 2) {
    errors.adminName = ["Name must be at least 2 characters long."];
  }

  if (!usernameRaw || !/^[a-z0-9_.]+$/.test(usernameRaw) || usernameRaw.length < 3) {
    errors.username = ["Username must be at least 3 characters (lowercase letters, numbers, underscores, dots)."];
  }

  if (!adminEmail || !adminEmail.includes("@")) {
    errors.adminEmail = ["Please enter a valid email address."];
  }

  const pwdValidation = validatePasswordPattern(adminPassword);
  if (!pwdValidation.isValid) {
    errors.adminPassword = [pwdValidation.error!];
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  let isPendingUser = false;

  try {
    await connectToDatabase();

    // Verification Code Check — also manually verify expiry to guard against MongoDB TTL cleanup lag
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const verification = await EmailVerification.findOne({ email: adminEmail.toLowerCase() });
    if (
      !verification ||
      verification.code !== code ||
      Date.now() - new Date(verification.createdAt).getTime() > TEN_MINUTES_MS
    ) {
      return {
        message: "Incorrect or expired email verification code. Please request a new code."
      };
    }

    // 2. Check for existing User email within this tenant & redirect to login if user already exists
    const existingTenant = companySlug
      ? await Tenant.findOne({ slug: companySlug.toLowerCase() })
      : await Tenant.findOne();
    const existingUser = existingTenant
      ? await User.findOne({ email: adminEmail.toLowerCase(), tenantId: existingTenant._id })
      : null;
    if (existingUser) {
      redirect(`/login?email=${encodeURIComponent(adminEmail.toLowerCase())}&redirected=true`);
    }

    // Check for existing Username
    const existingUsername = await User.findOne({ username: usernameRaw });
    if (existingUsername) {
      return {
        errors: { username: ["This username is already taken. Please choose another."] }
      };
    }

    // Clear verification code after all pre-checks pass (before User.create)
    // Note: deletion happens here so a failed User.create doesn't permanently invalidate the OTP
    // We keep the record until the user is created successfully below.

    // 3. Find or Create Default Tenant
    let tenant;
    if (companySlug) {
      tenant = await Tenant.findOne({ slug: companySlug.toLowerCase() });
    }
    if (!tenant) {
      tenant = await Tenant.findOne();
    }
    if (!tenant) {
      tenant = await Tenant.create({
        name: companyName || "NexAce CRM",
        slug: companySlug?.toLowerCase() || "nexace"
      });
    }

    // 5. Hash Password & Create User
    const existingUserCount = await User.countDocuments({ tenantId: tenant._id });
    const assignedRole = existingUserCount === 0 ? "Admin" : "Employee";
    const assignedStatus = assignedRole === "Admin" ? "Active" : "Pending";

    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const newUser = await User.create({
      name: adminName.trim(),
      username: usernameRaw,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: assignedRole,
      status: assignedStatus,
      tenantId: tenant._id,
    });

    // Delete verification record only after User.create succeeds
    await EmailVerification.deleteOne({ _id: verification._id });

    // Notify only Admin users about new registration (only Admins can approve accounts)
    const tenantAdmins = await User.find({ tenantId: tenant._id, role: "Admin", status: "Active" });
    const notifyRecipients = [...tenantAdmins];

    if (notifyRecipients.length > 0) {
      const notifDocs = notifyRecipients.map((a) => ({
        tenantId: tenant._id,
        recipientId: a._id,
        title: "New Employee Account Pending Approval",
        message: `${adminName} (@${usernameRaw}) registered an account and is awaiting approval.`,
        type: "system",
        linkUrl: "/dashboard/team",
        read: false,
        adminOnly: true,
      }));
      await Notification.insertMany(notifDocs);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      for (const recipient of notifyRecipients) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: `[NexAce CRM] New Employee Approval Request: ${adminName}`,
            text: `New account awaiting approval: ${adminName} (@${usernameRaw}, ${adminEmail}). Please review and approve in your dashboard.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                <h2 style="color: #1e293b; margin-top: 0;">New Account Awaiting Approval</h2>
                <p style="color: #475569; font-size: 14px;">
                  A new employee has registered for your workspace <strong>${tenant.name}</strong> and is currently pending approval:
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Name:</strong> ${adminName}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Username:</strong> @${usernameRaw}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Email:</strong> ${adminEmail}</p>
                  <p style="margin: 4px 0; font-size: 14px; color: #d97706;"><strong>Status:</strong> Pending Approval</p>
                </div>
                <p style="color: #475569; font-size: 14px;">Please sign in to your dashboard to approve or manage this account.</p>
                <div style="margin-top: 24px;">
                  <a href="${appUrl}/dashboard/team" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Review &amp; Approve Employee</a>
                </div>
              </div>
            `
          });
        } catch (mailErr) {
          console.error("Failed to send approval email:", mailErr);
        }
      }
    }

    // 6. Only create session for Active users (Admins). Pending users must wait for approval.
    if (assignedStatus === "Active") {
      await createSession(
        String(newUser._id),
        String(tenant._id),
        newUser.name,
        tenant.name,
        newUser.role
      );
    } else {
      isPendingUser = true;
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Registration error:", error);
    return {
      message: getDescriptiveErrorMessage(error, "An error occurred during registration. Please try again.")
    };
  }

  // Active users (first Admin) go to the dashboard; Pending users go to login with a notice
  if (isPendingUser) {
    redirect("/login?pending=true");
  }
  redirect("/dashboard");
}

/**
 * Server Action to log in an existing user.
 */
export async function loginAction(state: FormState | undefined, formData: FormData): Promise<FormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const errors: NonNullable<FormState["errors"]> = {};

  if (!email || !email.includes("@")) {
    errors.email = ["Please enter a valid email address."];
  }

  if (!password || password.length === 0) {
    errors.password = ["Password is required."];
  }

  if (Object.keys(errors).length > 0) {
    return { errors, enteredEmail: email, enteredPassword: password };
  }

  try {
    // 1. Rate Limiting check to prevent brute-force attacks
    const ip = await getClientIp();
    const limit = rateLimitLogin(email, ip);
    if (!limit.allowed) {
      const waitSeconds = Math.ceil(limit.retryAfterMs / 1000);
      return {
        message: `Too many login attempts. Please wait ${waitSeconds}s before trying again.`,
        enteredEmail: email,
        enteredPassword: password
      };
    }

    await connectToDatabase();

    // Find User and populate Tenant information
    const user = await User.findOne({ email: email.toLowerCase() }).populate("tenantId");
    
    // Constant-time timing attack mitigation: if user does not exist, run a dummy bcrypt compare
    const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const passwordMatch = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

    if (!user || !passwordMatch) {
      return {
        message: "Invalid email or password.",
        enteredEmail: email,
        enteredPassword: password
      };
    }

    // Check account status — Suspended and Pending both cannot log in
    if (user.status === "Suspended") {
      return {
        message: "Your employee account has been suspended. Please contact your workspace administrator.",
        enteredEmail: email,
        enteredPassword: password
      };
    }

    if (user.status === "Pending") {
      return {
        message: "Your account is pending approval. Please wait for your workspace administrator to activate your account.",
        enteredEmail: email,
        enteredPassword: password
      };
    }

    // Get tenant details
    const tenant = user.tenantId as any; // Cast populated tenantId
    if (!tenant) {
      return {
        message: "Company tenant associated with this account was not found.",
        enteredEmail: email,
        enteredPassword: password
      };
    }

    // Create session
    await createSession(
      String(user._id),
      String(tenant._id),
      user.name,
      tenant.name,
      user.role
    );
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Login error:", error);
    return {
      message: getDescriptiveErrorMessage(error, "An error occurred during login. Please check your network connection and database settings."),
      enteredEmail: email,
      enteredPassword: password
    };
  }

  // Redirect to dashboard
  redirect("/dashboard");
}

/**
 * Server Action to log out the user.
 */
export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

/**
 * Server Action to handle forgot password requests — generates 6-digit code and dispatches email via SMTP.
 */
export async function forgotPasswordAction(state: FormState | undefined, formData: FormData): Promise<FormState> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();

  const errors: NonNullable<FormState["errors"]> = {};

    if (!email || !email.includes("@")) {
      errors.email = ["Please enter a valid email address."];
      return { errors };
    }

    // Rate limit password-reset OTP requests per email and per IP
    const rate = rateLimitOtp(email, await getClientIp());
    if (!rate.allowed) {
      return {
        message: `Too many password reset attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)} seconds.`,
      };
    }

    try {
    await connectToDatabase();

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Security measure: do not disclose user non-existence
      return {
        success: true,
        step: "reset",
        resetEmail: email,
        message: `If an account exists for ${email}, a 6-digit verification code has been sent.`,
      };
    }

    // Generate cryptographically secure 6-digit verification code
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const code = String(100000 + (arr[0] % 900000));

    // Save or update code in EmailVerification collection (expires in 10 mins)
    await EmailVerification.findOneAndUpdate(
      { email },
      { code, createdAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/forgot-password`;

    // Send reset email via Nodemailer
    const mailResult = await sendEmail({
      to: email,
      subject: "[NexAce CRM] Reset Your Password",
      text: `Reset your password: ${resetLink} (Verification Code: ${code})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 2.5rem 1.5rem; background-color: #f8fafc; color: #1e293b;">
          <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 2.5rem; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 2rem;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.025em;">✦ NexAce CRM</h2>
              <p style="color: #64748b; font-size: 0.875rem; margin-top: 0.25rem; font-weight: 500;">Account Security & Password Recovery</p>
            </div>

            <p style="font-size: 0.95rem; color: #0f172a; line-height: 1.6; margin-bottom: 0.75rem;">Hello <strong>${user.name}</strong>,</p>
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin-bottom: 1.75rem;">We received a request to reset the password for your NexAce CRM account. Click the button below to reset your password directly:</p>

            <div style="text-align: center; margin: 2rem 0;">
              <a href="${resetLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 0.9rem 2.25rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px 0 rgba(79, 70, 229, 0.35);">
                Reset Password Now →
              </a>
            </div>

            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 1.25rem; border-radius: 12px; text-align: center; margin: 1.75rem 0;">
              <p style="font-size: 0.75rem; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;">Or Enter This 6-Digit Code Manually:</p>
              <span style="font-size: 2.2rem; font-weight: 800; letter-spacing: 6px; color: #4338ca; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${code}</span>
            </div>

            <p style="font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 2rem; line-height: 1.5;">
              This link and code will expire in 10 minutes.<br/>
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    return {
      success: true,
      step: "reset",
      resetEmail: email,
      devCode: mailResult.isDev ? code : undefined,
      previewUrl: mailResult.isDev ? mailResult.previewUrl : undefined,
      message: `A 6-digit verification code has been sent to ${email}.`,
    };
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    return {
      message: getDescriptiveErrorMessage(error, "An error occurred during password reset. Please try again.")
    };
  }
}

/**
 * Server Action to handle resetting user password with verification code.
 */
export async function resetPasswordAction(state: FormState | undefined, formData: FormData): Promise<FormState> {
  const email = (formData.get("email") as string)?.trim()?.toLowerCase();
  const code = (formData.get("code") as string)?.trim();
  const newPassword = formData.get("newPassword") as string;

  const errors: NonNullable<FormState["errors"]> = {};

  if (!email || !email.includes("@")) {
    errors.email = ["Please enter a valid email address."];
  }

  if (!code || code.length !== 6) {
    errors.code = ["Verification code must be 6 digits."];
  }

  const pwdValidation = validatePasswordPattern(newPassword);
  if (!pwdValidation.isValid) {
    errors.newPassword = [pwdValidation.error!];
  }

  if (Object.keys(errors).length > 0) {
    return { errors, step: "reset", resetEmail: email, enteredCode: code };
  }

  // Rate limit verification attempts to prevent brute-forcing the 6-digit OTP
  const rate = rateLimitVerify(email, await getClientIp());
  if (!rate.allowed) {
    return {
      step: "reset",
      resetEmail: email,
      enteredCode: code,
      message: `Too many code attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)} seconds.`,
    };
  }

  try {
    await connectToDatabase();

    // Verify code in DB — also manually check expiry to guard against MongoDB TTL cleanup lag
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const verification = await EmailVerification.findOne({ email });
    if (
      !verification ||
      verification.code !== code ||
      Date.now() - new Date(verification.createdAt).getTime() > TEN_MINUTES_MS
    ) {
      return {
        step: "reset",
        resetEmail: email,
        enteredCode: code,
        message: "Incorrect or expired verification code. Please check your email or request a new code.",
      };
    }

    // Find User
    const user = await User.findOne({ email });
    if (!user) {
      return {
        step: "reset",
        resetEmail: email,
        enteredCode: code,
        message: "User account not found.",
      };
    }

    // Hash new password & update User record
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.forcePasswordReset = false;
    await user.save();

    // Delete verification record
    await EmailVerification.deleteOne({ _id: verification._id });

    return {
      success: true,
      step: "completed",
      message: "Password reset successfully! You can now sign in with your new password.",
    };
  } catch (error: any) {
    console.error("Reset password error:", error);
    return {
      step: "reset",
      resetEmail: email,
      enteredCode: code,
      message: getDescriptiveErrorMessage(error, "An error occurred while resetting password. Please try again.")
    };
  }
}
