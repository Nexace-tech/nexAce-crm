import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRCase } from "@/models/HRCase";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;
    await connectToDatabase();

    const filter: any = { tenantId: tenantObjectId };
    if (session.role === "Employee") {
      filter.userId = authResult.userObjectId;
    }

    const cases = await HRCase.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ cases });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { category, subject, description, priority } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: "Subject and description are required" }, { status: 400 });
    }

    await connectToDatabase();

    const hrCase = await HRCase.create({
      userId: userObjectId,
      userName: session.userName,
      category: category || "Other",
      subject,
      description,
      priority: priority || "Medium",
      status: "Open",
      comments: [],
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ case: hrCase, message: "HR case created" }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;
    const body = await request.json();
    const { caseId, status, comment } = body;

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: any = {};
    if (status) updates.status = status;

    let hrCase;

    if (comment) {
      hrCase = await HRCase.findOneAndUpdate(
        { _id: caseId, tenantId: tenantObjectId },
        {
          ...updates,
          $push: {
            comments: {
              userId: userObjectId,
              userName: session.userName,
              content: comment,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      );
    } else {
      hrCase = await HRCase.findOneAndUpdate(
        { _id: caseId, tenantId: tenantObjectId },
        updates,
        { new: true }
      );
    }

    if (!hrCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    return NextResponse.json({ case: hrCase, message: "Case updated" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
