import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Attendance } from "@/models/Attendance";
import { Notification } from "@/models/Notification";
import { getUserDataScope } from "@/lib/dataScope";
import { canAssignRole, isSubAdminRole } from "@/lib/roles";
import { generateSecurePassword } from "@/lib/utils";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * GET: Fetch the list of employees belonging to the tenant.
 * Supports filters: ?department=... &search=...
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const search = searchParams.get("search");
    const all = searchParams.get("all") === "true";

    const dataScope = await getUserDataScope(session);

    if (!dataScope.canViewModule("team")) {
      return NextResponse.json({ error: "Forbidden: Team module access disabled" }, { status: 403 });
    }

    // Base query: tenant ID constraint
    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId)
    };

    // Role-based data scoping (skipped when all=true for workspace chat/directory):
    if (!all && dataScope.scope === "department") {
      // Logged-in user's own profile to get department & ID
      const loggedUser = await User.findById(session.userId).lean();
      const userDept = loggedUser?.department;
      const userObjId = new mongoose.Types.ObjectId(session.userId);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { _id: userObjId },
          { managerId: userObjId },
          { department: userDept },
          { departments: userDept },
          { role: { $in: ["Admin", "OPS", "Sub Admin"] } },
        ]
      });
    } else if (dataScope.scope === "own") {
      query._id = new mongoose.Types.ObjectId(session.userId);
    }

    // Filter by department if supplied
    if (department && department !== "All") {
      const deptCondition = {
        $or: [
          { department: department },
          { departments: department }
        ]
      };
      // Always use $and to avoid overwriting any existing $or clause
      query.$and = query.$and || [];
      query.$and.push(deptCondition);
    }

    // Filter by search query if supplied
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      const searchConditions = [
        { name: searchRegex },
        { email: searchRegex },
        { skills: searchRegex },
        { department: searchRegex },
        { departments: searchRegex }
      ];

      query.$and = query.$and || [];
      query.$and.push({ $or: searchConditions });
    }

    // Find users and populate their manager's details using lean() for ultra-fast query execution
    const users = await User.find(query)
      .select("-passwordHash")
      .populate("managerId", "name email role photoUrl")
      .sort({ name: 1 })
      .lean();

    // Attach today's live shift attendance status
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendances = await Attendance.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      date: { $gte: todayStart, $lte: todayEnd }
    }).lean();

    const attendanceMap: Record<string, any> = {};
    todayAttendances.forEach((att) => {
      attendanceMap[att.userId.toString()] = att;
    });

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    const usersWithAttendance = users.map((u: any) => {
      const att = attendanceMap[u._id.toString()];
      const isClockedIn = Boolean(att && att.clockIn && !att.clockOut);
      const isSelf = u._id.toString() === session.userId;
      const isRecentlyActive = u.lastActiveAt ? new Date(u.lastActiveAt) >= fiveMinsAgo : false;
      const isOnline = isSelf || isClockedIn || isRecentlyActive;

      return {
        ...u,
        isOnline,
        isClockedIn,
        clockInTime: att?.clockIn || null,
        clockOutTime: att?.clockOut || null,
        attendanceStatus: isClockedIn ? "Active" : att?.clockOut ? "Shift Ended" : "Off Shift"
      };
    });

    return NextResponse.json({ users: usersWithAttendance }, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate"
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Team error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create single or multiple team members (Restricted to Admin/Manager).
 * Supports body format:
 * - Single member: { name, email, role, department, departments, managerId, skills, ... }
 * - Bulk members: { members: [ { name, email, role, department, departments, ... }, ... ] }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPrivileged = session.role === "Admin" || session.role === "Manager" || isSubAdminRole(session.role);
    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: Admins, Managers, or Operations Admins only" }, { status: 403 });
    }

    const body = await request.json();
    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // Helper: generate a strong, unique one-time password for each provisioned account
    const provisionPassword = async () => {
      const tempPassword = generateSecurePassword(12);
      const hash = await bcrypt.hash(tempPassword, 10);
      return { tempPassword, hash };
    };

    // Check if bulk insert payload
    if (Array.isArray(body.members)) {
      if (body.members.length === 0) {
        return NextResponse.json({ error: "Members array cannot be empty" }, { status: 400 });
      }

      const createdUsers = [];
      const tempPasswords: Record<string, string> = {};
      const errors = [];

      for (let i = 0; i < body.members.length; i++) {
        const item = body.members[i];
        if (!item.name || !item.email) {
          errors.push(`Row ${i + 1}: Name and email are required`);
          continue;
        }

        // Privilege-escalation guard: prevent assigning Admin/OPS unless caller is Admin/OPS
        const memberRole = (item.role || "Employee") as string;
        if (!canAssignRole(session.role, memberRole)) {
          errors.push(`Row ${i + 1} (${item.email}): your role cannot assign the '${memberRole}' role`);
          continue;
        }

        const existingUser = await User.findOne({ email: item.email.toLowerCase().trim(), tenantId: tenantObjectId });
        if (existingUser) {
          errors.push(`Row ${i + 1} (${item.email}): User already exists in this workspace`);
          continue;
        }

        // Duplicate name check (case-insensitive, within same tenant)
        const existingName = await User.findOne({
          tenantId: tenantObjectId,
          name: { $regex: `^${item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
        });
        if (existingName) {
          errors.push(`Row ${i + 1}: An employee named '${item.name.trim()}' already exists in this workspace`);
          continue;
        }

        const depts: string[] = Array.isArray(item.departments) && item.departments.length > 0
          ? item.departments
          : (item.department ? [item.department] : ["General"]);

        const { tempPassword, hash } = await provisionPassword();

        const newUser = await User.create({
          name: item.name.trim(),
          email: item.email.toLowerCase().trim(),
          passwordHash: hash,
          role: memberRole,
          tenantId: tenantObjectId,
          department: depts[0] || "General",
          departments: depts,
          managerId: item.managerId ? new mongoose.Types.ObjectId(item.managerId) : undefined,
          skills: item.skills || [],
          bio: item.bio || "",
          phone: item.phone || "",
          photoUrl: item.photoUrl || "",
          employmentType: item.employmentType || "Permanent",
          salary: Number(item.salary) || 0,
          status: "Active",
          forcePasswordReset: true,
        });

        tempPasswords[newUser.email] = tempPassword;
        // Never return the passwordHash to the client
        const { passwordHash: _ph, ...safeUser } = newUser.toObject();
        createdUsers.push(safeUser);
      }

      // Notify only Admin users about bulk employee addition
      if (createdUsers.length > 0) {
        const creatorUser = await User.findById(session.userId).select("name");
        const senderName = creatorUser?.name || session.userName || "Admin";

        const notifyRoles = await User.find({
          tenantId: tenantObjectId,
          role: { $in: ["Admin"] },
          status: "Active",
        }).select("_id");

        const addedNames = createdUsers.map((u: any) => u.name).join(", ");
        const notifDocs = notifyRoles.map((r: any) => ({
          tenantId: tenantObjectId,
          recipientId: r._id,
          title: `${createdUsers.length} New Employee(s) Added`,
          message: `${senderName} added ${createdUsers.length} new employee(s): ${addedNames}.`,
          type: "system",
          linkUrl: "/dashboard/team",
          read: false,
          adminOnly: true,
        }));
        if (notifDocs.length > 0) await Notification.insertMany(notifDocs);
      }

      return NextResponse.json({
        success: true,
        count: createdUsers.length,
        users: createdUsers,
        tempPasswords,
        errors: errors.length > 0 ? errors : undefined
      }, { status: 201 });
    }

    // Single member insert payload
    const { name, email, role, department, departments, managerId, skills, bio, phone, photoUrl, employmentType, salary } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required fields" }, { status: 400 });
    }

    // Privilege-escalation guard: only Admin/OPS may grant Admin/OPS roles
    const validatedRole = (role || "Employee") as string;
    if (!canAssignRole(session.role, validatedRole)) {
      return NextResponse.json(
        { error: `Forbidden: your role cannot assign the '${validatedRole}' role` },
        { status: 403 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim(), tenantId: tenantObjectId });
    if (existingUser) {
      return NextResponse.json({ error: "An employee with this email already exists in this workspace" }, { status: 400 });
    }

    // Duplicate name check (case-insensitive, within same tenant)
    const existingName = await User.findOne({
      tenantId: tenantObjectId,
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
    });
    if (existingName) {
      return NextResponse.json({ error: `An employee named '${name.trim()}' already exists in this workspace. Please use a different name.` }, { status: 400 });
    }

    const deptsList: string[] = Array.isArray(departments) && departments.length > 0
      ? departments
      : (department ? [department] : ["General"]);

    const { tempPassword, hash } = await provisionPassword();

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      role: validatedRole,
      tenantId: tenantObjectId,
      department: deptsList[0] || "General",
      departments: deptsList,
      managerId: managerId ? new mongoose.Types.ObjectId(managerId) : undefined,
      skills: skills || [],
      bio: bio || "",
      phone: phone || "",
      photoUrl: photoUrl || "",
      employmentType: employmentType || "Permanent",
      salary: Number(salary) || 0,
      status: "Active",
      forcePasswordReset: true,
    });

    // Notify only Admin users about new employee
    const creatorUser = await User.findById(session.userId).select("name");
    const senderName = creatorUser?.name || session.userName || "Admin";

    const notifyRoles = await User.find({
      tenantId: tenantObjectId,
      role: { $in: ["Admin"] },
      status: "Active",
    }).select("_id");

    const notifDocs = notifyRoles.map((r: any) => ({
      tenantId: tenantObjectId,
      recipientId: r._id,
      title: "New Employee Added",
      message: `${senderName} added a new employee: ${name.trim()} (${validatedRole}).`,
      type: "system",
      linkUrl: "/dashboard/team",
      read: false,
      adminOnly: true,
    }));
    if (notifDocs.length > 0) await Notification.insertMany(notifDocs);

    // Never return the passwordHash to the client; hand the one-time password to the caller
    const { passwordHash: _ph, ...safeUser } = newUser.toObject();
    return NextResponse.json({ success: true, user: safeUser, tempPassword }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Team error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
