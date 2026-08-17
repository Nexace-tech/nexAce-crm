import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRCase } from "@/models/HRCase";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify, notifyAdmins } from "@/lib/notify";

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

    // Notify Admin + HR that a new case was opened
    await notifyAdmins(tenantObjectId, {
      title: "New HR Case Opened",
      message: `${session.userName} opened a ${category || "General"} case: "${subject}"`,
      type: "hr",
      linkUrl: "/dashboard/hr",
    }, ["Admin", "HR"]);

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
        { returnDocument: 'after' }
      );
    } else {
      hrCase = await HRCase.findOneAndUpdate(
        { _id: caseId, tenantId: tenantObjectId },
        updates,
        { returnDocument: 'after' }
      );
    }

    if (!hrCase) return NextResponse.json({ error: "Case not found" }, { status: 404 });

    // Notify the case creator if an admin/HR changed the status
    if (status && hrCase.userId && hrCase.userId.toString() !== userObjectId.toString()) {
      await notify(tenantObjectId, hrCase.userId.toString(), {
        title: "Your HR Case Status Updated",
        message: `Your case "${hrCase.subject}" has been updated to '${status}'.`,
        type: "hr",
        linkUrl: "/dashboard/hr",
      });
    }

    return NextResponse.json({ case: hrCase, message: "Case updated" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
