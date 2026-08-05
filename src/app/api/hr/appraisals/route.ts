import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRAppraisal } from "@/models/HRAppraisal";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const query: any = { tenantId: tenantObjectId };

    if (session.role === "Employee") {
      query.userId = userObjectId;
    }

    const appraisals = await HRAppraisal.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ appraisals });
  } catch (error: unknown) {
    console.error("GET /api/hr/appraisals error:", error);
    return NextResponse.json({ error: "Failed to fetch appraisals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { userId, userName, managerId, managerName, cycle, type, kras, probationEndDate } = body;

    if (!userId || !userName || !cycle) {
      return NextResponse.json({ error: "User, Name and Cycle are required" }, { status: 400 });
    }

    const defaultKRAs = [
      { kraTitle: "Project Deliverables & Quality", weightagePercentage: 30, selfScore: 0, managerScore: 0, comments: "" },
      { kraTitle: "Communication & Team Collaboration", weightagePercentage: 25, selfScore: 0, managerScore: 0, comments: "" },
      { kraTitle: "Technical Competency & Problem Solving", weightagePercentage: 25, selfScore: 0, managerScore: 0, comments: "" },
      { kraTitle: "Adherence to Processes & Timelines", weightagePercentage: 20, selfScore: 0, managerScore: 0, comments: "" },
    ];

    const appraisal = await HRAppraisal.create({
      tenantId: tenantObjectId,
      userId,
      userName,
      managerId,
      managerName: managerName || session.userName,
      cycle,
      type: type || "Quarterly Appraisal",
      status: "Draft",
      kras: kras && kras.length > 0 ? kras : defaultKRAs,
      probationStatus: type === "Probation Review" ? "Under Probation" : undefined,
      probationEndDate: probationEndDate ? new Date(probationEndDate) : undefined,
    });

    return NextResponse.json({ appraisal }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/hr/appraisals error:", error);
    return NextResponse.json({ error: "Failed to create appraisal" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { appraisalId, action, kras, selfFeedback, managerFeedback, finalRating, probationStatus } = body;

    const appraisal = await HRAppraisal.findOne({
      _id: appraisalId,
      tenantId: tenantObjectId,
    });

    if (!appraisal) {
      return NextResponse.json({ error: "Appraisal record not found" }, { status: 404 });
    }

    if (action === "submit_self_review") {
      if (kras) appraisal.kras = kras;
      if (selfFeedback) appraisal.selfFeedback = selfFeedback;

      const totalSelf = appraisal.kras.reduce((acc: number, item: any) => acc + (item.selfScore || 0), 0);
      appraisal.overallSelfRating = Number((totalSelf / appraisal.kras.length).toFixed(1));
      appraisal.status = "Self Review Submitted";
      appraisal.submittedAt = new Date();
    } else if (action === "submit_manager_review") {
      if (session.role !== "Admin" && session.role !== "Manager") {
        return NextResponse.json({ error: "Unauthorized for manager review" }, { status: 401 });
      }

      if (kras) appraisal.kras = kras;
      if (managerFeedback) appraisal.managerFeedback = managerFeedback;
      if (probationStatus) appraisal.probationStatus = probationStatus;

      const totalManager = appraisal.kras.reduce((acc: number, item: any) => acc + (item.managerScore || 0), 0);
      appraisal.overallManagerRating = Number((totalManager / appraisal.kras.length).toFixed(1));
      appraisal.finalRating = finalRating || appraisal.overallManagerRating;
      appraisal.status = "Finalized";
      appraisal.completedAt = new Date();
    }

    await appraisal.save();
    return NextResponse.json({ appraisal });
  } catch (error: unknown) {
    console.error("PUT /api/hr/appraisals error:", error);
    return NextResponse.json({ error: "Failed to update appraisal" }, { status: 500 });
  }
}
