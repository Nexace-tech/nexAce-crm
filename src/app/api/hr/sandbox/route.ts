import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRSandbox } from "@/models/HRSandbox";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const sandboxItems = await HRSandbox.find({ tenantId: tenantObjectId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ sandboxItems });
  } catch (error: any) {
    console.error("GET /api/hr/sandbox error:", error);
    return NextResponse.json({ error: "Failed to fetch HR sandbox configs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { name, description, workflowType, configJson } = body;

    if (!name || !workflowType || !configJson) {
      return NextResponse.json({ error: "Name, Workflow Type and Config are required" }, { status: 400 });
    }

    const sandbox = await HRSandbox.create({
      tenantId: tenantObjectId,
      name,
      description: description || "",
      workflowType,
      configJson,
      status: "Testing",
      createdBy: session.userName,
    });

    return NextResponse.json({ sandbox }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hr/sandbox error:", error);
    return NextResponse.json({ error: "Failed to create HR sandbox item" }, { status: 500 });
  }
}
