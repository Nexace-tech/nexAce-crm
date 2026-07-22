import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import mongoose from "mongoose";

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

    await connectToDatabase();

    // Base query: only users belonging to the logged-in user's tenant
    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId)
    };

    // Filter by department if supplied
    if (department && department !== "All") {
      query.department = department;
    }

    // Filter by search query if supplied (matches name, email, or skills)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { skills: searchRegex },
        { department: searchRegex }
      ];
    }

    // Find users and populate their manager's details
    const users = await User.find(query)
      .select("-passwordHash")
      .populate("managerId", "name email role photoUrl")
      .sort({ name: 1 });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("API GET Team error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new employee in the tenant (Restricted to Admin users).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role-based permission check: Admin only
    if (session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, department, managerId, skills, bio, phone, photoUrl } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "An employee with this email already exists" }, { status: 400 });
    }

    // Create user. In a real application, we would email them a setup link.
    // For now, we will set a default password that they can change.
    const defaultPasswordHash = await import("bcryptjs").then(async (bcrypt) => {
      return await bcrypt.hash("password123", 10);
    });

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash: defaultPasswordHash,
      role: role || "Employee",
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      department,
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
