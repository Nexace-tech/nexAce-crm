import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
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
    if (isAdmin) {
      // Admins can update everything
      if (body.name) user.name = body.name;
      if (body.email) user.email = body.email.toLowerCase();
      if (body.role && ["Admin", "Manager", "Employee"].includes(body.role)) {
        user.role = body.role;
      }
      if (body.department) user.department = body.department;
      if (body.managerId !== undefined) {
        user.managerId = body.managerId ? new mongoose.Types.ObjectId(body.managerId) : undefined;
      }
      if (body.status && ["Active", "On Leave", "Suspended"].includes(body.status)) {
        user.status = body.status;
      }
    }

    // Both Self and Admin can update profile meta
    if (body.bio !== undefined) user.bio = body.bio;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.photoUrl !== undefined) user.photoUrl = body.photoUrl;
    if (body.skills !== undefined) user.skills = body.skills;

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
