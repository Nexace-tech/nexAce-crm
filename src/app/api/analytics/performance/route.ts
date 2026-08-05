import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { User } from "@/models/User";
import { HRAppraisal } from "@/models/HRAppraisal";
import { LeaveRequest } from "@/models/LeaveRequest";
import { OKR } from "@/models/OKR";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    await connectToDatabase();
    const { tenantObjectId } = authResult;

    // Scope analytics to a rolling 4-week window to prevent full-table scans on tenants with large history
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    // Fetch parallel dataset for performance analytics
    const [users, timeEntries, appraisals, leaves, okrs] = await Promise.all([
      User.find({ tenantId: tenantObjectId }).select("name role department email").lean(),
      TimeEntry.find({ tenantId: tenantObjectId, date: { $gte: fourWeeksAgo } }).lean(),
      HRAppraisal.find({ tenantId: tenantObjectId }).lean(),
      LeaveRequest.find({ tenantId: tenantObjectId, createdAt: { $gte: fourWeeksAgo } }).lean(),
      OKR.find({ tenantId: tenantObjectId }).lean(),
    ]);

    // 1. Employee Time Utilization & Over/Under target calculation
    const TARGET_HOURS_PER_WEEK = 40;
    const employeeUtilization = users.map((u: any) => {
      const userTimesheets = timeEntries.filter(
        (t: any) => t.userId && t.userId.toString() === u._id.toString()
      );
      const totalHours = userTimesheets.reduce((acc: number, curr: any) => acc + (curr.hours || 0), 0);
      const billableHours = userTimesheets
        .filter((t: any) => t.isBillable)
        .reduce((acc: number, curr: any) => acc + (curr.hours || 0), 0);

      const capacityPct = Math.round((totalHours / TARGET_HOURS_PER_WEEK) * 100);

      let capacityStatus: "Underutilized" | "On Target" | "Overloaded" = "On Target";
      if (totalHours < 30) capacityStatus = "Underutilized";
      else if (totalHours > 45) capacityStatus = "Overloaded";

      return {
        userId: u._id,
        userName: u.name,
        userRole: u.role,
        department: u.department || "General",
        totalHours,
        billableHours,
        nonBillableHours: totalHours - billableHours,
        capacityPct,
        capacityStatus,
      };
    });

    // 2. Manager View Pending Approvals Summary
    const pendingTimesheets = timeEntries.filter((t: any) => t.status === "Submitted" || t.status === "Pending").length;
    const pendingLeaves = leaves.filter((l: any) => l.status === "Pending").length;

    // 3. Performance Insights (Appraisals & OKRs)
    const completedAppraisals = appraisals.filter((a: any) => a.status === "Completed");
    const avgCompetencyScore =
      completedAppraisals.length > 0
        ? Math.round(
            (completedAppraisals.reduce((acc: number, curr: any) => acc + (curr.overallScore || 0), 0) /
              completedAppraisals.length) *
              10
          ) / 10
        : 0;

    const totalOKRs = okrs.length;
    const onTrackOKRs = okrs.filter((o: any) => o.status === "On Track" || o.status === "Completed").length;
    const okrHealthPct = totalOKRs > 0 ? Math.round((onTrackOKRs / totalOKRs) * 100) : 100;

    return NextResponse.json({
      employeeUtilization,
      managerSummary: {
        pendingTimesheets,
        pendingLeaves,
        totalTeamMembers: users.length,
      },
      performanceInsights: {
        totalAppraisals: appraisals.length,
        completedAppraisals: completedAppraisals.length,
        avgCompetencyScore,
        totalOKRs,
        okrHealthPct,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Analytics performance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
