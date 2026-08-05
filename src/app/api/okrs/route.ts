import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { OKR } from "@/models/OKR";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const okrs = await OKR.find({ tenantId: tenantObjectId }).sort({ deadline: 1 });
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
      title,
      description: description || "",
      level: level || "Team",
      ownerId: userObjectId,
      ownerName: session.userName,
      deadline: new Date(deadline),
      status: "On Track",
      keyResults: keyResults || [],
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ okr, message: "OKR created" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;
    const body = await request.json();
    const { okrId, status, keyResults, title, description, level, deadline } = body;

    if (!okrId) {
      return NextResponse.json({ error: "okrId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: any = {};
    if (status) updates.status = status;
    if (keyResults) updates.keyResults = keyResults;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (level) updates.level = level;
    if (deadline) updates.deadline = new Date(deadline);

    const okr = await OKR.findOneAndUpdate(
      { _id: okrId, tenantId: tenantObjectId },
      updates,
      { new: true }
    );

    if (!okr) return NextResponse.json({ error: "OKR not found" }, { status: 404 });
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
