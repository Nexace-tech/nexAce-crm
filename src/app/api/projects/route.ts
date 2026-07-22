import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import mongoose from "mongoose";

/**
 * GET: Fetch tenant projects.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const projects = await Project.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    })
      .populate("members", "name role photoUrl")
      .sort({ createdAt: -1 });

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("API GET Projects error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new project (Restricted to Manager/Admin).
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManagerOrAdmin = session.role === "Admin" || session.role === "Manager";
    if (!isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, status, members } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const projectMembers = members
      ? members.map((id: string) => new mongoose.Types.ObjectId(id))
      : [new mongoose.Types.ObjectId(session.userId)];

    const newProject = await Project.create({
      name,
      description: description || "",
      status: status || "Planning",
      members: projectMembers,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Projects error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
