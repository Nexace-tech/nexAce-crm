import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Availability } from "@/models/Availability";
import { AvailabilityConfirmation } from "@/models/AvailabilityConfirmation";
import { User } from "@/models/User";
import { RolePermission } from "@/models/RolePermission";
import { isSubAdminRole, normalizeRoleKey } from "@/lib/roles";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const currentUser = await User.findById(userObjectId).lean();
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roleKey = normalizeRoleKey(currentUser.role);

    // Query tenant RBAC feature permissions
    let hasElevatedPerm = false;
    try {
      const rolePerm = await RolePermission.findOne({ tenantId: tenantObjectId, role: roleKey }).lean();
      if (rolePerm?.featurePermissions?.viewTeamAvailability || rolePerm?.featurePermissions?.manageTeamAvailability) {
        hasElevatedPerm = true;
      }
    } catch (e) {
      // Fallback to role defaults
    }

    const isElevated =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      hasElevatedPerm;

    const { searchParams } = new URL(request.url);
    const selectedUserId = searchParams.get("userId");
    const month = searchParams.get("month"); // 0-11
    const year = searchParams.get("year");   // e.g. 2026

    // Find all active employees in the tenant (excluding Admin, Sub-Admin, and HR)
    const eligibleWorkers = await User.find({
      tenantId: tenantObjectId,
      status: { $ne: "Suspended" },
      role: { $nin: ["Admin", "admin", "OPS", "ops", "Sub-Admin", "sub-admin", "SubAdmin", "subadmin", "HR", "hr"] },
    })
      .select("name email role employmentType photoUrl department shiftName shiftTime")
      .sort({ name: 1 })
      .lean();

    const query: any = { tenantId: tenantObjectId };

    if (isElevated) {
      if (selectedUserId && selectedUserId !== "All") {
        query.userId = new mongoose.Types.ObjectId(selectedUserId);
      } else {
        // By default, query all non-privileged employee availability records
        const workerIds = eligibleWorkers.map((w: any) => w._id);
        if (workerIds.length > 0) {
          query.userId = { $in: workerIds };
        }
      }
    } else {
      // Regular workers can strictly only view their own availability
      query.userId = userObjectId;
    }

    // Filter by year/month if provided (dateString starts with YYYY-MM)
    let monthPrefix = "";
    if (year && month !== null && month !== undefined && month !== "") {
      const monthPadded = String(Number(month) + 1).padStart(2, "0");
      monthPrefix = `${year}-${monthPadded}`;
      query.dateString = { $regex: `^${monthPrefix}` };
    } else if (year) {
      query.dateString = { $regex: `^${year}` };
    }

    const availabilities = await Availability.find(query)
      .populate("userId", "name email role employmentType photoUrl department")
      .sort({ dateString: 1 })
      .lean();

    // Fetch monthly confirmation status for queried users
    const confirmationsMap: Record<string, { confirmed: boolean; confirmedAt?: string }> = {};
    if (monthPrefix) {
      const userIdsToQuery = isElevated
        ? (selectedUserId && selectedUserId !== "All"
            ? [new mongoose.Types.ObjectId(selectedUserId)]
            : eligibleWorkers.map((w: any) => w._id))
        : [userObjectId];

      const confirmationDocs = await AvailabilityConfirmation.find({
        tenantId: tenantObjectId,
        monthKey: monthPrefix,
        userId: { $in: userIdsToQuery },
      }).lean();

      for (const doc of confirmationDocs) {
        confirmationsMap[String(doc.userId)] = {
          confirmed: Boolean(doc.confirmed),
          confirmedAt: doc.confirmedAt ? doc.confirmedAt.toISOString() : undefined,
        };
      }
    }

    const targetUserIdKey = isElevated && selectedUserId && selectedUserId !== "All"
      ? selectedUserId
      : String(userObjectId);

    const isMonthConfirmed = Boolean(confirmationsMap[targetUserIdKey]?.confirmed);

    const isRestrictedAdminOrHR =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      roleKey === "Admin" ||
      roleKey === "OPS";

    return NextResponse.json({
      success: true,
      availabilities,
      eligibleWorkers,
      isElevated,
      isRestrictedAdminOrHR,
      canEditAvailability: !isRestrictedAdminOrHR,
      confirmations: confirmationsMap,
      isMonthConfirmed,
      monthKey: monthPrefix,
      currentUserEmploymentType: currentUser.employmentType || "",
      isEligibleWorker: !isRestrictedAdminOrHR,
    });
  } catch (err: any) {
    console.error("GET /api/calendar/availability error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch availability" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const currentUser = await User.findById(userObjectId).lean();
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roleKey = normalizeRoleKey(currentUser.role);
    const isRestrictedAdminOrHR =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      roleKey === "Admin" ||
      roleKey === "OPS";

    // Admin, Sub-admin, and HR cannot update user availability
    if (isRestrictedAdminOrHR) {
      return NextResponse.json(
        { error: "Forbidden: Admin, Sub-admin, and HR cannot update user availability. Availability is strictly self-managed by each user." },
        { status: 403 }
      );
    }

    let canLogOwn = true;
    try {
      const rolePerm = await RolePermission.findOne({ tenantId: tenantObjectId, role: roleKey }).lean();
      if (rolePerm?.featurePermissions && rolePerm.featurePermissions.logOwnAvailability !== undefined) {
        canLogOwn = Boolean(rolePerm.featurePermissions.logOwnAvailability);
      }
    } catch (e) {}

    if (!canLogOwn) {
      return NextResponse.json({ error: "You do not have permission to record work availability" }, { status: 403 });
    }

    const body = await request.json();

    // Special Action: Monthly Confirmation
    if (body.action === "confirm-month" || body.action === "unconfirm-month") {
      const { monthKey, targetUserId, notes } = body;
      if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
        return NextResponse.json({ error: "Invalid monthKey. Must be YYYY-MM" }, { status: 400 });
      }

      if (targetUserId && String(targetUserId) !== String(userObjectId)) {
        return NextResponse.json({ error: "Forbidden: You can only confirm your own availability." }, { status: 403 });
      }

      const finalUserId = userObjectId;
      const isConfirm = body.action === "confirm-month";
      const confirmationDoc = await AvailabilityConfirmation.findOneAndUpdate(
        { tenantId: tenantObjectId, userId: finalUserId, monthKey },
        {
          $set: {
            tenantId: tenantObjectId,
            userId: finalUserId,
            monthKey,
            confirmed: isConfirm,
            confirmedAt: isConfirm ? new Date() : undefined,
            notes: notes ? String(notes).trim() : "",
          },
        },
        { upsert: true, new: true }
      );

      // Also set confirmed flag on all availability records for this month
      await Availability.updateMany(
        { tenantId: tenantObjectId, userId: finalUserId, dateString: { $regex: `^${monthKey}` } },
        { $set: { confirmed: isConfirm, confirmedAt: isConfirm ? new Date() : undefined } }
      );

      return NextResponse.json({
        success: true,
        confirmed: isConfirm,
        monthKey,
        confirmedAt: confirmationDoc.confirmedAt,
      });
    }

    const { dateString, dates, status, startTime, endTime, hours, notes, targetUserId, confirmed } = body;

    if (targetUserId && String(targetUserId) !== String(userObjectId)) {
      return NextResponse.json({ error: "Forbidden: You can only update your own availability." }, { status: 403 });
    }

    const targetDates: string[] = Array.isArray(dates) && dates.length > 0
      ? dates.filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      : dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)
      ? [dateString]
      : [];

    if (targetDates.length === 0) {
      return NextResponse.json({ error: "Please provide valid date(s) in YYYY-MM-DD format" }, { status: 400 });
    }

    if (!["Available", "Partial", "Unavailable"].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be Available, Partial, or Unavailable" }, { status: 400 });
    }

    const finalUserId = userObjectId;

    // Bulk upsert all selected dates
    const isRecordConfirmed = confirmed !== undefined ? Boolean(confirmed) : true;
    const bulkOps = targetDates.map((dStr) => {
      const dateObj = new Date(dStr + "T00:00:00.000Z");
      return {
        updateOne: {
          filter: { tenantId: tenantObjectId, userId: finalUserId, dateString: dStr },
          update: {
            $set: {
              tenantId: tenantObjectId,
              userId: finalUserId,
              date: dateObj,
              dateString: dStr,
              status,
              startTime: startTime ? String(startTime).trim() : "",
              endTime: endTime ? String(endTime).trim() : "",
              hours: Number(hours) || 0,
              notes: notes ? String(notes).trim() : "",
              confirmed: isRecordConfirmed,
              confirmedAt: isRecordConfirmed ? new Date() : undefined,
              createdBy: userObjectId,
            },
          },
          upsert: true,
        },
      };
    });

    await Availability.bulkWrite(bulkOps);

    return NextResponse.json({
      success: true,
      count: targetDates.length,
      dates: targetDates,
    });
  } catch (err: any) {
    console.error("POST /api/calendar/availability error:", err);
    return NextResponse.json({ error: err.message || "Failed to save availability" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const currentUser = await User.findById(userObjectId).lean();
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const roleKey = normalizeRoleKey(currentUser.role);
    const isRestrictedAdminOrHR =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      roleKey === "Admin" ||
      roleKey === "OPS";

    // Admin, Sub-admin, and HR cannot delete or clear user availability
    if (isRestrictedAdminOrHR) {
      return NextResponse.json(
        { error: "Forbidden: Admin, Sub-admin, and HR cannot delete or clear user availability. Availability is strictly self-managed by each user." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const dateString = searchParams.get("dateString");
    const datesParam = searchParams.get("dates");

    const deleteFilter: any = {
      tenantId: tenantObjectId,
      userId: userObjectId,
    };

    if (id) {
      deleteFilter._id = new mongoose.Types.ObjectId(id);
      await Availability.deleteOne(deleteFilter);
    } else if (datesParam) {
      const datesArray = datesParam.split(",").map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      deleteFilter.dateString = { $in: datesArray };
      await Availability.deleteMany(deleteFilter);
    } else if (dateString) {
      deleteFilter.dateString = dateString;
      await Availability.deleteOne(deleteFilter);
    } else {
      return NextResponse.json({ error: "Missing id, dateString, or dates" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Availability cleared" });
  } catch (err: any) {
    console.error("DELETE /api/calendar/availability error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete availability" }, { status: 500 });
  }
}
