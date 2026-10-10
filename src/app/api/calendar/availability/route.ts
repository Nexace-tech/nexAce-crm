import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { Availability } from "@/models/Availability";
import { User } from "@/models/User";
import { RolePermission } from "@/models/RolePermission";
import { isSubAdminRole, normalizeRoleKey } from "@/lib/roles";
import mongoose from "mongoose";

const FULL_TIME_TYPES = ["Permanent", "Full-Time", "full-time", "permanent", "Full Time", "full time"];

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

    // Find all users who are NOT full-time (Freelancer, Part-Time, Contractor, Intern, etc.)
    const eligibleWorkers = await User.find({
      tenantId: tenantObjectId,
      status: { $ne: "Suspended" },
      employmentType: { $nin: FULL_TIME_TYPES },
    })
      .select("name email role employmentType photoUrl department")
      .sort({ name: 1 })
      .lean();

    const query: any = { tenantId: tenantObjectId };

    if (isElevated) {
      if (selectedUserId && selectedUserId !== "All") {
        query.userId = new mongoose.Types.ObjectId(selectedUserId);
      } else {
        // By default, query all eligible non-full-time users
        const workerIds = eligibleWorkers.map((w: any) => w._id);
        query.userId = { $in: workerIds };
      }
    } else {
      // Regular workers can strictly only view their own availability
      query.userId = userObjectId;
    }

    // Filter by year/month if provided (dateString starts with YYYY-MM)
    if (year && month !== null && month !== undefined && month !== "") {
      const monthPadded = String(Number(month) + 1).padStart(2, "0");
      const monthPrefix = `${year}-${monthPadded}`;
      query.dateString = { $regex: `^${monthPrefix}` };
    } else if (year) {
      query.dateString = { $regex: `^${year}` };
    }

    const availabilities = await Availability.find(query)
      .populate("userId", "name email role employmentType photoUrl department")
      .sort({ dateString: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      availabilities,
      eligibleWorkers: isElevated ? eligibleWorkers : [],
      isElevated,
      currentUserEmploymentType: currentUser.employmentType || "",
      isEligibleWorker: !FULL_TIME_TYPES.includes(currentUser.employmentType || ""),
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
    let hasElevatedPerm = false;
    let hasManagePerm = false;
    let canLogOwn = true;
    try {
      const rolePerm = await RolePermission.findOne({ tenantId: tenantObjectId, role: roleKey }).lean();
      if (rolePerm?.featurePermissions) {
        if (rolePerm.featurePermissions.viewTeamAvailability) hasElevatedPerm = true;
        if (rolePerm.featurePermissions.manageTeamAvailability) {
          hasManagePerm = true;
          hasElevatedPerm = true;
        }
        if (rolePerm.featurePermissions.logOwnAvailability !== undefined) {
          canLogOwn = Boolean(rolePerm.featurePermissions.logOwnAvailability);
        }
      }
    } catch (e) {}

    const isElevated =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      hasElevatedPerm;

    const canManageTeam =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      hasManagePerm;

    const body = await request.json();
    const { dateString, dates, status, startTime, endTime, hours, notes, targetUserId } = body;

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

    let finalUserId = userObjectId;
    if (targetUserId) {
      if (!canManageTeam) {
        return NextResponse.json({ error: "Unauthorized to update availability for other users" }, { status: 403 });
      }
      finalUserId = new mongoose.Types.ObjectId(targetUserId);
    } else {
      if (!canLogOwn && !canManageTeam) {
        return NextResponse.json({ error: "You do not have permission to record work availability" }, { status: 403 });
      }
      // Check if user is eligible (not full-time permanent)
      const isFullTime = FULL_TIME_TYPES.includes(currentUser.employmentType || "");
      if (isFullTime && !canManageTeam) {
        return NextResponse.json({
          error: "Availability scheduling is only applicable for Part-Time, Freelance, Contractor, and flexible staff.",
        }, { status: 403 });
      }
    }

    // Bulk upsert all selected dates
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
    let hasManagePerm = false;
    try {
      const rolePerm = await RolePermission.findOne({ tenantId: tenantObjectId, role: roleKey }).lean();
      if (rolePerm?.featurePermissions?.manageTeamAvailability) {
        hasManagePerm = true;
      }
    } catch (e) {}

    const canManageTeam =
      Boolean(currentUser.role && currentUser.role.trim().toLowerCase() === "admin") ||
      isSubAdminRole(currentUser.role) ||
      roleKey === "HR" ||
      hasManagePerm;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const dateString = searchParams.get("dateString");
    const datesParam = searchParams.get("dates");
    const targetUserId = searchParams.get("userId");

    const deleteFilter: any = { tenantId: tenantObjectId };

    if (id) {
      deleteFilter._id = new mongoose.Types.ObjectId(id);
      if (!canManageTeam) {
        deleteFilter.userId = userObjectId;
      }
      await Availability.deleteOne(deleteFilter);
    } else if (datesParam) {
      const datesArray = datesParam.split(",").map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
      deleteFilter.dateString = { $in: datesArray };
      if (targetUserId && canManageTeam) {
        deleteFilter.userId = new mongoose.Types.ObjectId(targetUserId);
      } else {
        deleteFilter.userId = userObjectId;
      }
      await Availability.deleteMany(deleteFilter);
    } else if (dateString) {
      deleteFilter.dateString = dateString;
      if (targetUserId && canManageTeam) {
        deleteFilter.userId = new mongoose.Types.ObjectId(targetUserId);
      } else {
        deleteFilter.userId = userObjectId;
      }
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
