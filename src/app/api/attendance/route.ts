import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/models/Attendance";
import { Tenant } from "@/models/Tenant";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { getUserDataScope } from "@/lib/dataScope";
import { parseClientTelemetry } from "@/lib/deviceDetector";
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

function getISTDayRangeForDate(d: Date): { start: Date; end: Date } {
  const istDayIndex = Math.floor((d.getTime() + IST_OFFSET_MS) / 86400000);
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

const POPULATE_EXTENSION_APPROVER = {
  path: "extensionApprovedBy",
  select: "name email role photoUrl",
  strictPopulate: false,
};

const POPULATE_EXTENSION_REJECTOR = {
  path: "extensionRejectedBy",
  select: "name email role photoUrl",
  strictPopulate: false,
};

const POPULATE_REGULARIZATION_APPROVER = {
  path: "regularizedBy",
  select: "name email role photoUrl",
  strictPopulate: false,
};

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
      .populate(POPULATE_EXTENSION_APPROVER)
      .populate(POPULATE_EXTENSION_REJECTOR)
      .populate(POPULATE_REGULARIZATION_APPROVER)
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
        .populate(POPULATE_EXTENSION_APPROVER)
        .populate(POPULATE_EXTENSION_REJECTOR)
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
        ? dynamicMaxShiftHours + (Number(todayAttendance.extensionAllocatedHours) || 0)
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
    const isElevatedRole = session.role === "Admin" || session.role === "OPS" || session.role === "Manager" || session.role === "HR" || dataScope.canViewFeature("viewTeamTimesheets") || dataScope.canViewFeature("viewAllShiftExtensions") || dataScope.canViewFeature("approveAdditionalShiftTime");

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
      .populate(POPULATE_EXTENSION_APPROVER)
      .populate(POPULATE_EXTENSION_REJECTOR)
      .populate(POPULATE_REGULARIZATION_APPROVER)
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
    const { action, location } = body;
    const targetAttendanceId = body.targetAttendanceId || body.attendanceId || body.recordId || body.id;
    const targetUserId = body.targetUserId || body.userId;
    const reason = body.reason || body.rejectionReason || body.extensionReason || body.regularizationReason || "";
    const requestedClockIn = body.requestedClockIn ? new Date(body.requestedClockIn) : undefined;
    const requestedClockOut = body.requestedClockOut ? new Date(body.requestedClockOut) : undefined;
    const targetDateStr = body.date || body.targetDate;

    const ALLOWED_ACTIONS = [
      "in", "out", "resume",
      "request_extension", "approve_extension", "reject_extension", "bulk_approve_extensions",
      "request_regularization", "approve_regularization", "reject_regularization", "bulk_approve_regularizations",
    ];

    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `Action must be one of: ${ALLOWED_ACTIONS.join(", ")}` }, { status: 400 });
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
      const telemetry = parseClientTelemetry(request);

      // Prevent duplicate clock-ins: check the FULL IST day range, not just exact date.
      // This catches any record regardless of what date normalization was used when it was stored.
      let existing = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      })
        .populate(POPULATE_EXTENSION_APPROVER)
        .populate(POPULATE_EXTENSION_REJECTOR);

      // Check for unclosed active shift from yesterday (<24h)
      if (!existing) {
        const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const unclosedYesterday = await Attendance.findOne({
          userId:   userObjectId,
          tenantId: tenantObjectId,
          date:     { $gte: yesterdayStart, $lt: dayStart },
          clockOut: { $exists: false },
        })
          .populate(POPULATE_EXTENSION_APPROVER)
          .populate(POPULATE_EXTENSION_REJECTOR);
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
        const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "Manager" || session.role === "HR" || dataScope.canViewFeature("approveAdditionalShiftTime");
        const workedHoursSoFar = (existing.regularHours || 0) + (existing.overtimeHours || 0);

        const effectiveMaxHours = existing.extensionApproved
          ? dynamicMaxShiftHours + (Number(existing.extensionAllocatedHours) || 0)
          : dynamicMaxShiftHours;

        if (workedHoursSoFar >= effectiveMaxHours && !isElevatedStaff && !existing.extensionApproved) {
          return NextResponse.json({
            error: `Maximum shift limit reached (${dynamicMaxShiftHours}h). You cannot resume without Admin, OPS, Manager, or HR approval. Please raise an additional shift time request.`,
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
        if (telemetry.ip && !existing.clockInIp) {
          existing.clockInIp = telemetry.ip;
        }
        if (!existing.clockInDevice?.type || existing.clockInDevice.type === "Unknown") {
          existing.clockInDevice = {
            type: telemetry.type,
            os: telemetry.os,
            browser: telemetry.browser,
            userAgent: telemetry.userAgent,
          };
        }
        await existing.save();
        await existing.populate(POPULATE_EXTENSION_APPROVER);
        await existing.populate(POPULATE_EXTENSION_REJECTOR);
        return NextResponse.json({ success: true, attendance: existing, message: "Shift resumed and merged with today's record!" });
      }

      const newRecord = await Attendance.create({
        userId:          userObjectId,
        date:            todayDate,
        clockIn:         now,
        originalClockIn: now, // preserved across all break/resume cycles
        clockInLocation: sanitizedLocation,
        clockInIp:       telemetry.ip,
        clockInDevice:   {
          type: telemetry.type,
          os: telemetry.os,
          browser: telemetry.browser,
          userAgent: telemetry.userAgent,
        },
        punchSource:     telemetry.type === "Mobile" ? "Mobile App" : "Web Portal",
        regularHours:    0,
        overtimeHours:   0,
        status:          "Present",
        tenantId:        tenantObjectId,
      });

      // Also ensure user model reflects latest punch telemetry
      User.findByIdAndUpdate(userObjectId, {
        lastLoginIp: telemetry.ip,
        lastLoginDevice: {
          type: telemetry.type,
          os: telemetry.os,
          browser: telemetry.browser,
          userAgent: telemetry.userAgent,
          lastActiveAt: new Date(),
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, attendance: newRecord }, { status: 201 });

    } else if (action === "out") {
      const telemetry = parseClientTelemetry(request);

      // Find today's record using range — immune to stored date format
      let record = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      })
        .populate(POPULATE_EXTENSION_APPROVER)
        .populate(POPULATE_EXTENSION_REJECTOR)
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
          .populate(POPULATE_EXTENSION_APPROVER)
          .populate(POPULATE_EXTENSION_REJECTOR)
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
      record.clockOutIp = telemetry.ip;
      record.clockOutDevice = {
        type: telemetry.type,
        os: telemetry.os,
        browser: telemetry.browser,
        userAgent: telemetry.userAgent,
      };

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
        ? dynamicMaxShiftHours + (Number(record.extensionAllocatedHours) || 0)
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
      // Also ensure user model reflects latest punch telemetry
      User.findByIdAndUpdate(userObjectId, {
        lastLoginIp: telemetry.ip,
        lastLoginDevice: {
          type: telemetry.type,
          os: telemetry.os,
          browser: telemetry.browser,
          userAgent: telemetry.userAgent,
          lastActiveAt: new Date(),
        },
      }).catch(() => {});

      await record.populate(POPULATE_EXTENSION_APPROVER);
      await record.populate(POPULATE_EXTENSION_REJECTOR);

      return NextResponse.json({ success: true, attendance: record });

    } else if (action === "resume") {
      const telemetry = parseClientTelemetry(request);

      // Find today's record using range
      let record = await Attendance.findOne({
        userId:   userObjectId,
        tenantId: tenantObjectId,
        date:     { $gte: dayStart, $lt: dayEnd },
      })
        .populate(POPULATE_EXTENSION_APPROVER)
        .populate(POPULATE_EXTENSION_REJECTOR)
        .sort({ clockIn: -1 });

      if (!record) {
        const yesterdayStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
        const unclosedYesterday = await Attendance.findOne({
          userId:   userObjectId,
          tenantId: tenantObjectId,
          date:     { $gte: yesterdayStart, $lt: dayStart },
        })
          .populate(POPULATE_EXTENSION_APPROVER)
          .populate(POPULATE_EXTENSION_REJECTOR)
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
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("approveAdditionalShiftTime");
      const workedHoursSoFar = (record.regularHours || 0) + (record.overtimeHours || 0);

      const effectiveMaxHours = record.extensionApproved
        ? dynamicMaxShiftHours + (Number(record.extensionAllocatedHours) || 0)
        : dynamicMaxShiftHours;

      if (workedHoursSoFar >= effectiveMaxHours && !isElevatedStaff && !record.extensionApproved) {
        return NextResponse.json({
          error: `Maximum shift limit reached (${dynamicMaxShiftHours}h). You cannot resume without Admin, OPS, HR, or Manager approval. Please raise an additional shift time request.`,
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
      if (telemetry.ip && !record.clockInIp) {
        record.clockInIp = telemetry.ip;
      }
      if (!record.clockInDevice?.type || record.clockInDevice.type === "Unknown") {
        record.clockInDevice = {
          type: telemetry.type,
          os: telemetry.os,
          browser: telemetry.browser,
          userAgent: telemetry.userAgent,
        };
      }
      await record.save();
      await record.populate(POPULATE_EXTENSION_APPROVER);
      await record.populate(POPULATE_EXTENSION_REJECTOR);

      return NextResponse.json({ success: true, attendance: record, message: "Shift resumed successfully!" });

    } else if (action === "approve_extension") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, HR, or Managers can approve shift time extensions" }, { status: 403 });
      }

      const filter: Record<string, unknown> = { tenantId: tenantObjectId };
      if (targetAttendanceId) {
        if (!mongoose.Types.ObjectId.isValid(String(targetAttendanceId))) {
          return NextResponse.json({ error: "Invalid targetAttendanceId format" }, { status: 400 });
        }
        filter._id = new mongoose.Types.ObjectId(String(targetAttendanceId));
      } else if (targetUserId) {
        if (!mongoose.Types.ObjectId.isValid(String(targetUserId))) {
          return NextResponse.json({ error: "Invalid targetUserId format" }, { status: 400 });
        }
        filter.userId = new mongoose.Types.ObjectId(String(targetUserId));
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
      recordToApprove.extensionRejected = false;
      recordToApprove.extensionRejectionReason = "";
      await recordToApprove.save();
      await recordToApprove.populate(POPULATE_EXTENSION_APPROVER);
      await recordToApprove.populate(POPULATE_EXTENSION_REJECTOR);

      // Send closed-loop in-app notification to employee
      try {
        await Notification.create({
          recipientId: recordToApprove.userId,
          tenantId: tenantObjectId,
          title: "✅ Shift Extension Approved",
          message: `Your manager approved a shift extension (+${allocatedHours}h). You can now resume your shift.`,
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      } catch (notifErr) {
        console.error("Failed to send extension approval notification:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: `Shift extension (+${allocatedHours}h) approved! User can now resume their shift.`,
        attendance: recordToApprove,
      });

    } else if (action === "reject_extension") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, HR, or Managers can decline shift time extensions" }, { status: 403 });
      }

      const filter: Record<string, unknown> = { tenantId: tenantObjectId };
      if (targetAttendanceId) {
        if (!mongoose.Types.ObjectId.isValid(String(targetAttendanceId))) {
          return NextResponse.json({ error: "Invalid targetAttendanceId format" }, { status: 400 });
        }
        filter._id = new mongoose.Types.ObjectId(String(targetAttendanceId));
      } else if (targetUserId) {
        if (!mongoose.Types.ObjectId.isValid(String(targetUserId))) {
          return NextResponse.json({ error: "Invalid targetUserId format" }, { status: 400 });
        }
        filter.userId = new mongoose.Types.ObjectId(String(targetUserId));
        filter.date = { $gte: dayStart, $lt: dayEnd };
      } else {
        return NextResponse.json({ error: "targetAttendanceId or targetUserId is required" }, { status: 400 });
      }

      const recordToReject = await Attendance.findOne(filter);
      if (!recordToReject) {
        return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
      }

      const rejectionReason = String(body.reason || body.rejectionReason || reason || "").trim() || "Shift extension request declined by manager.";

      recordToReject.extensionRequested = false;
      recordToReject.extensionRejected = true;
      recordToReject.extensionRejectedBy = userObjectId;
      recordToReject.extensionRejectedAt = now;
      recordToReject.extensionRejectionReason = rejectionReason;
      if (!recordToReject.extensionApproved) {
        recordToReject.extensionApproved = false;
      }
      await recordToReject.save();
      await recordToReject.populate(POPULATE_EXTENSION_APPROVER);
      await recordToReject.populate(POPULATE_EXTENSION_REJECTOR);

      // Send closed-loop notification to employee
      try {
        await Notification.create({
          recipientId: recordToReject.userId,
          tenantId: tenantObjectId,
          title: "❌ Shift Extension Declined",
          message: `Your shift extension request was declined. Reason: "${rejectionReason}"`,
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      } catch (notifErr) {
        console.error("Failed to send extension decline notification:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Shift extension request has been declined.",
        attendance: recordToReject,
      });

    } else if (action === "bulk_approve_extensions") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, HR, or Managers can approve shift extensions" }, { status: 403 });
      }

      const attendanceIds = body.attendanceIds || body.targetAttendanceIds || body.ids;
      if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
        return NextResponse.json({ error: "attendanceIds array is required" }, { status: 400 });
      }

      const validObjectIds = attendanceIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));

      const recordsToApprove = await Attendance.find({
        _id: { $in: validObjectIds },
        tenantId: tenantObjectId,
        extensionRequested: true,
      });

      let approvedCount = 0;
      const notificationsToCreate = [];

      for (const rec of recordsToApprove) {
        const allocated = rec.extensionRequestedHours && rec.extensionRequestedHours > 0
          ? Number(rec.extensionRequestedHours)
          : (Number(body.allocatedHours) || 1.0);

        rec.extensionApproved = true;
        rec.extensionApprovedBy = userObjectId;
        rec.extensionApprovedAt = now;
        rec.extensionAllocatedHours = allocated;
        rec.extensionRequested = false;
        rec.extensionRejected = false;
        rec.extensionRejectionReason = "";
        await rec.save();
        approvedCount++;

        notificationsToCreate.push({
          recipientId: rec.userId,
          tenantId: tenantObjectId,
          title: "✅ Shift Extension Approved",
          message: `Your manager approved a shift extension (+${allocated}h). You can now resume your shift.`,
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      }

      if (notificationsToCreate.length > 0) {
        try {
          await Notification.insertMany(notificationsToCreate);
        } catch (notifErr) {
          console.error("Failed to send bulk extension notifications:", notifErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully approved ${approvedCount} shift extension request(s).`,
        count: approvedCount,
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
      const submittedReason = String(reason || body.reason || "").trim() || "Shift extension requested for ongoing tasks.";

      record.extensionRequested = true;
      record.extensionRequestedHours = requestedHours;
      record.extensionReason = submittedReason;
      record.extensionRejected = false;
      record.extensionRejectionReason = "";
      await record.save();

      // Retrieve requesting employee details for enriched notifications
      const employee = await User.findById(userObjectId).select("name department role");
      const employeeName = employee?.name || session.userName || "Team Member";
      const employeeDept = employee?.department || "";

      // 1. Dispatch in-app notifications to Admin, OPS, HR, and Department Manager
      try {
        const reviewerQuery: Record<string, unknown> = {
          tenantId: tenantObjectId,
          _id: { $ne: userObjectId },
          status: { $ne: "Suspended" },
          $or: [
            { role: { $in: ["Admin", "SuperAdmin", "OPS", "HR"] } },
            ...(employeeDept ? [{ role: "Manager", department: employeeDept }] : [{ role: "Manager" }]),
          ],
        };

        const reviewers = await User.find(reviewerQuery).select("_id role");

        if (reviewers.length > 0) {
          const reviewerNotifications = reviewers.map((rev) => ({
            recipientId: rev._id,
            tenantId: tenantObjectId,
            title: `⏱ Shift Extension Request (+${requestedHours.toFixed(1)}h) — ${employeeName}`,
            message: `${employeeName}${employeeDept ? ` (${employeeDept})` : ""} requested +${requestedHours.toFixed(1)}h shift extension: "${submittedReason}". Please review and authorize.`,
            type: "hr",
            linkUrl: "/dashboard/calendar/extensions",
            adminOnly: ["Admin", "SuperAdmin", "OPS"].includes(rev.role),
          }));

          await Notification.insertMany(reviewerNotifications);
        }

        // 2. Dispatch confirmation notification to the employee
        await Notification.create({
          recipientId: userObjectId,
          tenantId: tenantObjectId,
          title: `⏱ Shift Extension Request Submitted (+${requestedHours.toFixed(1)}h)`,
          message: `Your request for +${requestedHours.toFixed(1)}h additional shift time was submitted and forwarded to Admin, OPS, and HR for approval.`,
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      } catch (notifErr) {
        console.error("Failed to dispatch extension request notifications:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: `Shift extension (+${requestedHours.toFixed(1)}h) request recorded successfully.`,
        requestedHours,
        attendance: record,
      });

    } else if (action === "request_regularization") {
      const targetDate = targetDateStr ? new Date(targetDateStr) : now;
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json({ error: "Invalid target date format" }, { status: 400 });
      }

      if (!reason || !String(reason).trim()) {
        return NextResponse.json({ error: "Reason for regularization is required" }, { status: 400 });
      }

      if (!requestedClockIn || isNaN(requestedClockIn.getTime())) {
        return NextResponse.json({ error: "Valid requestedClockIn time is required" }, { status: 400 });
      }

      if (requestedClockOut && isNaN(requestedClockOut.getTime())) {
        return NextResponse.json({ error: "Invalid requestedClockOut time format" }, { status: 400 });
      }

      if (requestedClockOut && requestedClockOut.getTime() <= requestedClockIn.getTime()) {
        return NextResponse.json({ error: "Requested clock out time must be after clock in time" }, { status: 400 });
      }

      const { start: dateStart, end: dateEnd } = getISTDayRangeForDate(targetDate);
      let record: any = null;

      if (targetAttendanceId && mongoose.Types.ObjectId.isValid(String(targetAttendanceId))) {
        record = await Attendance.findOne({
          _id: new mongoose.Types.ObjectId(String(targetAttendanceId)),
          tenantId: tenantObjectId,
          ...(session.role === "Admin" || session.role === "OPS" || session.role === "HR" ? {} : { userId: userObjectId }),
        });
      }

      if (!record) {
        record = await Attendance.findOne({
          userId: userObjectId,
          tenantId: tenantObjectId,
          date: { $gte: dateStart, $lt: dateEnd },
        });
      }

      if (!record) {
        // Create a new attendance record for regularizing an unlogged day
        record = new Attendance({
          userId: userObjectId,
          tenantId: tenantObjectId,
          date: dateStart,
          status: "Present",
          clockIn: requestedClockIn,
          clockOut: requestedClockOut,
          regularHours: 0,
          overtimeHours: 0,
        });
      }

      record.regularizationRequested = true;
      record.regularizationStatus = "Pending";
      record.regularizationReason = String(reason).trim();
      record.requestedClockIn = requestedClockIn;
      record.requestedClockOut = requestedClockOut;
      record.regularizationRejectionReason = "";
      await record.save();
      await record.populate(POPULATE_REGULARIZATION_APPROVER);

      // Dispatch notifications to Reviewers (Admin, HR, OPS, Manager)
      try {
        const employee = await User.findById(userObjectId).select("name department");
        const employeeName = employee?.name || "Team Member";
        const employeeDept = employee?.department || "";

        const reviewerQuery: Record<string, unknown> = {
          tenantId: tenantObjectId,
          _id: { $ne: userObjectId },
          status: { $ne: "Suspended" },
          $or: [
            { role: { $in: ["Admin", "SuperAdmin", "OPS", "HR"] } },
            ...(employeeDept ? [{ role: "Manager", department: employeeDept }] : [{ role: "Manager" }]),
          ],
        };

        const reviewers = await User.find(reviewerQuery).select("_id role");
        if (reviewers.length > 0) {
          const dateLabel = dateStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          const reviewerNotifications = reviewers.map((rev) => ({
            recipientId: rev._id,
            tenantId: tenantObjectId,
            title: `📝 Attendance Regularization Request — ${employeeName}`,
            message: `${employeeName}${employeeDept ? ` (${employeeDept})` : ""} submitted an attendance regularization request for ${dateLabel}. Reason: "${String(reason).trim()}".`,
            type: "hr",
            linkUrl: "/dashboard/calendar",
            adminOnly: ["Admin", "SuperAdmin", "OPS"].includes(rev.role),
          }));
          await Notification.insertMany(reviewerNotifications);
        }

        // Confirmation notification to employee
        await Notification.create({
          recipientId: userObjectId,
          tenantId: tenantObjectId,
          title: "📝 Regularization Request Submitted",
          message: "Your attendance regularization request has been submitted for management review.",
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      } catch (notifErr) {
        console.error("Failed to dispatch regularization request notifications:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Attendance regularization request submitted successfully.",
        attendance: record,
      });

    } else if (action === "approve_regularization") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("manageHR") || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, HR, or Managers can approve attendance regularization" }, { status: 403 });
      }

      if (!targetAttendanceId || !mongoose.Types.ObjectId.isValid(String(targetAttendanceId))) {
        return NextResponse.json({ error: "Valid targetAttendanceId is required" }, { status: 400 });
      }

      const recordToApprove = await Attendance.findOne({
        _id: new mongoose.Types.ObjectId(String(targetAttendanceId)),
        tenantId: tenantObjectId,
      });

      if (!recordToApprove) {
        return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
      }

      const tenant = await Tenant.findById(tenantObjectId).lean();
      const dynamicTargetHours = Number(tenant?.targetShiftHours) || SHIFT_TARGET_HOURS;

      // Apply requested punch times
      if (recordToApprove.requestedClockIn) {
        recordToApprove.clockIn = recordToApprove.requestedClockIn;
      }
      if (recordToApprove.requestedClockOut) {
        recordToApprove.clockOut = recordToApprove.requestedClockOut;
      }

      // Calculate worked hours
      if (recordToApprove.clockIn && recordToApprove.clockOut) {
        const totalDurationHours = Math.max(0, (new Date(recordToApprove.clockOut).getTime() - new Date(recordToApprove.clockIn).getTime()) / (1000 * 60 * 60));
        recordToApprove.regularHours = Number(Math.min(totalDurationHours, dynamicTargetHours).toFixed(2));
        recordToApprove.overtimeHours = Number(Math.max(0, totalDurationHours - dynamicTargetHours).toFixed(2));
      } else if (recordToApprove.clockIn && !recordToApprove.clockOut) {
        recordToApprove.regularHours = dynamicTargetHours;
        recordToApprove.overtimeHours = 0;
      }

      recordToApprove.status = "Present";
      recordToApprove.regularizationRequested = false;
      recordToApprove.regularizationStatus = "Approved";
      recordToApprove.regularizedBy = userObjectId;
      recordToApprove.regularizedAt = now;
      recordToApprove.regularizationRejectionReason = "";
      await recordToApprove.save();
      await recordToApprove.populate(POPULATE_REGULARIZATION_APPROVER);

      // Notify the employee
      try {
        await Notification.create({
          recipientId: recordToApprove.userId,
          tenantId: tenantObjectId,
          title: "✅ Attendance Regularization Approved",
          message: "Your attendance regularization request has been approved and your timesheet updated.",
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      } catch (notifErr) {
        console.error("Failed to send regularization approval notification:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Attendance regularization approved successfully.",
        attendance: recordToApprove,
      });

    } else if (action === "reject_regularization") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("manageHR") || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, HR, or Managers can decline attendance regularization" }, { status: 403 });
      }

      if (!targetAttendanceId || !mongoose.Types.ObjectId.isValid(String(targetAttendanceId))) {
        return NextResponse.json({ error: "Valid targetAttendanceId is required" }, { status: 400 });
      }

      const recordToReject = await Attendance.findOne({
        _id: new mongoose.Types.ObjectId(String(targetAttendanceId)),
        tenantId: tenantObjectId,
      });

      if (!recordToReject) {
        return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
      }

      const rejectionReason = String(body.reason || body.rejectionReason || reason || "").trim() || "Attendance regularization request declined by manager.";

      recordToReject.regularizationRequested = false;
      recordToReject.regularizationStatus = "Rejected";
      recordToReject.regularizedBy = userObjectId;
      recordToReject.regularizedAt = now;
      recordToReject.regularizationRejectionReason = rejectionReason;
      await recordToReject.save();
      await recordToReject.populate(POPULATE_REGULARIZATION_APPROVER);

      // Notify the employee
      try {
        await Notification.create({
          recipientId: recordToReject.userId,
          tenantId: tenantObjectId,
          title: "❌ Attendance Regularization Declined",
          message: `Your attendance regularization request was declined. Reason: "${rejectionReason}"`,
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      } catch (notifErr) {
        console.error("Failed to send regularization decline notification:", notifErr);
      }

      return NextResponse.json({
        success: true,
        message: "Attendance regularization request has been declined.",
        attendance: recordToReject,
      });

    } else if (action === "bulk_approve_regularizations") {
      const dataScope = await getUserDataScope(session);
      const isElevatedStaff = session.role === "Admin" || session.role === "OPS" || session.role === "HR" || session.role === "Manager" || dataScope.canViewFeature("manageHR") || dataScope.canViewFeature("approveAdditionalShiftTime");
      if (!isElevatedStaff) {
        return NextResponse.json({ error: "Forbidden: Only Admin, OPS, HR, or Managers can approve attendance regularization" }, { status: 403 });
      }

      const attendanceIds = body.attendanceIds || body.targetAttendanceIds || body.ids;
      if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) {
        return NextResponse.json({ error: "attendanceIds array is required" }, { status: 400 });
      }

      const validObjectIds = attendanceIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));

      const recordsToApprove = await Attendance.find({
        _id: { $in: validObjectIds },
        tenantId: tenantObjectId,
        regularizationRequested: true,
      });

      const tenant = await Tenant.findById(tenantObjectId).lean();
      const dynamicTargetHours = Number(tenant?.targetShiftHours) || SHIFT_TARGET_HOURS;

      let approvedCount = 0;
      const notificationsToCreate = [];

      for (const rec of recordsToApprove) {
        if (rec.requestedClockIn) {
          rec.clockIn = rec.requestedClockIn;
        }
        if (rec.requestedClockOut) {
          rec.clockOut = rec.requestedClockOut;
        }

        if (rec.clockIn && rec.clockOut) {
          const totalDurationHours = Math.max(0, (new Date(rec.clockOut).getTime() - new Date(rec.clockIn).getTime()) / (1000 * 60 * 60));
          rec.regularHours = Number(Math.min(totalDurationHours, dynamicTargetHours).toFixed(2));
          rec.overtimeHours = Number(Math.max(0, totalDurationHours - dynamicTargetHours).toFixed(2));
        } else if (rec.clockIn && !rec.clockOut) {
          rec.regularHours = dynamicTargetHours;
          rec.overtimeHours = 0;
        }

        rec.status = "Present";
        rec.regularizationRequested = false;
        rec.regularizationStatus = "Approved";
        rec.regularizedBy = userObjectId;
        rec.regularizedAt = now;
        rec.regularizationRejectionReason = "";
        await rec.save();
        approvedCount++;

        notificationsToCreate.push({
          recipientId: rec.userId,
          tenantId: tenantObjectId,
          title: "✅ Attendance Regularization Approved",
          message: "Your attendance regularization request has been approved in batch.",
          type: "hr",
          linkUrl: "/dashboard/calendar",
        });
      }

      if (notificationsToCreate.length > 0) {
        try {
          await Notification.insertMany(notificationsToCreate);
        } catch (notifErr) {
          console.error("Failed to insert bulk regularization notifications:", notifErr);
        }
      }

      return NextResponse.json({
        success: true,
        approvedCount,
        message: `Successfully approved ${approvedCount} regularization requests.`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Attendance error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
