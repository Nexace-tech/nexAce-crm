import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { EmailVerification } from "@/models/EmailVerification";
import mongoose from "mongoose";

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

    // Both Self and Admin can change password (Self requires currentPassword)
    if (body.newPassword) {
      if (isSelf) {
        if (!body.currentPassword) {
          return NextResponse.json({ error: "Current password is required to change password" }, { status: 400 });
        }
        const bcrypt = await import("bcryptjs");
        const isMatch = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!isMatch) {
          return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }
      }
      const bcrypt = await import("bcryptjs");
      user.passwordHash = await bcrypt.hash(body.newPassword, 10);
    }

    // Admin-specific updates
    if (isAdmin) {
      if (body.role && ["Admin", "Manager", "Employee"].includes(body.role)) {
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
      if (body.status && ["Active", "On Leave", "Suspended"].includes(body.status)) {
        user.status = body.status;
      }
    }

    // Personal profile meta updates (restricted strictly to account owner/self)
    if (isSelf) {
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
