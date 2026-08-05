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
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { type, startDate, endDate, reason } = body;

    const validTypes = ["Casual", "Sick", "Maternity", "Paternity", "Unpaid", "Annual"];
    const leaveType = validTypes.includes(type) ? type : "Casual";

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Start date, end date, and reason are required" }, { status: 400 });
    }

    await connectToDatabase();

    const leave = await LeaveRequest.create({
      userId: userObjectId,
      userName: session.userName,
      type: leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "Pending",
      tenantId: tenantObjectId,
    });

    // Send Notification to Workspace Admins / Managers
    try {
      const { Notification } = await import("@/models/Notification");
      const { User } = await import("@/models/User");
      const adminsAndManagers = await User.find({
        tenantId: tenantObjectId,
        role: { $in: ["Admin", "Manager"] },
      }).select("_id");

      for (const mgr of adminsAndManagers) {
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: mgr._id,
          title: "New Leave Request",
          message: `${session.userName} submitted a ${type || "Casual"} Leave request (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}).`,
          type: "system",
          linkUrl: "/dashboard/hr",
        });
      }
    } catch (notifErr) {
      console.error("Notification creation error on leave submit:", notifErr);
    }

    return NextResponse.json({ leave, message: "Leave request submitted" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
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

    // Send Notification to the Employee whose leave status was updated
    try {
      const { Notification } = await import("@/models/Notification");
      await Notification.create({
        tenantId: tenantObjectId,
        recipientId: leave.userId,
        title: `Leave Request ${status}`,
        message: `Your ${leave.type} Leave request has been ${status.toLowerCase()} by ${session.userName}.`,
        type: "system",
        linkUrl: "/dashboard/hr",
      });
    } catch (notifErr) {
      console.error("Notification creation error on leave update:", notifErr);
    }

    return NextResponse.json({ leave, message: `Leave ${status.toLowerCase()}` });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
