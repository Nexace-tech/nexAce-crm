import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { EmailVerification } from "@/models/EmailVerification";
import mongoose from "mongoose";
import { sendEmail } from "@/lib/mail";
import { validatePasswordPattern } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Fetch single employee details.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    const user = await User.findById(id)
      .select("-passwordHash")
      .populate("managerId", "name email role photoUrl");

    if (!user || user.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("API GET Single Team error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * PUT: Update employee details.
 * - Self can update: bio, phone, photoUrl, skills.
 * - Admin can update: all fields.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user || user.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const isSelf = user._id.toString() === session.userId;
    const isAdmin = session.role === "Admin";

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    // Determine allowed updates
    // Both Self and Admin can update name and email (with duplicate checking and email code verification)
    if (body.email && body.email.toLowerCase() !== user.email) {
      // 1. Verify code
      if (!body.code) {
        return NextResponse.json({ error: "Verification code is required to update email address." }, { status: 400 });
      }
      const verification = await EmailVerification.findOne({ email: body.email.toLowerCase() });
      if (!verification || verification.code !== body.code) {
        return NextResponse.json({ error: "Incorrect or expired email verification code. Please request a new code." }, { status: 400 });
      }

      // 2. Duplicate checking
      const existingUser = await User.findOne({ email: body.email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ error: "Email address is already in use by another user." }, { status: 400 });
      }

      // 3. Clear code and update email
      await EmailVerification.deleteOne({ _id: verification._id });
      user.email = body.email.toLowerCase();
    }
    if (body.name) {
      user.name = body.name;
    }

    // Both Self and Admin can change password (Self requires currentPassword and email verification code)
    if (body.newPassword) {
      const pwdValidation = validatePasswordPattern(body.newPassword);
      if (!pwdValidation.isValid) {
        return NextResponse.json({ error: pwdValidation.error }, { status: 400 });
      }

      if (isSelf) {
        if (!body.currentPassword) {
          return NextResponse.json({ error: "Current password is required to change password" }, { status: 400 });
        }
        const bcrypt = await import("bcryptjs");
        const isMatch = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!isMatch) {
          return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }
        
        // Enforce email verification code for password change
        if (!body.code) {
          return NextResponse.json({ error: "An email verification code is required to change your password." }, { status: 400 });
        }
        const verification = await EmailVerification.findOne({ email: user.email });
        if (!verification || verification.code !== body.code) {
          return NextResponse.json({ error: "Incorrect or expired email verification code. Please request a new code." }, { status: 400 });
        }
        await EmailVerification.deleteOne({ _id: verification._id });
      }
      const bcrypt = await import("bcryptjs");
      user.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    // Admin-specific updates
    if (isAdmin) {
      if (body.role && ["Admin", "Manager", "HR", "Employee"].includes(body.role)) {
        user.role = body.role;
      }
      if (body.departments && Array.isArray(body.departments)) {
        user.departments = body.departments;
        user.department = body.departments[0] || "General";
      } else if (body.department) {
        user.department = body.department;
        user.departments = [body.department];
      }
      if (body.managerId !== undefined) {
        user.managerId = body.managerId ? new mongoose.Types.ObjectId(body.managerId) : undefined;
      }

      if (body.status && ["Active", "Pending", "On Leave", "Suspended"].includes(body.status)) {
        const wasPending = user.status === "Pending";
        user.status = body.status;

        // If employee was pending and is now approved (Active), send approval confirmation email
        if (wasPending && body.status === "Active" && user.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          try {
            await sendEmail({
              to: user.email,
              subject: "🎉 Account Approved! Welcome to your Workspace",
              text: `Hello ${user.name}, your employee account has been approved by your workspace administrator! You can now sign in at ${appUrl}/login`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #10b981; margin-top: 0;">Account Approved & Activated!</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                    Hello <strong>${user.name}</strong> (@${user.username || "employee"}),
                  </p>
                  <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                    Great news! Your workspace administrator has reviewed and approved your employee registration.
                  </p>
                  <div style="margin-top: 24px;">
                    <a href="${appUrl}/login" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Sign In to Employee Portal</a>
                  </div>
                </div>
              `
            });
          } catch (mailErr) {
            console.error("Failed to send account approval confirmation email:", mailErr);
          }
        }
      }
      if (body.shiftTime !== undefined) user.shiftTime = body.shiftTime;
      if (body.shiftName !== undefined) user.shiftName = body.shiftName;
    }

    // Personal profile meta updates (Allowed for Self and Admin)
    if (isSelf || isAdmin) {
      if (body.bio !== undefined) user.bio = body.bio;
      if (body.phone !== undefined) user.phone = body.phone;
      if (body.photoUrl !== undefined) user.photoUrl = body.photoUrl;
      if (body.skills !== undefined) user.skills = body.skills;
    }

    await user.save();

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("API PUT Single Team error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove employee (Restricted to Admin).
 * Re-routes their direct reports to their own manager.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user || user.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Re-route reporting line: all direct reports now report to this user's manager (or CEO)
    const newManagerId = user.managerId;
    await User.updateMany(
      { managerId: user._id },
      { managerId: newManagerId }
    );

    // Remove user
    await user.deleteOne();

    return NextResponse.json({ success: true, message: "Employee removed successfully" });
  } catch (error: any) {
    console.error("API DELETE Single Team error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
