import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import mongoose from "mongoose";

/**
 * GET /api/attendance/summary
 * Returns user login activity and working hours for Admin / OPS.
 * Query params:
 *   from   - YYYY-MM-DD  (default: start of current week Mon)
 *   to     - YYYY-MM-DD  (default: today)
 *   userId - optional ObjectId string to filter a single user
 *   limit  - max records to return (default 500, max 2000)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin and OPS roles can see all-users data
    const isElevated = session.role === "Admin" || session.role === "OPS";

    await connectToDatabase();

    const { searchParams } = new URL(request.url);

    // ------ Date range defaults: Mon of current week to today ------
    const todayUTC = new Date();
    todayUTC.setUTCHours(23, 59, 59, 999);

    const monday = new Date();
    const dayOfWeek = monday.getDay(); // 0=Sun
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(monday.getDate() - daysBack);
    monday.setHours(0, 0, 0, 0);

    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");

    const fromDate = fromParam ? new Date(fromParam + "T00:00:00.000Z") : monday;
    const toDate   = toParam   ? new Date(toParam   + "T23:59:59.999Z") : todayUTC;

    const userIdParam = searchParams.get("userId");
    const limitParam  = parseInt(searchParams.get("limit") ?? "500", 10);
    const safeLimit   = Math.min(isNaN(limitParam) || limitParam <= 0 ? 500 : limitParam, 2000);

    // Build attendance query
    const filter: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      date: { $gte: fromDate, $lte: toDate },
    };

    // Non-elevated users only see their own records
    if (!isElevated) {
      filter.userId = new mongoose.Types.ObjectId(session.userId);
    } else if (userIdParam) {
      filter.userId = new mongoose.Types.ObjectId(userIdParam);
    }

    const records = await Attendance.find(filter)
      .populate("userId", "name username email role department photoUrl shiftName shiftTime employmentType lastActiveAt")
      .sort({ date: -1, clockIn: -1 })
      .limit(safeLimit)
      .lean();

    // Build per-user aggregate map
    const userAggMap: Record<
      string,
      { name: string; email: string; role: string; department: string; daysPresent: number; totalRegular: number; totalOvertime: number; lastLogin: Date | null }
    > = {};

    records.forEach((r: any) => {
      const u = typeof r.userId === "object" ? r.userId : null;
      const uid = u?._id?.toString() ?? r.userId?.toString() ?? "unknown";
      if (!userAggMap[uid]) {
        userAggMap[uid] = {
          name: u?.name ?? "Employee",
          email: u?.email ?? "",
          role: u?.role ?? "Employee",
          department: u?.department ?? "General",
          daysPresent: 0,
          totalRegular: 0,
          totalOvertime: 0,
          lastLogin: null,
        };
      }
      userAggMap[uid].daysPresent += 1;
      userAggMap[uid].totalRegular += r.regularHours ?? 0;
      userAggMap[uid].totalOvertime += r.overtimeHours ?? 0;
      if (r.clockIn) {
        const ci = new Date(r.clockIn);
        if (!userAggMap[uid].lastLogin || ci > (userAggMap[uid].lastLogin as Date)) {
          userAggMap[uid].lastLogin = ci;
        }
      }
    });

    const userSummaries = Object.entries(userAggMap).map(([id, agg]) => ({
      userId: id,
      ...agg,
      totalRegular: Math.round(agg.totalRegular * 100) / 100,
      totalOvertime: Math.round(agg.totalOvertime * 100) / 100,
    }));

    return NextResponse.json({
      records,
      userSummaries,
      meta: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        total: records.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/attendance/summary error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
