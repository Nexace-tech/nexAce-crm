import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRFnFSettlement } from "@/models/HRFnFSettlement";
import { User } from "@/models/User";
import { LeaveBalance } from "@/models/LeaveBalance";
import { Attendance } from "@/models/Attendance";
import { ITDevice } from "@/models/ITDevice";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { getUserDataScope } from "@/lib/dataScope";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET /api/hr/fnf
 * - List settlements
 * - Or compute live preview if ?previewUserId=...
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    await connectToDatabase();

    const dataScope = await getUserDataScope(session);
    const isPrivileged =
      dataScope.role === "Admin" ||
      dataScope.role === "OPS" ||
      isSubAdminRole(dataScope.role) ||
      dataScope.canViewFeature("manageFnFSettlements") ||
      dataScope.canViewFeature("managePayroll");

    const canView =
      isPrivileged ||
      dataScope.canViewFeature("viewFnFSettlements");

    const url = new URL(request.url);
    const previewUserId = url.searchParams.get("previewUserId");

    // 1. Live F&F Calculation Preview Endpoint
    if (previewUserId && mongoose.Types.ObjectId.isValid(previewUserId)) {
      if (!isPrivileged && previewUserId !== session.userId) {
        return NextResponse.json({ error: "Forbidden: HR permissions required" }, { status: 403 });
      }

      const targetUser = await User.findOne({ _id: previewUserId, tenantId: tenantObjectId }).lean() as any;
      if (!targetUser) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      const lastWorkingDayStr = url.searchParams.get("lastWorkingDay") || new URL(request.url).searchParams.get("lwd") || new Date().toISOString().slice(0, 10);
      const lwdDate = new Date(lastWorkingDayStr);
      const startOfMonth = new Date(lwdDate.getFullYear(), lwdDate.getMonth(), 1);
      const endOfMonth = new Date(lwdDate.getFullYear(), lwdDate.getMonth() + 1, 0);

      // Attendance working days in exit month until LWD
      const attendanceLogs = await Attendance.find({
        tenantId: tenantObjectId,
        userId: targetUser._id,
        date: { $gte: startOfMonth, $lte: lwdDate },
        status: "Present",
      }).lean();

      let unpaidSalaryDays = 0;
      for (const att of attendanceLogs) {
        unpaidSalaryDays += (att.regularHours && att.regularHours < 4.5) ? 0.5 : 1;
      }
      if (unpaidSalaryDays === 0) {
        unpaidSalaryDays = Math.min(lwdDate.getDate(), 30);
      }

      // Leave balance for encashment
      const currentYear = lwdDate.getFullYear();
      const currentMonth = lwdDate.getMonth() + 1;
      const leaveBal = await LeaveBalance.findOne({
        tenantId: tenantObjectId,
        userId: targetUser._id,
        year: currentYear,
        month: currentMonth,
      }).lean() as any;

      let leaveEncashmentDays = 0;
      if (leaveBal) {
        leaveEncashmentDays = Math.max(0, Number((leaveBal.earnedLeave + leaveBal.casualLeave).toFixed(1)));
      }

      // Check assigned IT devices
      const assignedDevices = await ITDevice.find({
        tenantId: tenantObjectId,
        assignedUserId: targetUser._id,
      }).lean();

      const monthlyGross = targetUser.salary || 0;
      const perDayRate = Number((monthlyGross / 30).toFixed(2));
      const unpaidSalaryAmount = Math.round(unpaidSalaryDays * perDayRate);
      const leaveEncashmentAmount = Math.round(leaveEncashmentDays * perDayRate);
      const totalEarnings = unpaidSalaryAmount + leaveEncashmentAmount;

      return NextResponse.json({
        preview: {
          user: {
            _id: targetUser._id,
            name: targetUser.name,
            email: targetUser.email,
            department: targetUser.departments?.[0] || targetUser.department || "Engineering",
            role: targetUser.role,
            salary: monthlyGross,
            createdAt: targetUser.createdAt,
          },
          lwdDate,
          perDayRate,
          unpaidSalaryDays,
          unpaidSalaryAmount,
          leaveEncashmentDays,
          leaveEncashmentAmount,
          totalEarnings,
          assignedDevicesCount: assignedDevices.length,
          assignedDevices,
        },
      });
    }

    // 2. Standard Settlement List
    let query: any = { tenantId: tenantObjectId };
    if (!isPrivileged) {
      query.userId = userObjectId;
    }

    const settlements = await HRFnFSettlement.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ settlements });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/hr/fnf error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hr/fnf
 * - Create or update an F&F settlement
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const dataScope = await getUserDataScope(session);
    const isPrivileged =
      dataScope.role === "Admin" ||
      dataScope.role === "OPS" ||
      isSubAdminRole(dataScope.role) ||
      dataScope.canViewFeature("manageFnFSettlements") ||
      dataScope.canViewFeature("managePayroll");

    const canView =
      isPrivileged ||
      dataScope.canViewFeature("viewFnFSettlements");

    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: HR permissions required" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const {
      userId,
      resignationDate,
      lastWorkingDay,
      noticePeriodDays = 30,
      servedNoticeDays = 30,
      monthlyGrossSalary = 0,
      earnings = {},
      deductions = {},
      remarks = "",
    } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
    }

    const user = await User.findOne({ _id: userId, tenantId: tenantObjectId }).lean() as any;
    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const noticeShortfallDays = Math.max(0, noticePeriodDays - servedNoticeDays);
    const perDayRate = Number((monthlyGrossSalary / 30).toFixed(2));

    const totalEarnings =
      (earnings.unpaidSalaryAmount || 0) +
      (earnings.leaveEncashmentAmount || 0) +
      (earnings.gratuityAmount || 0) +
      (earnings.statutoryBonus || 0) +
      (earnings.reimbursements || 0);

    const totalDeductions =
      (deductions.noticeShortfallAmount || Math.round(noticeShortfallDays * perDayRate)) +
      (deductions.assetLossDeduction || 0) +
      (deductions.loanAdvanceRecovery || 0) +
      (deductions.incomeTaxTds || 0) +
      (deductions.otherDeductions || 0);

    const netSettlementPayable = Math.max(0, totalEarnings - totalDeductions);

    // Check if IT clearance is ready
    const pendingDevices = await ITDevice.countDocuments({
      tenantId: tenantObjectId,
      assignedUserId: user._id,
      status: "In Use",
    });

    const doc = await HRFnFSettlement.findOneAndUpdate(
      { tenantId: tenantObjectId, userId: user._id },
      {
        $set: {
          userName: user.name,
          userEmail: user.email,
          department: user.departments?.[0] || user.department || "Engineering",
          designation: user.role || "Employee",
          dateOfJoining: user.createdAt,
          resignationDate: new Date(resignationDate || Date.now()),
          lastWorkingDay: new Date(lastWorkingDay || Date.now()),
          noticePeriodDays,
          servedNoticeDays,
          noticeShortfallDays,
          monthlyGrossSalary,
          perDayRate,
          earnings: {
            unpaidSalaryDays: earnings.unpaidSalaryDays || 0,
            unpaidSalaryAmount: earnings.unpaidSalaryAmount || 0,
            leaveEncashmentDays: earnings.leaveEncashmentDays || 0,
            leaveEncashmentAmount: earnings.leaveEncashmentAmount || 0,
            gratuityAmount: earnings.gratuityAmount || 0,
            statutoryBonus: earnings.statutoryBonus || 0,
            reimbursements: earnings.reimbursements || 0,
            totalEarnings,
          },
          deductions: {
            noticeShortfallAmount: deductions.noticeShortfallAmount || Math.round(noticeShortfallDays * perDayRate),
            assetLossDeduction: deductions.assetLossDeduction || 0,
            loanAdvanceRecovery: deductions.loanAdvanceRecovery || 0,
            incomeTaxTds: deductions.incomeTaxTds || 0,
            otherDeductions: deductions.otherDeductions || 0,
            totalDeductions,
          },
          netSettlementPayable,
          "clearances.it.assetsReturned": pendingDevices === 0,
          remarks,
          createdBy: userObjectId,
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json({ success: true, settlement: doc }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/hr/fnf error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/hr/fnf
 * - Update departmental clearances (IT, Finance, HR) or finalize settlement
 */
export async function PATCH(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const dataScope = await getUserDataScope(session);
    const isPrivileged =
      dataScope.role === "Admin" ||
      dataScope.role === "OPS" ||
      isSubAdminRole(dataScope.role) ||
      dataScope.canViewFeature("manageFnFSettlements") ||
      dataScope.canViewFeature("managePayroll");

    const canView =
      isPrivileged ||
      dataScope.canViewFeature("viewFnFSettlements");

    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: HR permissions required" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json();
    const { id, department, status, notes, settlementStatus, disbursedReference } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Valid settlement ID is required" }, { status: 400 });
    }

    const settlement = await HRFnFSettlement.findOne({ _id: id, tenantId: tenantObjectId });
    if (!settlement) {
      return NextResponse.json({ error: "Settlement record not found" }, { status: 404 });
    }

    // 1. Departmental Clearance updates
    if (department && ["it", "finance", "hr"].includes(department)) {
      const deptKey = department as "it" | "finance" | "hr";
      settlement.clearances[deptKey].status = status || "Cleared";
      settlement.clearances[deptKey].clearedBy = session.userName || "HR System";
      settlement.clearances[deptKey].clearedAt = new Date();
      if (notes !== undefined) settlement.clearances[deptKey].notes = notes;
      if (deptKey === "it") settlement.clearances.it.assetsReturned = true;
      if (deptKey === "finance") settlement.clearances.finance.claimsSettled = true;
      if (deptKey === "hr") {
        settlement.clearances.hr.exitInterviewDone = true;
        settlement.clearances.hr.idCardReturned = true;
      }

      // Check if all 3 are cleared
      const allCleared =
        settlement.clearances.it.status === "Cleared" &&
        settlement.clearances.finance.status === "Cleared" &&
        settlement.clearances.hr.status === "Cleared";

      if (allCleared && settlement.settlementStatus === "Pending Clearances") {
        settlement.settlementStatus = "Approved";
      }
    }

    // 2. Direct settlement status override
    if (settlementStatus) {
      settlement.settlementStatus = settlementStatus;
      if (settlementStatus === "Disbursed") {
        settlement.disbursedAt = new Date();
        if (disbursedReference) settlement.disbursedReference = disbursedReference;
      }
    }

    await settlement.save();

    return NextResponse.json({ success: true, settlement });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/hr/fnf error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
