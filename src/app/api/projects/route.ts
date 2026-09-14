import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { getUserDataScope } from "@/lib/dataScope";
import mongoose from "mongoose";

/**
 * GET: Fetch tenant projects with role-based data scoping.
 * Pass ?trash=true to fetch soft-deleted projects within the 30-day retention window.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const isTrash = searchParams.get("trash") === "true" || searchParams.get("trashed") === "true";

    const dataScope = await getUserDataScope(session);

    if (isTrash) {
      const isElevated =
        session.role === "Admin" ||
        session.role === "OPS" ||
        session.role === "Manager" ||
        dataScope.canViewFeature("deleteProjects");

      if (!isElevated) {
        return NextResponse.json({ error: "Forbidden: Only administrators can access project trash" }, { status: 403 });
      }

      // Fetch soft-deleted projects held within 30-day safety retention
      const trashed = await Project.find({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        isDeleted: true,
      })
        .populate("members", "name role photoUrl")
        .populate("deletedBy", "name email")
        .sort({ deletedAt: -1 })
        .lean();

      // Compute days remaining until permanent deletion
      const projects = trashed.map((p: any) => {
        const deletedTime = p.deletedAt ? new Date(p.deletedAt).getTime() : Date.now();
        const elapsedDays = Math.floor((Date.now() - deletedTime) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, 30 - elapsedDays);
        return {
          ...p,
          daysRemaining,
        };
      });

      return NextResponse.json({ projects });
    }

    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      isDeleted: { $ne: true },
    };

    // Also find any project IDs where the user has assigned tasks
    const { Task } = await import("@/models/Task");
    const assignedTasks = await Task.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      assignee: new mongoose.Types.ObjectId(session.userId),
      isDeleted: { $ne: true },
    }).select("projectId").lean();
    const assignedProjectIds = assignedTasks.map((t: any) => t.projectId).filter(Boolean);

    if (dataScope.scope === "department") {
      const loggedUser = await User.findById(session.userId).lean();
      const userDept = loggedUser?.department;
      const userObjId = new mongoose.Types.ObjectId(session.userId);

      query.$or = [
        { members: userObjId },
        { assignedDepartment: userDept },
        { _id: { $in: assignedProjectIds } },
      ];
    } else if (dataScope.scope === "own") {
      const userObjId = new mongoose.Types.ObjectId(session.userId);
      query.$or = [
        { members: userObjId },
        { _id: { $in: assignedProjectIds } },
      ];
    }

    const projects = await Project.find(query)
      .populate("members", "name role photoUrl")
      .sort({ createdAt: -1 })
      .lean();

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

    // Auto-sync into Operations Control (Client)
    try {
      const { Client } = await import("@/models/Client");
      const cleanName = (name || "").trim();
      const clientExists = await Client.findOne({
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        projectName: cleanName,
      });

      if (!clientExists) {
        const clientPhase =
          status === "In Progress"
            ? "In Delivery"
            : status === "On Hold"
            ? "On Hold"
            : status === "Completed"
            ? "Closed"
            : "In Delivery";

        await Client.create({
          tenantId: new mongoose.Types.ObjectId(session.tenantId),
          uploadedBy: new mongoose.Types.ObjectId(session.userId),
          name: cleanName,
          company: cleanName,
          clientAccount: description?.slice(0, 50) || "Operations Internal",
          projectId: `CLP-${Date.now().toString().slice(-4)}`,
          venture: assignedDepartment || "Ace Consultancys",
          projectName: cleanName,
          deliveryOwner: session.userName || "Operations Admin",
          phase: clientPhase,
          priority: priority === "Urgent" || priority === "High" ? "High" : "Medium",
          startDate: startDate ? new Date(startDate) : new Date(),
          targetEndDate: dueDate ? new Date(dueDate) : undefined,
          health: "Green",
          billingType: "Project",
          monthlyValue: Number(cost) || 15000,
          estHours: 40,
          actualHours: 0,
          progressPercent: 0,
          notes: description || "",
        });
      }
    } catch (e) {
      console.warn("Could not auto-create operations client:", e);
    }

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Projects error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
