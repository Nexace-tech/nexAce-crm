import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { RolePermission } from "@/models/RolePermission";
import { isSubAdminRole, normalizeRoleKey } from "@/lib/roles";
import mongoose from "mongoose";

/**
 * PUT: Updates an employee's reporting manager or assigned HR partner.
 * Accessible to Admin, OPS, and roles granted 'reassignReportingLine' or 'reassignHRPartner' permission.
 * Body: { employeeId: string, managerId?: string | null, hrId?: string | null }
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const roleKey = normalizeRoleKey(session.role);

    let hasReassignLinePerm = false;
    let hasReassignHRPerm = false;
    try {
      const rolePerm = await RolePermission.findOne({ tenantId: tenantObjectId, role: roleKey }).lean();
      if (rolePerm?.featurePermissions?.reassignReportingLine) {
        hasReassignLinePerm = true;
      }
      if (rolePerm?.featurePermissions?.reassignHRPartner) {
        hasReassignHRPerm = true;
      }
    } catch {
      // fallback
    }

    const isAdminOrOps = session.role === "Admin" || isSubAdminRole(session.role);
    const canReassignLine = isAdminOrOps || hasReassignLinePerm;
    const canReassignHR = isAdminOrOps || hasReassignHRPerm;

    if (!canReassignLine && !canReassignHR) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to reassign team members" }, { status: 403 });
    }

    const body = await request.json();
    const { employeeId, managerId, hrId } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Verify employee exists and belongs to tenant
    const employee = await User.findOne({ _id: employeeId, tenantId: tenantObjectId });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // 1. Manager Reporting Line Reassignment
    if (managerId !== undefined) {
      if (!canReassignLine) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to reassign reporting lines" }, { status: 403 });
      }

      if (managerId) {
        // Verify manager exists and belongs to tenant
        const manager = await User.findOne({ _id: managerId, tenantId: tenantObjectId });
        if (!manager) {
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
          const mgrRecord = await User.findOne({ _id: currentManagerId, tenantId: tenantObjectId }).lean();
          if (!mgrRecord || !(mgrRecord as any).managerId) break;

          if ((mgrRecord as any).managerId.toString() === employeeId) {
            return NextResponse.json({
              error: `Circular reporting detected: ${manager.name} indirectly reports to ${employee.name}`
            }, { status: 400 });
          }
          currentManagerId = (mgrRecord as any).managerId.toString();
          depth++;
        }
      }

      employee.managerId = managerId ? new mongoose.Types.ObjectId(managerId) : undefined;
    }

    // 2. HR Partner Reassignment
    if (hrId !== undefined) {
      if (!canReassignHR) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to reassign HR partners" }, { status: 403 });
      }

      if (hrId) {
        const hrPartner = await User.findOne({ _id: hrId, tenantId: tenantObjectId });
        if (!hrPartner) {
          return NextResponse.json({ error: "Assigned HR partner not found" }, { status: 404 });
        }
      }

      employee.hrId = hrId ? new mongoose.Types.ObjectId(hrId) : undefined;
    }

    await employee.save();

    const populatedEmployee = await User.findById(employee._id)
      .populate("managerId", "name email role photoUrl")
      .populate("hrId", "name email role photoUrl")
      .lean();

    return NextResponse.json({ success: true, employee: populatedEmployee });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API reassign error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
