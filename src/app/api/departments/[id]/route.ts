import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Department } from "@/models/Department";
import { User } from "@/models/User";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT: Update department details (Admin/Manager only).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, code } = body;

    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department || department.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const oldName = department.name;

    if (name && name.trim() !== oldName) {
      // Check for duplicate name
      const existing = await Department.findOne({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        _id: { $ne: department._id },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      });

      if (existing) {
        return NextResponse.json({ error: "A department with this name already exists" }, { status: 400 });
      }

      department.name = name.trim();

      // Cascade update users with the old department name
      await User.updateMany(
        { tenantId: new mongoose.Types.ObjectId(session.tenantId), department: oldName },
        { department: name.trim() }
      );
    }

    if (description !== undefined) department.description = description.trim();
    if (code !== undefined) department.code = code.trim().toUpperCase();

    await department.save();

    return NextResponse.json({ success: true, department });
  } catch (error: any) {
    console.error("API PUT Department error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove department (Admin only).
 * Reassigns members in this department to "General".
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

    await connectToDatabase();

    const department = await Department.findById(id);
    if (!department || department.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const deptName = department.name;

    // Reset department for assigned users
    await User.updateMany(
      { tenantId: new mongoose.Types.ObjectId(session.tenantId), department: deptName },
      { department: "General" }
    );

    await department.deleteOne();

    return NextResponse.json({ success: true, message: `Department '${deptName}' deleted successfully` });
  } catch (error: any) {
    console.error("API DELETE Department error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
