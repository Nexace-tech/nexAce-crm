import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { getUserDataScope } from "@/lib/dataScope";
import mongoose from "mongoose";

/**
 * GET: Fetch tenant projects with role-based data scoping.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const dataScope = await getUserDataScope(session);

    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    if (dataScope.scope === "department") {
      const loggedUser = await User.findById(session.userId).lean();
      const userDept = loggedUser?.department;
      const userObjId = new mongoose.Types.ObjectId(session.userId);

      query.$or = [
        { members: userObjId },
        { createdBy: userObjId },
        { assignedDepartment: userDept },
      ];
    } else if (dataScope.scope === "own") {
      const userObjId = new mongoose.Types.ObjectId(session.userId);
      query.$or = [
        { members: userObjId },
        { createdBy: userObjId },
      ];
    }

    const projects = await Project.find(query)
      .populate("members", "name role photoUrl")
      .sort({ createdAt: -1 });

    return NextResponse.json({ projects });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Projects error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Create a new project.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataScope = await getUserDataScope(session);
    if (!dataScope.canViewFeature("createProjects") && session.role !== "Admin" && session.role !== "OPS") {
      return NextResponse.json({ error: "Forbidden: Create projects permission required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, status, priority, startDate, dueDate, cost, isInternal, requirements, assignType, assignedDepartment, members } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const projectMembers = members && Array.isArray(members)
      ? members.map((id: string) => new mongoose.Types.ObjectId(id))
      : [new mongoose.Types.ObjectId(session.userId)];

    const newProject = await Project.create({
      name,
      description: description || "",
      status: status || "Planning",
      priority: priority || "Medium",
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      cost: cost ? Number(cost) : 0,
      isInternal: Boolean(isInternal),
      requirements: requirements || "",
      assignType: assignType || "Member",
      assignedDepartment: assignedDepartment || "",
      members: projectMembers,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Projects error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
