import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HROnboarding } from "@/models/HROnboarding";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const query: any = { tenantId: tenantObjectId };
    if (type) query.type = type;

    if (session.role === "Employee") {
      query.userId = userObjectId;
    }

    const checklists = await HROnboarding.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ checklists });
  } catch (error: any) {
    console.error("GET /api/hr/checklists error:", error);
    return NextResponse.json({ error: "Failed to fetch checklists" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { userId, userName, userEmail, type, items, dueDate } = body;

    if (!userId || !userName || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const defaultItems = type === "Onboarding"
      ? [
          { id: "1", title: "Submit Identity & Address Proof", category: "Document", completed: false },
          { id: "2", title: "Sign Non-Disclosure Agreement (NDA)", category: "NDA", completed: false },
          { id: "3", title: "KRA & Job Description Sign-off", category: "KRA Sign-off", completed: false },
          { id: "4", title: "Issue Work Laptop & Access Pass", category: "IT Asset", completed: false },
          { id: "5", title: "Provision CRM & Email Accounts", category: "Access", completed: false },
        ]
      : [
          { id: "1", title: "Handover Project Repos & Documentation", category: "KRA Sign-off", completed: false },
          { id: "2", title: "Return Company Laptop & Hardware", category: "IT Asset", completed: false },
          { id: "3", title: "Revoke Cloud & CRM Access Permissions", category: "Access", completed: false },
          { id: "4", title: "Exit Interview & Feedback Submission", category: "Other", completed: false },
          { id: "5", title: "No Dues Clearance Certificate Sign-off", category: "Document", completed: false },
        ];

    const checklist = await HROnboarding.create({
      tenantId: tenantObjectId,
      userId,
      userName,
      userEmail: userEmail || "",
      type,
      status: "In Progress",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      items: items && items.length > 0 ? items : defaultItems,
    });

    return NextResponse.json({ checklist }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hr/checklists error:", error);
    return NextResponse.json({ error: "Failed to create checklist" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { checklistId, itemId, completed, notes } = body;

    const checklist = await HROnboarding.findOne({
      _id: checklistId,
      tenantId: tenantObjectId,
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const item = checklist.items.find((i: any) => i.id === itemId);
    if (item) {
      item.completed = completed;
      item.completedAt = completed ? new Date() : undefined;
      item.completedBy = session.userName;
      if (notes !== undefined) item.notes = notes;
    }

    const allDone = checklist.items.every((i: any) => i.completed);
    if (allDone) {
      checklist.status = "Completed";
      checklist.completedDate = new Date();
    } else {
      checklist.status = "In Progress";
    }

    await checklist.save();
    return NextResponse.json({ checklist });
  } catch (error: any) {
    console.error("PUT /api/hr/checklists error:", error);
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
}
