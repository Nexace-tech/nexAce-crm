import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { LeaveRequest } from "@/models/LeaveRequest";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

import { isSubAdminRole } from "@/lib/roles";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    await connectToDatabase();

    const filter: any = { tenantId: tenantObjectId };

    const { getHRAccessScope } = await import("@/lib/hrIsolation");
    const scope = await getHRAccessScope(session, tenantObjectId, userObjectId);
    if (scope.allowedUserIds) {
      filter.userId = { $in: scope.allowedUserIds };
    }

    const leaves = await LeaveRequest.find(filter).sort({ createdAt: -1 }).lean();
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
    const { type, startDate, endDate, reason, isHalfDay, halfDayType } = body;

    const validTypes = ["Casual", "Sick", "Maternity", "Paternity", "Unpaid", "Annual", "Earned"];
    const leaveType = validTypes.includes(type) ? type : "Casual";

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Start date, end date, and reason are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (end.getTime() < start.getTime()) {
      return NextResponse.json({ error: "End date cannot be earlier than start date" }, { status: 400 });
    }

    // Calculate days deducted
    let daysCount = 1;
    if (isHalfDay) {
      daysCount = 0.5;
    } else {
      const diffMs = Math.abs(end.getTime() - start.getTime());
      daysCount = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    await connectToDatabase();

    const leave = await LeaveRequest.create({
      userId: userObjectId,
      userName: session.userName,
      type: leaveType,
      startDate: start,
      endDate: end,
      isHalfDay: Boolean(isHalfDay),
      halfDayType: isHalfDay ? halfDayType : undefined,
      balanceDeducted: daysCount,
      reason: reason.trim(),
      status: "Pending",
      tenantId: tenantObjectId,
    });

    // Update pending balance in LeaveBalance
    try {
      const { LeaveBalance } = await import("@/models/LeaveBalance");
      const currentYear = start.getFullYear();
      let fieldPrefix = "casualLeave";
      if (leaveType === "Sick") fieldPrefix = "sickLeave";
      else if (leaveType === "Earned" || leaveType === "Annual") fieldPrefix = "earnedLeave";
      else if (leaveType === "Unpaid") fieldPrefix = "unpaidLeave";

      if (fieldPrefix !== "unpaidLeave") {
        await LeaveBalance.findOneAndUpdate(
          { tenantId: tenantObjectId, userId: userObjectId, year: currentYear },
          { $inc: { [`${fieldPrefix}.pending`]: daysCount } },
          { upsert: true }
        );
      }
    } catch (balErr) {
      console.error("Failed to update pending leave balance:", balErr);
    }

    // Send Notification to Workspace Admins / OPS / HR / Managers
    try {
      const { Notification } = await import("@/models/Notification");
      const { User } = await import("@/models/User");
      const reviewers = await User.find({
        tenantId: tenantObjectId,
        role: { $in: ["Admin", "SuperAdmin", "OPS", "HR", "Manager"] },
      }).select("_id");

      const notifications = reviewers.map((rev) => ({
        tenantId: tenantObjectId,
        recipientId: rev._id,
        title: `🌴 New Leave Request (${daysCount}d) — ${session.userName}`,
        message: `${session.userName} submitted a ${leaveType} Leave request (${start.toLocaleDateString("en-IN")} - ${end.toLocaleDateString("en-IN")}). Reason: "${reason.trim()}".`,
        type: "hr",
        linkUrl: "/dashboard/hr",
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } catch (notifErr) {
      console.error("Notification creation error on leave submit:", notifErr);
    }

    return NextResponse.json({ leave, message: "Leave request submitted successfully" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "SuperAdmin", "OPS", "HR", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { leaveId, status } = body;
    const rejectionReason = String(body.rejectionReason || body.reason || "").trim();

    if (!leaveId || !status) {
      return NextResponse.json({ error: "leaveId and status are required" }, { status: 400 });
    }

    await connectToDatabase();

    const updateFields: Record<string, unknown> = {
      status,
      approvedBy: userObjectId,
      approverName: session.userName,
    };
    if (rejectionReason) {
      updateFields.rejectionReason = rejectionReason;
    }

    const leave = await LeaveRequest.findOneAndUpdate(
      { _id: leaveId, tenantId: tenantObjectId },
      updateFields,
      { returnDocument: "after" }
    );

    if (!leave) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

    // Update LeaveBalance upon decision
    try {
      const { LeaveBalance } = await import("@/models/LeaveBalance");
      const currentYear = new Date(leave.startDate).getFullYear();
      const daysCount = leave.balanceDeducted || 1;
      let fieldPrefix = "casualLeave";
      if (leave.type === "Sick") fieldPrefix = "sickLeave";
      else if (leave.type === "Earned") fieldPrefix = "earnedLeave";
      else if (leave.type === "Unpaid") fieldPrefix = "unpaidLeave";

      if (fieldPrefix === "unpaidLeave") {
        if (status === "Approved") {
          await LeaveBalance.findOneAndUpdate(
            { tenantId: tenantObjectId, userId: leave.userId, year: currentYear },
            { $inc: { "unpaidLeave.used": daysCount } },
            { upsert: true }
          );
        }
      } else {
        if (status === "Approved") {
          await LeaveBalance.findOneAndUpdate(
            { tenantId: tenantObjectId, userId: leave.userId, year: currentYear },
            {
              $inc: {
                [`${fieldPrefix}.used`]: daysCount,
                [`${fieldPrefix}.pending`]: -daysCount,
              },
            },
            { upsert: true }
          );
        } else if (status === "Rejected") {
          await LeaveBalance.findOneAndUpdate(
            { tenantId: tenantObjectId, userId: leave.userId, year: currentYear },
            {
              $inc: {
                [`${fieldPrefix}.pending`]: -daysCount,
              },
            },
            { upsert: true }
          );
        }
      }
    } catch (balErr) {
      console.error("Failed to update leave balance on decision:", balErr);
    }

    // On Approval: Sync attendance records for leave dates with status "On Leave"
    if (status === "Approved") {
      try {
        const { Attendance } = await import("@/models/Attendance");
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const curDate = new Date(leave.startDate);
        const endDateObj = new Date(leave.endDate);

        while (curDate <= endDateObj) {
          const istDayIndex = Math.floor((curDate.getTime() + IST_OFFSET_MS) / 86400000);
          const dayStart = new Date(istDayIndex * 86400000 - IST_OFFSET_MS);
          const dayEnd = new Date(dayStart.getTime() + 86400000);

          await Attendance.findOneAndUpdate(
            {
              userId: leave.userId,
              tenantId: tenantObjectId,
              date: { $gte: dayStart, $lt: dayEnd },
            },
            {
              $setOnInsert: {
                userId: leave.userId,
                tenantId: tenantObjectId,
                date: dayStart,
                regularHours: 0,
                overtimeHours: 0,
              },
              $set: {
                status: "On Leave",
              },
            },
            { upsert: true, returnDocument: "after" }
          );

          curDate.setDate(curDate.getDate() + 1);
        }
      } catch (attSyncErr) {
        console.error("Failed to auto-sync attendance on leave approval:", attSyncErr);
      }
    }

    // Send Notification to the Employee whose leave status was updated
    try {
      const { Notification } = await import("@/models/Notification");
      const isApproved = status === "Approved";
      await Notification.create({
        tenantId: tenantObjectId,
        recipientId: leave.userId,
        title: isApproved ? "✅ Leave Request Approved" : "❌ Leave Request Declined",
        message: isApproved
          ? `Your ${leave.type} Leave request (${new Date(leave.startDate).toLocaleDateString("en-IN")} - ${new Date(leave.endDate).toLocaleDateString("en-IN")}) has been approved by ${session.userName}.`
          : `Your ${leave.type} Leave request was declined by ${session.userName}.${rejectionReason ? ` Reason: "${rejectionReason}"` : ""}`,
        type: "hr",
        linkUrl: "/dashboard/hr",
      });
    } catch (notifErr) {
      console.error("Notification creation error on leave update:", notifErr);
    }

    return NextResponse.json({ leave, message: `Leave ${status.toLowerCase()} successfully` });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
