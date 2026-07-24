import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import mongoose from "mongoose";

/**
 * PUT: Bulk assign multiple team members to multiple departments (Admin only).
 * Body: { memberIds: string[], departments: string[], mode?: "add" | "set" | "remove" }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    const body = await request.json();
    const { memberIds, departments, mode = "set" } = body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: "At least one team member must be selected" }, { status: 400 });
    }

    if (!Array.isArray(departments) || departments.length === 0) {
      return NextResponse.json({ error: "At least one department must be selected" }, { status: 400 });
    }

    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const objectIdArray = memberIds.map((id) => new mongoose.Types.ObjectId(id));

    const targetUsers = await User.find({
      _id: { $in: objectIdArray },
      tenantId: tenantObjectId,
    });

    let updatedCount = 0;

    for (const user of targetUsers) {
      let currentDepts: string[] = user.departments || (user.department ? [user.department] : []);

      if (mode === "set") {
        currentDepts = [...departments];
      } else if (mode === "add") {
        const combined = new Set([...currentDepts, ...departments]);
        currentDepts = Array.from(combined);
      } else if (mode === "remove") {
        currentDepts = currentDepts.filter((d) => !departments.includes(d));
      }

      user.departments = currentDepts;
      user.department = currentDepts[0] || "General";
      await user.save();
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} team member(s) for department assignment.`,
    });
  } catch (error: any) {
    console.error("API PUT Bulk Assign Departments error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
