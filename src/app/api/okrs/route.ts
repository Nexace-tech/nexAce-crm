import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { OKR } from "@/models/OKR";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify } from "@/lib/notify";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const okrs = await OKR.find({ tenantId: tenantObjectId }).sort({ deadline: 1 }).lean();
    return NextResponse.json({ okrs });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { title, description, level, deadline, keyResults } = body;

    if (!title || !deadline) {
      return NextResponse.json({ error: "Title and deadline are required" }, { status: 400 });
    }

    await connectToDatabase();

    const okr = await OKR.create({
      tenantId: tenantObjectId,
      ownerId: userObjectId,
      ownerName: session.userName,
      title: title.trim(),
      description: description || "",
      level: level || "Company",
      deadline: new Date(deadline),
      keyResults: Array.isArray(keyResults) && keyResults.length > 0
        ? keyResults
        : [
            { title: "Key Milestone 1", targetValue: 100, currentValue: 0, unit: "%" },
            { title: "Key Milestone 2", targetValue: 100, currentValue: 0, unit: "%" },
          ],
      status: "On Track",
    });

    // Broadcast to all team members (Company-level OKRs affect everyone)
    await notify(tenantObjectId, "broadcast", {
      title: "New OKR Goal Created",
      message: `${session.userName} created a new ${level || "Team"} OKR: "${title}"`,
      type: "okr",
      linkUrl: "/dashboard/goals",
    });

    return NextResponse.json({ okr, message: "OKR created" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    const body = await request.json();
    const { okrId, status, keyResults, title, description, level, deadline } = body;

    if (!okrId) {
      return NextResponse.json({ error: "okrId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const okr = await OKR.findOne({ _id: okrId, tenantId: tenantObjectId });
    if (!okr) return NextResponse.json({ error: "OKR not found" }, { status: 404 });

    if (status !== undefined) okr.status = status;
    if (keyResults !== undefined) okr.keyResults = keyResults;
    if (title !== undefined) okr.title = title.trim();
    if (description !== undefined) okr.description = description;
    if (level !== undefined) okr.level = level;
    if (deadline !== undefined) okr.deadline = new Date(deadline);

    await okr.save();

    return NextResponse.json({ okr, message: "OKR updated" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    const { searchParams } = new URL(request.url);
    const okrId = searchParams.get("okrId");

    if (!okrId) return NextResponse.json({ error: "okrId required" }, { status: 400 });

    await connectToDatabase();
    await OKR.findOneAndDelete({ _id: okrId, tenantId: tenantObjectId });

    return NextResponse.json({ message: "OKR deleted" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
