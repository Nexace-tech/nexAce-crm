import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

/**
 * PUT: Updates an employee's managerId reporting line (Restricted to Admin & OPS/SubAdmin).
 * Body: { employeeId: string, managerId: string | null }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.role === "Admin" || isSubAdminRole(session.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin or OPS access required" }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId, managerId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify employee exists and belongs to tenant
    const employee = await User.findById(employeeId);
    if (!employee || employee.tenantId.toString() !== session.tenantId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (managerId) {
      // Verify manager exists and belongs to tenant
      const manager = await User.findById(managerId);
      if (!manager || manager.tenantId.toString() !== session.tenantId) {
        return NextResponse.json({ error: "Manager not found" }, { status: 404 });
      }

      // Check for circular reference: employee reporting to themselves
      if (employeeId === managerId) {
        return NextResponse.json({ error: "An employee cannot report to themselves" }, { status: 400 });
      }

      // Check for circular reporting loops: manager reporting to their own direct/indirect reports
      let currentManagerId = managerId;
      let depth = 0;
      const maxDepth = 50; // Safeguard against infinite loops

      while (currentManagerId && depth < maxDepth) {
        const mgrRecord = await User.findById(currentManagerId);
        if (!mgrRecord || !mgrRecord.managerId) break;

        if (mgrRecord.managerId.toString() === employeeId) {
          return NextResponse.json({
            error: `Circular reporting detected: ${manager.name} indirectly reports to ${employee.name}`
          }, { status: 400 });
        }
        currentManagerId = mgrRecord.managerId.toString();
        depth++;
      }
    }

    // Update managerId
    employee.managerId = managerId ? new mongoose.Types.ObjectId(managerId) : undefined;
    await employee.save();

    return NextResponse.json({ success: true, employee });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API reassign manager error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
