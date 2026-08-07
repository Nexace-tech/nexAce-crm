import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { ActivityLog } from "@/models/ActivityLog";
import mongoose from "mongoose";

/**
 * GET: Fetch tenant activity logs filterable by projectId.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    await connectToDatabase();

    const query: any = {
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    };

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    }

    const limitParam = searchParams.get("limit");
    const limit = limitParam === "all" ? 1000 : (limitParam ? Number(limitParam) : 500);

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET ActivityLog error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Record a new project/workspace activity log.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, session } = authResult;
    const body = await request.json();
    const { projectId, action, targetName, details } = body;

    if (!action || !targetName || !details) {
      return NextResponse.json({ error: "Action, targetName, and details are required" }, { status: 400 });
    }

    await connectToDatabase();

    const sanitize = (input: string) => input.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 1000);

    const newLog = await ActivityLog.create({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      projectId: projectId && mongoose.Types.ObjectId.isValid(projectId) ? new mongoose.Types.ObjectId(projectId) : undefined,
      userId: new mongoose.Types.ObjectId(session.userId),
      userName: session.userName,
      userRole: session.role,
      action: sanitize(action),
      targetName: sanitize(targetName),
      details: sanitize(details),
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST ActivityLog error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
