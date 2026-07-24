import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Department } from "@/models/Department";
import mongoose from "mongoose";

const DEFAULT_DEPARTMENTS = [
  { name: "Management", description: "Executive leadership and corporate operations", code: "MGMT" },
  { name: "Engineering", description: "Software development and technical infrastructure", code: "ENG" },
  { name: "Design", description: "UI/UX design, branding, and visual assets", code: "DES" },
  { name: "Marketing", description: "Growth, content strategy, and campaign management", code: "MKT" },
];

/**
 * GET: Fetch all departments for the logged-in tenant.
 * Auto-seeds default departments if none exist for the tenant.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    let departments = await Department.find({ tenantId: tenantObjectId }).sort({ name: 1 });

    if (departments.length === 0) {
      // Auto-seed default departments for tenant
      const defaultDocs = DEFAULT_DEPARTMENTS.map((dept) => ({
        ...dept,
        tenantId: tenantObjectId,
      }));
      departments = await Department.insertMany(defaultDocs);
    }

    return NextResponse.json({ departments });
  } catch (error: any) {
    console.error("API GET Departments error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new department (Admin/Manager only).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, code } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    const existing = await Department.findOne({
      tenantId: tenantObjectId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return NextResponse.json({ error: "A department with this name already exists" }, { status: 400 });
    }

    const newDepartment = await Department.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      code: code ? code.trim().toUpperCase() : "",
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ success: true, department: newDepartment }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Department error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
