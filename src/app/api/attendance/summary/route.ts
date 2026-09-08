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

    // IST offset
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    // Helper: parse a YYYY-MM-DD param as IST day start (expressed in UTC)
    const parseISTDayStart = (yyyymmdd: string): Date => {
      const [y, m, d] = yyyymmdd.split("-").map(Number);
      // Build a UTC timestamp that represents midnight IST for that calendar date
      const utcMs = Date.UTC(y, m - 1, d) - IST_OFFSET_MS;
      return new Date(utcMs);
    };
    // End of IST day = start + 24h
    const parseISTDayEnd = (yyyymmdd: string): Date =>
      new Date(parseISTDayStart(yyyymmdd).getTime() + 86400000);

    // ------ Date range defaults: Mon of current IST week to end of today IST ------
    const nowIST     = new Date(Date.now() + IST_OFFSET_MS);
    const dayOfWeek  = nowIST.getUTCDay(); // 0=Sun in UTC but we've shifted to IST
    const daysBack   = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayIST  = new Date(nowIST.getTime() - daysBack * 86400000);
    // IST Monday midnight → UTC
    const defaultFrom = new Date(
      Date.UTC(mondayIST.getUTCFullYear(), mondayIST.getUTCMonth(), mondayIST.getUTCDate()) - IST_OFFSET_MS
    );
    // End of today IST
    const defaultTo = new Date(
      Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS + 86400000
    );

    const fromParam = searchParams.get("from");
    const toParam   = searchParams.get("to");

    const fromDate = fromParam ? parseISTDayStart(fromParam) : defaultFrom;
    const toDate   = toParam   ? parseISTDayEnd(toParam)     : defaultTo;

    const userIdParam = searchParams.get("userId");
    const limitParam  = parseInt(searchParams.get("limit") ?? "500", 10);
    const safeLimit   = Math.min(isNaN(limitParam) || limitParam <= 0 ? 500 : limitParam, 2000);

    // Build attendance query
    const filter: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      date: { $gte: fromDate, $lt: toDate },
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

    // Deduplicate same-IST-day records per user before aggregating
    // (handles legacy duplicate documents created by the old UTC-midnight normalization)
    const seenDayKeys = new Set<string>();

    records.forEach((r: any) => {
      const u = typeof r.userId === "object" ? r.userId : null;
      const uid = u?._id?.toString() ?? r.userId?.toString() ?? "unknown";

      // Compute IST calendar date string for this record
      const istDay = new Date(new Date(r.date).getTime() + IST_OFFSET_MS).toISOString().split("T")[0];
      const dayKey = `${uid}__${istDay}`;
      const isDuplicate = seenDayKeys.has(dayKey);

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

      // Only count daysPresent once per IST day
      if (!isDuplicate) {
        seenDayKeys.add(dayKey);
        userAggMap[uid].daysPresent += 1;
      }

      let reg = r.regularHours ?? 0;
      let ot = r.overtimeHours ?? 0;
      if (reg === 0 && ot === 0 && r.clockIn) {
        const endMs = r.clockOut && r.clockOut !== "Active" ? new Date(r.clockOut).getTime() : Date.now();
        const startMs = new Date(r.clockIn).getTime();
        const total = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
        reg = Math.min(total, 8.0);
        ot = Math.max(0, total - 8.0);
      }

      userAggMap[uid].totalRegular += reg;
      userAggMap[uid].totalOvertime += ot;
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
