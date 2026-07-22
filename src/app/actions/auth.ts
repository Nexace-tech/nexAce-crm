"use server";

import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { createSession, deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export interface FormState {
  errors?: {
    companyName?: string[];
    companySlug?: string[];
    adminName?: string[];
    adminEmail?: string[];
    adminPassword?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string;
  success?: boolean;
}

/**
 * Server Action to register a new tenant (company) and its initial admin user.
 */
export async function registerAction(state: FormState | undefined, formData: FormData): Promise<FormState> {
  const companyName = formData.get("companyName") as string;
  const companySlug = formData.get("companySlug") as string;
  const adminName = formData.get("adminName") as string;
  const adminEmail = formData.get("adminEmail") as string;
  const adminPassword = formData.get("adminPassword") as string;

  // 1. Simple Server-Side Validation
  const errors: NonNullable<FormState["errors"]> = {};

  if (!companyName || companyName.trim().length < 2) {
    errors.companyName = ["Company name must be at least 2 characters long."];
  }

  if (!companySlug || !/^[a-z0-9-]+$/.test(companySlug)) {
    errors.companySlug = ["Slug must contain only lowercase letters, numbers, and hyphens."];
  }

  if (!adminName || adminName.trim().length < 2) {
    errors.adminName = ["Name must be at least 2 characters long."];
  }

  if (!adminEmail || !adminEmail.includes("@")) {
    errors.adminEmail = ["Please enter a valid email address."];
  }

  if (!adminPassword || adminPassword.length < 6) {
    errors.adminPassword = ["Password must be at least 6 characters long."];
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  try {
    await connectToDatabase();

    // 2. Check for existing Tenant slug
    const existingTenant = await Tenant.findOne({ slug: companySlug.toLowerCase() });
    if (existingTenant) {
      return {
        errors: { companySlug: ["This company slug is already taken."] }
      };
    }

    // 3. Check for existing User email
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return {
        errors: { adminEmail: ["This email is already registered."] }
      };
    }

    // 4. Create Tenant
    const tenant = await Tenant.create({
      name: companyName,
      slug: companySlug.toLowerCase()
    });

    // 5. Hash Password & Create User
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const user = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: "Admin",
      tenantId: tenant._id
    });

    // 6. Create session
    await createSession(
      String(user._id),
      String(tenant._id),
      user.name,
      tenant.name,
      user.role
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return {
      message: "An error occurred during registration. Please try again."
    };
  }

  // 7. Redirect to dashboard
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
    return { errors };
  }

  try {
    await connectToDatabase();

    // Find User and populate Tenant information
    const user = await User.findOne({ email: email.toLowerCase() }).populate("tenantId");
    if (!user) {
      return {
        message: "Invalid email or password."
      };
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return {
        message: "Invalid email or password."
      };
    }

    // Get tenant details
    const tenant = user.tenantId as any; // Cast populated tenantId
    if (!tenant) {
      return {
        message: "Company tenant associated with this account was not found."
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
    console.error("Login error:", error);
    return {
      message: "An error occurred during login. Please try again."
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
