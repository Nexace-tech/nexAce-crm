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
        // If already clocked in and shift is active
        if (!existing.clockOut) {
          return NextResponse.json({ error: "You are already clocked in for today" }, { status: 400 });
        }
        // If user already clocked out earlier today, automatically resume / merge shift:
        // Keep existing.clockIn intact (original clock-in), start new segment with lastResumedAt
        if (!existing.originalClockIn) {
          existing.originalClockIn = existing.clockIn;
        }
        existing.lastResumedAt = now;
        existing.clockOut      = undefined;
        await existing.save();
        return NextResponse.json({ success: true, attendance: existing, message: "Shift resumed and merged with today's record!" });
      }

      const newRecord = await Attendance.create({
        userId:          userObjectId,
        date:            todayDate,
        clockIn:         now,
        originalClockIn: now, // preserved across all break/resume cycles
        regularHours:    0,
        overtimeHours:   0,
        status:          "Present",
        tenantId:        tenantObjectId,
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

      let totalAccumulated: number;
      if (record.lastResumedAt) {
        // Shift was resumed: add this active segment duration onto previously accumulated hours
        const diffMs = Math.max(0, now.getTime() - new Date(record.lastResumedAt).getTime());
        const segmentHours = diffMs / (1000 * 60 * 60);
        const prevRegular  = record.regularHours  ?? 0;
        const prevOvertime = record.overtimeHours ?? 0;
        totalAccumulated = prevRegular + prevOvertime + segmentHours;
      } else {
        // Continuous shift directly from original clockIn
        const diffMs = Math.max(0, now.getTime() - new Date(record.clockIn).getTime());
        totalAccumulated = diffMs / (1000 * 60 * 60);
      }

      // Hard sanity guard: total worked hours on a single day can NEVER exceed elapsed time since clock-in
      const maxPossibleHours = Math.max(0, (now.getTime() - new Date(record.clockIn).getTime()) / (1000 * 60 * 60));
      const safeTotal = Math.min(totalAccumulated, maxPossibleHours);

      record.clockOut      = now;
      record.lastResumedAt = undefined;
      record.regularHours  = Number(Math.min(safeTotal, SHIFT_TARGET_HOURS).toFixed(2));
      record.overtimeHours = Number(Math.max(0, safeTotal - SHIFT_TARGET_HOURS).toFixed(2));
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

      // Resume:
      // DO NOT overwrite record.clockIn — it stays as the day's original clock-in time!
      // Set lastResumedAt = now to mark the start of this active work segment.
      if (!record.originalClockIn) {
        record.originalClockIn = record.clockIn;
      }

      record.lastResumedAt = now;
      record.clockOut      = undefined;
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
