import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { getUserDataScope } from "@/lib/dataScope";
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

    const dataScope = await getUserDataScope(session);

    // Base query: tenant ID constraint
    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId)
    };

    // Role-based data scoping:
    if (dataScope.scope === "department") {
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
      if (query.$and) {
        query.$and.push(deptCondition);
      } else {
        query.$or = deptCondition.$or;
      }
    }

    // Filter by search query if supplied
    if (search) {
      const searchRegex = new RegExp(search, "i");
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

    return NextResponse.json({ users }, {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=60"
      }
    });
  } catch (error: any) {
    console.error("API GET Team error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    const body = await request.json();
    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const defaultPasswordHash = await bcrypt.hash("password123", 10);

    // Check if bulk insert payload
    if (Array.isArray(body.members)) {
      if (body.members.length === 0) {
        return NextResponse.json({ error: "Members array cannot be empty" }, { status: 400 });
      }

      const createdUsers = [];
      const errors = [];

      for (let i = 0; i < body.members.length; i++) {
        const item = body.members[i];
        if (!item.name || !item.email) {
          errors.push(`Row ${i + 1}: Name and email are required`);
          continue;
        }

        const existingUser = await User.findOne({ email: item.email.toLowerCase() });
        if (existingUser) {
          errors.push(`Row ${i + 1} (${item.email}): User already exists`);
          continue;
        }

        const depts: string[] = Array.isArray(item.departments) && item.departments.length > 0
          ? item.departments
          : (item.department ? [item.department] : ["General"]);

        const newUser = await User.create({
          name: item.name.trim(),
          email: item.email.toLowerCase().trim(),
          passwordHash: defaultPasswordHash,
          role: item.role || "Employee",
          tenantId: tenantObjectId,
          department: depts[0] || "General",
          departments: depts,
          managerId: item.managerId ? new mongoose.Types.ObjectId(item.managerId) : undefined,
          skills: item.skills || [],
          bio: item.bio || "",
          phone: item.phone || "",
          photoUrl: item.photoUrl || "",
          status: "Active"
        });

        createdUsers.push(newUser);
      }

      return NextResponse.json({
        success: true,
        count: createdUsers.length,
        users: createdUsers,
        errors: errors.length > 0 ? errors : undefined
      }, { status: 201 });
    }

    // Single member insert payload
    const { name, email, role, department, departments, managerId, skills, bio, phone, photoUrl } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required fields" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: "An employee with this email already exists" }, { status: 400 });
    }

    const deptsList: string[] = Array.isArray(departments) && departments.length > 0
      ? departments
      : (department ? [department] : ["General"]);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: defaultPasswordHash,
      role: role || "Employee",
      tenantId: tenantObjectId,
      department: deptsList[0] || "General",
      departments: deptsList,
      managerId: managerId ? new mongoose.Types.ObjectId(managerId) : undefined,
      skills: skills || [],
      bio: bio || "",
      phone: phone || "",
      photoUrl: photoUrl || "",
      status: "Active"
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Team error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
