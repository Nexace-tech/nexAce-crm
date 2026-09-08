import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import mongoose from "mongoose";

// IST offset constant
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

/**
 * Returns the start and end of the current IST calendar day as UTC Date objects.
 * Using a range query ($gte / $lt) instead of exact date equality makes the code
 * immune to any date-normalization format already stored in the DB.
 *
 * IST day start  = IST midnight expressed in UTC  (e.g. 2026-09-07T18:30:00Z for 8 Sept IST)
 * IST day end    = IST midnight + 24 h            (e.g. 2026-09-08T18:30:00Z for 8 Sept IST)
 */
function getISTDayRange(): { start: Date; end: Date } {
  const now = new Date();
  const istDayIndex = Math.floor((now.getTime() + IST_OFFSET_MS) / 86400000);
  const start = new Date(istDayIndex * 86400000 - IST_OFFSET_MS);
  const end   = new Date(start.getTime() + 86400000);
  return { start, end };
}

/** Canonical IST-midnight Date to store as the `date` field for new records. */
function getTodayDateNormalized(): Date {
  return getISTDayRange().start;
}

const SHIFT_TARGET_HOURS = 8.0;

/**
 * GET: Returns the current user's today-attendance, shift metadata, and history.
 * Supports ?allUsers=true for Admins/Managers.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userObjectId   = new mongoose.Types.ObjectId(session.userId);
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const { start: dayStart, end: dayEnd } = getISTDayRange();

    // Use range query so both old (UTC-midnight) and new (IST-midnight) records are found
    const todayAttendance = await Attendance.findOne({
      userId:   userObjectId,
      tenantId: tenantObjectId,
      date: { $gte: dayStart, $lt: dayEnd },
    }).sort({ clockIn: -1 }); // prefer the latest if duplicates somehow exist

    const { searchParams } = new URL(request.url);
    const limitParam    = searchParams.get("limit");

    const isElevatedRole = session.role === "Admin" || session.role === "OPS" || session.role === "Manager";

    const historyFilter: Record<string, unknown> = { tenantId: tenantObjectId };
    if (!isElevatedRole) {
      historyFilter.userId = userObjectId;
    }

    let historyQuery = Attendance.find(historyFilter)
      .populate("userId", "name email role department photoUrl shiftName shiftTime employmentType")
      .sort({ date: -1, clockIn: -1 });

    if (limitParam !== "all") {
      const parsedLimit = parseInt(limitParam ?? "50", 10);
      const safeLimit   = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 500) : 50;
      historyQuery      = historyQuery.limit(safeLimit);
    }

    const history = await historyQuery.lean();

    const shiftInfo = {
      shiftName:   "Standard Regular Shift",
      startTime:   "09:00 AM",
      endTime:     "05:00 PM",
      targetHours: SHIFT_TARGET_HOURS,
      location:    "Office / Remote Hybrid",
    };

    return NextResponse.json({ attendance: todayAttendance, history, shiftInfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Attendance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Clock in, Clock out, or Resume shift.
 * Body: { action: 'in' | 'out' | 'resume' }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body     = await request.json();
    const { action } = body;

    if (!action || !["in", "out", "resume"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'in', 'out', or 'resume'" }, { status: 400 });
    }

    await connectToDatabase();

    const userObjectId   = new mongoose.Types.ObjectId(session.userId);
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const { start: dayStart, end: dayEnd } = getISTDayRange();
    const todayDate = getTodayDateNormalized();
    const now       = new Date();

    if (action === "in") {
      // Prevent duplicate clock-ins: check the FULL IST day range, not just exact date.
      // This catches any record regardless of what date normalization was used when it was stored.
      const existing = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      });

      if (existing) {
        return NextResponse.json({ error: "You are already clocked in for today" }, { status: 400 });
      }

      const newRecord = await Attendance.create({
        userId:        userObjectId,
        date:          todayDate,
        clockIn:       now,
        regularHours:  0,
        overtimeHours: 0,
        status:        "Present",
        tenantId:      tenantObjectId,
      });

      return NextResponse.json({ success: true, attendance: newRecord }, { status: 201 });

    } else if (action === "out") {
      // Find today's record using range — immune to stored date format
      const record = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      }).sort({ clockIn: -1 });

      if (!record) {
        return NextResponse.json({ error: "No clock-in record found for today" }, { status: 400 });
      }
      if (record.clockOut) {
        return NextResponse.json({ error: "You have already clocked out for today" }, { status: 400 });
      }

      const diffMs     = now.getTime() - new Date(record.clockIn).getTime();
      const segmentHours = Math.max(0, diffMs / (1000 * 60 * 60));

      // Add this segment's hours on top of any hours preserved from previous segments (break/resume cycles)
      const prevRegular  = record.regularHours  ?? 0;
      const prevOvertime = record.overtimeHours ?? 0;
      const totalAccumulated = prevRegular + prevOvertime + segmentHours;

      record.clockOut      = now;
      record.regularHours  = Number(Math.min(totalAccumulated, SHIFT_TARGET_HOURS).toFixed(2));
      record.overtimeHours = Number(Math.max(0, totalAccumulated - SHIFT_TARGET_HOURS).toFixed(2));
      await record.save();

      return NextResponse.json({ success: true, attendance: record });

    } else if (action === "resume") {
      // Find today's record using range
      const record = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      }).sort({ clockIn: -1 });

      if (!record) {
        return NextResponse.json({ error: "No clock-in record found for today" }, { status: 400 });
      }
      if (!record.clockOut) {
        return NextResponse.json({ error: "Your shift is currently active" }, { status: 400 });
      }

      // Resume: preserve all hours accumulated so far, then set clockIn = now
      // so the next clock-out only measures the duration of this new segment.
      // The preserved hours will be added to the new segment's hours on clock-out.
      const preservedRegular  = record.regularHours  ?? 0;
      const preservedOvertime = record.overtimeHours ?? 0;

      record.clockIn       = now;   // mark start of the new segment
      record.clockOut      = undefined;
      record.regularHours  = preservedRegular;   // keep — clock-out will add on top
      record.overtimeHours = preservedOvertime;  // keep — clock-out will add on top
      await record.save();

      return NextResponse.json({ success: true, attendance: record, message: "Shift resumed successfully!" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Attendance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
