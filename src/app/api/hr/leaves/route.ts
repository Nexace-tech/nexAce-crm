import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { LeaveRequest } from "@/models/LeaveRequest";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;
    await connectToDatabase();

    const filter: any = { tenantId: tenantObjectId };
    // Employees only see their own; Managers/Admins see all
    if (session.role === "Employee") {
      filter.userId = authResult.userObjectId;
    }

    const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ leaves });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { type, startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Start date, end date, and reason are required" }, { status: 400 });
    }

    await connectToDatabase();

    const leave = await LeaveRequest.create({
      userId: userObjectId,
      userName: session.userName,
      type: type || "Casual",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "Pending",
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ leave, message: "Leave request submitted" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { leaveId, status } = body;

    if (!leaveId || !status) {
      return NextResponse.json({ error: "leaveId and status are required" }, { status: 400 });
    }

    await connectToDatabase();

    const leave = await LeaveRequest.findOneAndUpdate(
      { _id: leaveId, tenantId: tenantObjectId },
      { status, approvedBy: userObjectId, approverName: session.userName },
      { new: true }
    );

    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    return NextResponse.json({ leave, message: `Leave ${status.toLowerCase()}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
