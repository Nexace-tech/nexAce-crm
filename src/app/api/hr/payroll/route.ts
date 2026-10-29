import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalarySlip } from "@/models/SalarySlip";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { LeaveRequest } from "@/models/LeaveRequest";
import { Holiday } from "@/models/Holiday";
import { Tenant } from "@/models/Tenant";
import { Notification } from "@/models/Notification";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

// IST Offset
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const userParam = searchParams.get("userId");
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam && monthParam !== "all" ? parseInt(monthParam, 10) : monthParam === "all" ? "all" : now.getMonth() + 1;

    await connectToDatabase();

    const { getUserDataScope } = await import("@/lib/dataScope");
    const { isSubAdminRole } = await import("@/lib/roles");
    const dataScope = await getUserDataScope(session);
    const isElevated =
      dataScope.role === "Admin" ||
      dataScope.role === "OPS" ||
      isSubAdminRole(dataScope.role) ||
      dataScope.canViewFeature("managePayroll") ||
      dataScope.canViewFeature("viewSalarySlips");
    const query: Record<string, unknown> = {
      tenantId: tenantObjectId,
      year,
    };

    if (month !== "all") {
      query.month = month;
    }

    if (!isElevated) {
      query.userId = userObjectId;
    } else if (userParam && userParam !== "all") {
      query.userId = new mongoose.Types.ObjectId(userParam);
    }

    const slips = await SalarySlip.find(query)
      .populate("userId", "name email department role photoUrl salary bankDetails")
      .populate("disbursedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Summary KPIs
    const totalGross = slips.reduce((acc, s) => acc + (s.grossEarnings || 0), 0);
    const totalNet = slips.reduce((acc, s) => acc + (s.netPayable || 0), 0);
    const totalLopDeductions = slips.reduce((acc, s) => acc + (s.lossOfPayDeduction || 0), 0);
    const totalOvertimePaid = slips.reduce((acc, s) => acc + (s.overtimePay || 0), 0);
    const paidCount = slips.filter((s) => s.paymentStatus === "Paid").length;
    const processingCount = slips.filter((s) => s.paymentStatus === "Processing").length;
    const draftCount = slips.filter((s) => s.paymentStatus === "Draft").length;

    return NextResponse.json({
      slips,
      kpis: {
        totalGross,
        totalNet,
        totalLopDeductions,
        totalOvertimePaid,
        headcount: slips.length,
        paidCount,
        processingCount,
        draftCount,
      },
      month,
      year,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    const { getUserDataScope } = await import("@/lib/dataScope");
    const { isSubAdminRole } = await import("@/lib/roles");
    const dataScope = await getUserDataScope(session);
    const canManagePayroll =
      dataScope.role === "Admin" ||
      dataScope.role === "OPS" ||
      isSubAdminRole(dataScope.role) ||
      dataScope.canViewFeature("managePayroll");

    if (!canManagePayroll) {
      return NextResponse.json({ error: "Forbidden: Payroll permissions required" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;
    const now = new Date();
    const month = body.month ? parseInt(body.month, 10) : now.getMonth() + 1;
    const year = body.year ? parseInt(body.year, 10) : now.getFullYear();

    await connectToDatabase();

    if (action === "generate") {
      // 1. Calculate pay period date bounds in IST
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      const totalDaysInMonth = new Date(year, month, 0).getDate();

      // Count weekend days (Sundays)
      let sundaysCount = 0;
      for (let d = 1; d <= totalDaysInMonth; d++) {
        const testDate = new Date(year, month - 1, d);
        if (testDate.getDay() === 0) sundaysCount++;
      }

      // Count tenant holidays in month
      const holidaysCount = await Holiday.countDocuments({
        tenantId: tenantObjectId,
        date: { $gte: startDate, $lte: endDate },
      });

      const workingDays = Math.max(1, totalDaysInMonth - sundaysCount - holidaysCount);

      const tenant = await Tenant.findById(tenantObjectId).lean();
      const targetShiftHours = Number(tenant?.targetShiftHours) || 8.0;

      // 2. Fetch all active employees with salary
      const employees = await User.find({
        tenantId: tenantObjectId,
        status: { $ne: "Suspended" },
      }).select("name email department role salary bankDetails joinDate employmentType");

      const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });
      const payPeriod = `${monthName} ${year}`;
      let generatedCount = 0;

      for (const emp of employees) {
        const baseSalary = Number(emp.salary) || 0;
        if (baseSalary <= 0) continue; // Skip zero-salary employees or track separately

        // A. Attendance for this employee in the month
        const attendanceLogs = await Attendance.find({
          tenantId: tenantObjectId,
          userId: emp._id,
          date: { $gte: startDate, $lte: endDate },
        }).lean();

        const presentLogs = attendanceLogs.filter(
          (a) => a.status === "Present" && (Number(a.regularHours) > 0 || a.clockIn)
        );
        const presentDays = presentLogs.length;
        const totalOvertimeHours = attendanceLogs.reduce((acc, a) => acc + (Number(a.overtimeHours) || 0), 0);

        // B. Approved Leaves for this employee in the month
        const leaveRecords = await LeaveRequest.find({
          tenantId: tenantObjectId,
          userId: emp._id,
          status: "Approved",
          $or: [
            { startDate: { $gte: startDate, $lte: endDate } },
            { endDate: { $gte: startDate, $lte: endDate } },
          ],
        }).lean();

        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;

        for (const l of leaveRecords) {
          const days = Number(l.balanceDeducted) || 1;
          if (l.type === "Unpaid") {
            unpaidLeaveDays += days;
          } else {
            paidLeaveDays += days;
          }
        }

        // C. Loss of Pay Calculation
        const unexcusedDays = Math.max(0, workingDays - presentDays - paidLeaveDays);
        const lossOfPayDays = unexcusedDays + unpaidLeaveDays;

        const perDayRate = baseSalary / totalDaysInMonth;
        const lossOfPayDeduction = Math.round(lossOfPayDays * perDayRate);
        const hourlyRate = perDayRate / targetShiftHours;
        const overtimePay = Math.round(totalOvertimeHours * (hourlyRate * 1.5));

        // Earnings
        const basicPay = Math.round(baseSalary * 0.5);
        const hra = Math.round(baseSalary * 0.3);
        const specialAllowance = Math.round(baseSalary * 0.2);
        const grossEarnings = Math.max(0, baseSalary - lossOfPayDeduction + overtimePay);

        // Standard Professional Tax / TDS
        const taxDeduction = Math.round(grossEarnings > 30000 ? grossEarnings * 0.05 : 0);
        const totalDeductions = lossOfPayDeduction + taxDeduction;
        const netPayable = Math.max(0, grossEarnings - taxDeduction);

        await SalarySlip.findOneAndUpdate(
          {
            tenantId: tenantObjectId,
            userId: emp._id,
            month,
            year,
          },
          {
            $set: {
              payPeriod,
              employmentType: emp.employmentType || "Permanent",
              department: emp.department || "General",
              designation: emp.role || "Team Member",
              joiningDate: emp.joinDate,
              totalDays: totalDaysInMonth,
              workingDays,
              presentDays,
              paidLeaveDays,
              unpaidLeaveDays: lossOfPayDays,
              overtimeHours: totalOvertimeHours,
              baseSalary,
              basicPay,
              hra,
              specialAllowance,
              overtimePay,
              bonus: 0,
              reimbursements: 0,
              grossEarnings,
              lossOfPayDeduction,
              taxDeduction,
              otherDeductions: 0,
              totalDeductions,
              netPayable,
              bankDetails: emp.bankDetails || {},
            },
            $setOnInsert: {
              paymentStatus: "Draft",
            },
          },
          { upsert: true, returnDocument: "after" }
        );

        generatedCount++;
      }

      return NextResponse.json({
        success: true,
        generatedCount,
        message: `Successfully computed Zero-Touch Payroll for ${generatedCount} team members for ${payPeriod}.`,
      });

    } else if (action === "mark_paid") {
      const { slipIds, transactionReference } = body;
      if (!Array.isArray(slipIds) || slipIds.length === 0) {
        return NextResponse.json({ error: "slipIds array is required" }, { status: 400 });
      }

      const validIds = slipIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));

      const updated = await SalarySlip.find({
        _id: { $in: validIds },
        tenantId: tenantObjectId,
      });

      const notifs = [];
      for (const slip of updated) {
        slip.paymentStatus = "Paid";
        slip.disbursedAt = now;
        slip.disbursedBy = userObjectId;
        if (transactionReference) slip.transactionReference = String(transactionReference).trim();
        await slip.save();

        notifs.push({
          tenantId: tenantObjectId,
          recipientId: slip.userId,
          title: "💰 Salary Disbursed",
          message: `Your salary slip for ${slip.payPeriod} (Net: ₹${slip.netPayable.toLocaleString()}) has been marked as Paid.`,
          type: "hr",
          linkUrl: "/dashboard/finance?tab=payroll",
        });
      }

      if (notifs.length > 0) {
        try {
          await Notification.insertMany(notifs);
        } catch (notifErr) {
          console.error("Failed to insert payroll disbursement notifications:", notifErr);
        }
      }

      return NextResponse.json({
        success: true,
        disbursedCount: updated.length,
        message: `Disbursement completed for ${updated.length} employees.`,
      });

    } else if (action === "update_slip") {
      const { slipId, bonus, reimbursements, otherDeductions, notes } = body;
      if (!slipId || !mongoose.Types.ObjectId.isValid(slipId)) {
        return NextResponse.json({ error: "Valid slipId is required" }, { status: 400 });
      }

      const slip = await SalarySlip.findOne({ _id: slipId, tenantId: tenantObjectId });
      if (!slip) return NextResponse.json({ error: "Salary slip not found" }, { status: 404 });

      if (bonus !== undefined) slip.bonus = Math.max(0, Number(bonus));
      if (reimbursements !== undefined) slip.reimbursements = Math.max(0, Number(reimbursements));
      if (otherDeductions !== undefined) slip.otherDeductions = Math.max(0, Number(otherDeductions));
      if (notes !== undefined) slip.notes = String(notes);

      slip.grossEarnings = Math.max(
        0,
        slip.baseSalary - slip.lossOfPayDeduction + slip.overtimePay + slip.bonus + slip.reimbursements
      );
      slip.totalDeductions = slip.lossOfPayDeduction + slip.taxDeduction + slip.otherDeductions;
      slip.netPayable = Math.max(0, slip.grossEarnings - slip.totalDeductions);

      await slip.save();

      return NextResponse.json({
        success: true,
        slip,
        message: "Salary slip updated successfully.",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
