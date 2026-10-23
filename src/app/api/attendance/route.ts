import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Tenant } from "@/models/Tenant";
import { getUserDataScope } from "@/lib/dataScope";
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

const SHIFT_TARGET_HOURS = 8.0;  // Regular hours target (before overtime kicks in)
const MAX_SHIFT_HOURS     = 10.0; // Hard cap — shift auto-clocks out at 10h

/**
 * GET: Returns the current user's today-attendance, shift metadata, and history.
 * Supports ?allUsers=true for Admins/Managers.
 */
export async function GET(request: Request) {
  try {
    // ✅ Performance: skip redundant DB re-validation — this route connects to DB itself
    const session = await getSession(true);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userObjectId   = new mongoose.Types.ObjectId(session.userId);
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const { start: dayStart, end: dayEnd } = getISTDayRange();

    // Use range query so both old (UTC-midnight) and new (IST-midnight) records are found
    let todayAttendance = await Attendance.findOne({
      userId:   userObjectId,
      tenantId: tenantObjectId,
      date: { $gte: dayStart, $lt: dayEnd },
    })
      .populate("extensionApprovedBy", "name email role photoUrl")
      .sort({ clockIn: -1 }); // prefer the latest if duplicates somehow exist

    // Overnight shift support: if no record exists for today, look for an active unclosed shift from the last 24h
    if (!todayAttendance) {
      const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
      const unclosedYesterday = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: yesterdayStart, $lt: dayStart },
        clockOut: { $exists: false },
      })
        .populate("extensionApprovedBy", "name email role photoUrl")
        .sort({ clockIn: -1 });

      if (unclosedYesterday) {
        todayAttendance = unclosedYesterday;
      }
    }

    const tenant = await Tenant.findById(tenantObjectId).lean();
    const dynamicTargetHours = Number(tenant?.targetShiftHours) || SHIFT_TARGET_HOURS;
    const dynamicMaxShiftHours = Number(tenant?.maxShiftHours) || MAX_SHIFT_HOURS;

    // Auto-clock out active session if actual worked hours exceed maximum allowed hours
    if (todayAttendance && !todayAttendance.clockOut) {
      const priorWorkedHours = (todayAttendance.regularHours || 0) + (todayAttendance.overtimeHours || 0);
      const activeSegmentStart = todayAttendance.lastResumedAt
        ? new Date(todayAttendance.lastResumedAt).getTime()
        : new Date(todayAttendance.clockIn).getTime();
      const currentSegmentHours = Math.max(0, (Date.now() - activeSegmentStart) / (1000 * 60 * 60));
      const totalWorkedHours = priorWorkedHours + currentSegmentHours;

      // If shift extension is approved, expand the max shift hours limit
      const effectiveMaxHours = todayAttendance.extensionApproved
        ? dynamicMaxShiftHours + (Number(todayAttendance.extensionAllocatedHours) || 1.0)
        : dynamicMaxShiftHours;

      if (totalWorkedHours >= effectiveMaxHours) {
        const remainingNeededHours = Math.max(0, effectiveMaxHours - priorWorkedHours);
        todayAttendance.clockOut = new Date(activeSegmentStart + remainingNeededHours * 3600 * 1000);
        todayAttendance.lastResumedAt = undefined;
        todayAttendance.regularHours = Number(Math.min(effectiveMaxHours, dynamicTargetHours).toFixed(2));
        todayAttendance.overtimeHours = Number(Math.max(0, effectiveMaxHours - dynamicTargetHours).toFixed(2));
        await todayAttendance.save();
      }
    }

    const { searchParams } = new URL(request.url);
    const limitParam    = searchParams.get("limit");
    const userIdParam   = searchParams.get("userId");
    const startStr      = searchParams.get("start") || searchParams.get("startDate");
    const endStr        = searchParams.get("end") || searchParams.get("endDate");

    const dataScope = await getUserDataScope(session);
    const isElevatedRole = session.role === "Admin" || session.role === "OPS" || session.role === "Manager" || session.role === "HR" || dataScope.canViewFeature("viewTeamTimesheets");

    const historyFilter: Record<string, unknown> = { tenantId: tenantObjectId };
    if (!isElevatedRole) {
      historyFilter.userId = userObjectId;
    } else if (userIdParam) {
      try {
        historyFilter.userId = new mongoose.Types.ObjectId(userIdParam);
      } catch {
        historyFilter.userId = userIdParam;
      }
    }

    if (startStr && endStr) {
      const startDateObj = new Date(startStr);
      startDateObj.setUTCHours(0, 0, 0, 0);
      const endDateObj = new Date(endStr);
      endDateObj.setUTCHours(23, 59, 59, 999);
      historyFilter.date = { $gte: startDateObj, $lte: endDateObj };
    }

    let historyQuery = Attendance.find(historyFilter)
      .populate("userId", "name email role department photoUrl shiftName shiftTime employmentType")
      .populate("extensionApprovedBy", "name email role photoUrl")
      .sort({ date: -1, clockIn: -1 });

    if (limitParam !== "all") {
      const parsedLimit = parseInt(limitParam ?? "1000", 10);
      const safeLimit   = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 2000) : 1000;
      historyQuery      = historyQuery.limit(safeLimit);
    }

    const history = await historyQuery.lean();

    const shiftInfo = {
      shiftName:    "Standard Regular Shift",
      startTime:    "09:00 AM",
      endTime:      "07:00 PM",
      targetHours:  dynamicTargetHours,
      maxHours:     dynamicMaxShiftHours,
      location:     "Office / Remote Hybrid",
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

    const body = await request.json().catch(() => ({}));
    const { action, location, targetAttendanceId, targetUserId, reason } = body;

    if (!action || !["in", "out", "resume", "request_extension", "approve_extension"].includes(action)) {
      return NextResponse.json({ error: "Action must be 'in', 'out', 'resume', 'request_extension', or 'approve_extension'" }, { status: 400 });
    }

    await connectToDatabase();

    const userObjectId   = new mongoose.Types.ObjectId(session.userId);
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const { start: dayStart, end: dayEnd } = getISTDayRange();
    const todayDate = getTodayDateNormalized();
    const now       = new Date();

    const sanitizedLocation = location?.latitude && location?.longitude ? {
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      accuracy: location.accuracy ? Number(location.accuracy) : undefined,
    } : undefined;

    if (action === "in") {
      // Prevent duplicate clock-ins: check the FULL IST day range, not just exact date.
      // This catches any record regardless of what date normalization was used when it was stored.
      let existing = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      }).populate("extensionApprovedBy", "name email role photoUrl");

      // Check for unclosed active shift from yesterday (<24h)
      if (!existing) {
        const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const unclosedYesterday = await Attendance.findOne({
          userId:   userObjectId,
          tenantId: tenantObjectId,
          date:     { $gte: yesterdayStart, $lt: dayStart },
          clockOut: { $exists: false },
        }).populate("extensionApprovedBy", "name email role photoUrl");
        if (unclosedYesterday) {
          existing = unclosedYesterday;
        }
      }

      if (existing) {
        // If already clocked in and shift is active
        if (!existing.clockOut) {
          return NextResponse.json({ error: "You are already clocked in for an active shift" }, { status: 400 });
        }

        const tenant = await Tenant.findById(tenantObjectId).lean();
        const dynamicMaxShiftHours = Number(tenant?.maxShiftHours) || MAX_SHIFT_HOURS;
        const dataScope = await getUserDataScope(session);
        const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || dataScope.canViewFeature("approveAdditionalShiftTime");
        const workedHoursSoFar = (existing.regularHours || 0) + (existing.overtimeHours || 0);

        const effectiveMaxHours = existing.extensionApproved
          ? dynamicMaxShiftHours + (Number(existing.extensionAllocatedHours) || 1.0)
          : dynamicMaxShiftHours;

        if (workedHoursSoFar >= effectiveMaxHours && !isElevatedStaff && !existing.extensionApproved) {
          return NextResponse.json({
            error: `Maximum shift limit reached (${dynamicMaxShiftHours}h). You cannot resume without Admin, OPS, or HR approval. Please raise an additional shift time request.`,
            maxLimitReached: true
          }, { status: 403 });
        }

        // If user already clocked out earlier, automatically resume / merge shift:
        // Keep existing.clockIn intact (original clock-in), start new segment with lastResumedAt
        if (!existing.originalClockIn) {
          existing.originalClockIn = existing.clockIn;
        }
        existing.lastResumedAt = now;
        existing.clockOut      = undefined;
        if (sanitizedLocation) {
          existing.clockInLocation = sanitizedLocation;
        }
        await existing.save();
        await existing.populate("extensionApprovedBy", "name email role photoUrl");
        return NextResponse.json({ success: true, attendance: existing, message: "Shift resumed and merged with today's record!" });
      }

      const newRecord = await Attendance.create({
        userId:          userObjectId,
        date:            todayDate,
        clockIn:         now,
        originalClockIn: now, // preserved across all break/resume cycles
        clockInLocation: sanitizedLocation,
        regularHours:    0,
        overtimeHours:   0,
        status:          "Present",
        tenantId:        tenantObjectId,
      });

      return NextResponse.json({ success: true, attendance: newRecord }, { status: 201 });

    } else if (action === "out") {
      // Find today's record using range — immune to stored date format
      let record = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      })
        .populate("extensionApprovedBy", "name email role photoUrl")
        .sort({ clockIn: -1 });

      // Overnight shift support: If no active record for today, look for an unclosed active shift from yesterday (<24h)
      if (!record || record.clockOut) {
        const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const unclosedYesterday = await Attendance.findOne({
          userId:   userObjectId,
          tenantId: tenantObjectId,
          date:     { $gte: yesterdayStart, $lt: dayStart },
          clockOut: { $exists: false },
        })
          .populate("extensionApprovedBy", "name email role photoUrl")
          .sort({ clockIn: -1 });

        if (unclosedYesterday) {
          record = unclosedYesterday;
        }
      }

      if (!record) {
        return NextResponse.json({ error: "No active clock-in record found for today or overnight shift" }, { status: 400 });
      }
      if (record.clockOut) {
        return NextResponse.json({ error: "You have already clocked out for today" }, { status: 400 });
      }

      if (sanitizedLocation) {
        record.clockOutLocation = sanitizedLocation;
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

      const tenant = await Tenant.findById(tenantObjectId).lean();
      const dynamicTargetHours = Number(tenant?.targetShiftHours) || SHIFT_TARGET_HOURS;
      const dynamicMaxShiftHours = Number(tenant?.maxShiftHours) || MAX_SHIFT_HOURS;

      // Allow extended hours if shift extension was approved
      const effectiveMaxHours = record.extensionApproved
        ? dynamicMaxShiftHours + (Number(record.extensionAllocatedHours) || 1.0)
        : dynamicMaxShiftHours;

      // Hard sanity guard: total worked hours on a single day can NEVER exceed elapsed time since clock-in
      const maxPossibleHours = Math.max(0, (now.getTime() - new Date(record.clockIn).getTime()) / (1000 * 60 * 60));
      // Enforce the dynamic max shift hours cap (with extension if approved)
      const safeTotal = Math.min(totalAccumulated, maxPossibleHours, effectiveMaxHours);

      record.clockOut      = now;
      record.lastResumedAt = undefined;
      record.regularHours  = Number(Math.min(safeTotal, dynamicTargetHours).toFixed(2));
      record.overtimeHours = Number(Math.max(0, safeTotal - dynamicTargetHours).toFixed(2));
      await record.save();
      await record.populate("extensionApprovedBy", "name email role photoUrl");

      return NextResponse.json({ success: true, attendance: record });

    } else if (action === "resume") {
      // Find today's record using range
      let record = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      })
        .populate("extensionApprovedBy", "name email role photoUrl")
        .sort({ clockIn: -1 });

      if (!record) {
        const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const unclosedYesterday = await Attendance.findOne({
          userId:   userObjectId,
          tenantId: tenantObjectId,
          date:     { $gte: yesterdayStart, $lt: dayStart },
        })
          .populate("extensionApprovedBy", "name email role photoUrl")
          .sort({ clockIn: -1 });
        if (unclosedYesterday) record = unclosedYesterday;
      }

      if (!record) {
        return NextResponse.json({ error: "No clock-in record found for today" }, { status: 400 });
      }
      if (!record.clockOut) {
        return NextResponse.json({ error: "Your shift is currently active" }, { status: 400 });
      }

      const tenant = await Tenant.findById(tenantObjectId).lean();
      const dynamicMaxShiftHours = Number(tenant?.maxShiftHours) || MAX_SHIFT_HOURS;
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || dataScope.canViewFeature("approveAdditionalShiftTime");
      const workedHoursSoFar = (record.regularHours || 0) + (record.overtimeHours || 0);

      const effectiveMaxHours = record.extensionApproved
        ? dynamicMaxShiftHours + (Number(record.extensionAllocatedHours) || 2.0)
        : dynamicMaxShiftHours;

      if (workedHoursSoFar >= effectiveMaxHours && !isElevatedStaff && !record.extensionApproved) {
        return NextResponse.json({
          error: `Maximum shift limit reached (${dynamicMaxShiftHours}h). You cannot resume without Admin, OPS, or HR approval. Please raise an additional shift time request.`,
          maxLimitReached: true
        }, { status: 403 });
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
      await record.populate("extensionApprovedBy", "name email role photoUrl");

      return NextResponse.json({ success: true, attendance: record, message: "Shift resumed successfully!" });

    } else if (action === "approve_extension") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, or HR can approve shift time extensions" }, { status: 403 });
      }

      const filter: Record<string, unknown> = { tenantId: tenantObjectId };
      if (targetAttendanceId) {
        filter._id = new mongoose.Types.ObjectId(targetAttendanceId);
      } else if (targetUserId) {
        filter.userId = new mongoose.Types.ObjectId(targetUserId);
        filter.date = { $gte: dayStart, $lt: dayEnd };
      } else {
        return NextResponse.json({ error: "targetAttendanceId or targetUserId is required" }, { status: 400 });
      }

      const recordToApprove = await Attendance.findOne(filter);
      if (!recordToApprove) {
        return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
      }

      let allocatedHours = 1.0;
      if (body.allocatedHours !== undefined && !isNaN(Number(body.allocatedHours)) && Number(body.allocatedHours) > 0) {
        allocatedHours = Number(body.allocatedHours);
      } else if (recordToApprove.extensionRequestedHours && recordToApprove.extensionRequestedHours > 0) {
        allocatedHours = Number(recordToApprove.extensionRequestedHours);
      }

      recordToApprove.extensionApproved = true;
      recordToApprove.extensionApprovedBy = userObjectId;
      recordToApprove.extensionApprovedAt = now;
      recordToApprove.extensionAllocatedHours = allocatedHours;
      recordToApprove.extensionRequested = false;
      await recordToApprove.save();
      await recordToApprove.populate("extensionApprovedBy", "name email role photoUrl");

      return NextResponse.json({
        success: true,
        message: `Shift extension (+${allocatedHours}h) approved! User can now resume their shift.`,
        attendance: recordToApprove,
      });

    } else if (action === "request_extension") {
      let record = await Attendance.findOne({
        userId: userObjectId,
        tenantId: tenantObjectId,
        date: { $gte: dayStart, $lt: dayEnd },
      }).sort({ clockIn: -1 });

      if (!record) {
        const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const unclosedYesterday = await Attendance.findOne({
          userId: userObjectId,
          tenantId: tenantObjectId,
          date: { $gte: yesterdayStart, $lt: dayStart },
          clockOut: { $exists: false },
        }).sort({ clockIn: -1 });
        if (unclosedYesterday) record = unclosedYesterday;
      }

      if (!record) {
        return NextResponse.json({ error: "No attendance record found for today" }, { status: 400 });
      }

      const requestedHours = Math.max(0.5, Math.min(8, Number(body.requestedHours) || 1.0));
      record.extensionRequested = true;
      record.extensionRequestedHours = requestedHours;
      record.extensionReason = String(reason || "").trim();
      await record.save();

      return NextResponse.json({
        success: true,
        message: `Shift extension (+${requestedHours}h) request recorded successfully.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Attendance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
