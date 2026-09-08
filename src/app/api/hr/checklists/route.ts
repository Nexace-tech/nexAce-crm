import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HROnboarding } from "@/models/HROnboarding";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify, notifyAdmins } from "@/lib/notify";

import { isSubAdminRole } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const employmentType = searchParams.get("employmentType");

    const query: any = { tenantId: tenantObjectId };
    if (type) query.type = type;
    if (employmentType) query.employmentType = employmentType;

    const isPrivileged = session.role === "Admin" || session.role === "Manager" || session.role === "HR" || session.role === "OPS" || isSubAdminRole(session.role);
    if (!isPrivileged) {
      query.userId = userObjectId;
    }

    const checklists = await HROnboarding.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ checklists });
  } catch (error: unknown) {
    console.error("GET /api/hr/checklists error:", error);
    return NextResponse.json({ error: "Failed to fetch checklists" }, { status: 500 });
  }
}

function getDefaultChecklistItems(type: "Onboarding" | "Offboarding", employmentType: string) {
  if (type === "Onboarding") {
    switch (employmentType) {
      case "Contractor":
        return [
          { id: "1", title: "Sign Independent Contractor Agreement / MSA", category: "Contract", completed: false },
          { id: "2", title: "Sign Contractor Non-Disclosure Agreement (NDA)", category: "NDA", completed: false },
          { id: "3", title: "Statement of Work (SOW) & Deliverables Alignment", category: "KRA Sign-off", completed: false },
          { id: "4", title: "Tax Identification & Invoicing Setup (W-9 / GST / PAN)", category: "Document", completed: false },
          { id: "5", title: "Configure Role-Based Tool & Repository Access", category: "Access", completed: false },
          { id: "6", title: "Issue Hardware Asset or Bring-Your-Own-Device Registration", category: "IT Asset", completed: false },
          { id: "7", title: "Security, Confidentiality & IP Compliance Certification", category: "Compliance", completed: false },
        ];
      case "Freelancer":
        return [
          { id: "1", title: "Sign Freelance Engagement Letter / Service Agreement", category: "Contract", completed: false },
          { id: "2", title: "Intellectual Property Assignment & NDA", category: "NDA", completed: false },
          { id: "3", title: "Milestone Schedule & Deliverables Sign-off", category: "KRA Sign-off", completed: false },
          { id: "4", title: "Payment Details & Billing Method Verification", category: "Document", completed: false },
          { id: "5", title: "Grant Project-Scoped Workspace & Repository Access", category: "Access", completed: false },
        ];
      case "Intern":
        return [
          { id: "1", title: "Educational Institution NOC & Identity Proof", category: "Document", completed: false },
          { id: "2", title: "Sign Internship Agreement & Confidentiality Terms", category: "NDA", completed: false },
          { id: "3", title: "Mentor Assignment & Learning Goals Sign-off", category: "KRA Sign-off", completed: false },
          { id: "4", title: "Issue Workstation & Development Environment Setup", category: "IT Asset", completed: false },
          { id: "5", title: "Provision Communication & Learning Portal Access", category: "Access", completed: false },
        ];
      case "Part-Time":
        return [
          { id: "1", title: "Submit Identity & Address Proof", category: "Document", completed: false },
          { id: "2", title: "Part-Time Employment Agreement & Working Hours Schedule", category: "Contract", completed: false },
          { id: "3", title: "Sign Non-Disclosure Agreement (NDA)", category: "NDA", completed: false },
          { id: "4", title: "KRA & Shift Schedule Alignment", category: "KRA Sign-off", completed: false },
          { id: "5", title: "Provision System & Communication Access", category: "Access", completed: false },
        ];
      case "Permanent":
      default:
        return [
          { id: "1", title: "Submit Identity & Address Proof", category: "Document", completed: false },
          { id: "2", title: "Sign Non-Disclosure Agreement (NDA)", category: "NDA", completed: false },
          { id: "3", title: "KRA & Job Description Sign-off", category: "KRA Sign-off", completed: false },
          { id: "4", title: "Issue Work Laptop & Access Pass", category: "IT Asset", completed: false },
          { id: "5", title: "Provision CRM & Email Accounts", category: "Access", completed: false },
        ];
    }
  } else {
    // Offboarding
    switch (employmentType) {
      case "Contractor":
      case "Freelancer":
        return [
          { id: "1", title: "SOW Deliverables Verification & Milestone Acceptance", category: "KRA Sign-off", completed: false },
          { id: "2", title: "Final Timesheet / Invoice Submission & Audit", category: "Document", completed: false },
          { id: "3", title: "Revoke System, Cloud & Code Repository Access", category: "Access", completed: false },
          { id: "4", title: "Return Company Assets & Hardware (if issued)", category: "IT Asset", completed: false },
          { id: "5", title: "Contract Completion & Mutual NDA Confirmation", category: "Contract", completed: false },
        ];
      case "Intern":
        return [
          { id: "1", title: "Project Handover & Mentor Evaluation Sign-off", category: "KRA Sign-off", completed: false },
          { id: "2", title: "Return Hardware Assets & Access Cards", category: "IT Asset", completed: false },
          { id: "3", title: "Revoke System & Portal Access", category: "Access", completed: false },
          { id: "4", title: "Internship Completion Certificate Issuance", category: "Document", completed: false },
          { id: "5", title: "Exit Feedback & Experience Review", category: "Other", completed: false },
        ];
      case "Part-Time":
      case "Permanent":
      default:
        return [
          { id: "1", title: "Handover Project Repos & Documentation", category: "KRA Sign-off", completed: false },
          { id: "2", title: "Return Company Laptop & Hardware", category: "IT Asset", completed: false },
          { id: "3", title: "Revoke Cloud & CRM Access Permissions", category: "Access", completed: false },
          { id: "4", title: "Exit Interview & Feedback Submission", category: "Other", completed: false },
          { id: "5", title: "No Dues Clearance Certificate Sign-off", category: "Document", completed: false },
        ];
    }
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { userId, userName, userEmail, type, items, dueDate, employmentType = "Permanent", contractDetails } = body;

    if (!userId || !userName || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const defaultItems = getDefaultChecklistItems(type, employmentType);

    let finalItems = items && items.length > 0 ? items : defaultItems;

    if (body.initialAttachments) {
      const { offerLetter, nda } = body.initialAttachments;
      finalItems = finalItems.map((item: any) => {
        if (
          nda &&
          (item.category === "NDA" ||
            item.title.toLowerCase().includes("nda") ||
            item.title.toLowerCase().includes("non-disclosure") ||
            item.title.toLowerCase().includes("confidentiality"))
        ) {
          return {
            ...item,
            documentUrl: nda.url,
            documentName: nda.name,
          };
        }
        if (
          offerLetter &&
          (item.category === "Contract" ||
            item.title.toLowerCase().includes("offer letter") ||
            item.title.toLowerCase().includes("agreement") ||
            item.title.toLowerCase().includes("contract") ||
            item.title.toLowerCase().includes("engagement letter"))
        ) {
          return {
            ...item,
            documentUrl: offerLetter.url,
            documentName: offerLetter.name,
          };
        }
        return item;
      });
    }

    const checklist = await HROnboarding.create({
      tenantId: tenantObjectId,
      userId,
      userName,
      userEmail: userEmail || "",
      employmentType: employmentType || "Permanent",
      contractDetails: contractDetails || undefined,
      type,
      status: "In Progress",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      items: finalItems,
    });

    // Notify employee of assigned checklist
    await notify(tenantObjectId, userId, {
      title: `New ${type} Checklist Assigned`,
      message: `You have been assigned a new ${type} checklist.`,
      type: "hr",
      linkUrl: "/dashboard/hr?tab=checklists",
    });

    return NextResponse.json({ checklist }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/hr/checklists error:", error);
    return NextResponse.json({ error: "Failed to create checklist" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { checklistId, itemId, completed, notes, documentUrl, documentName } = body;

    const checklist = await HROnboarding.findOne({
      _id: checklistId,
      tenantId: tenantObjectId,
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    const isOwner = checklist.userId.toString() === userObjectId.toString();
    const isPrivileged = session.role === "Admin" || session.role === "Manager" || session.role === "HR";

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: "Forbidden: you can only update your own checklist" }, { status: 403 });
    }

    const item = checklist.items.find((i: any) => i.id === itemId);
    if (item) {
      item.completed = completed;
      item.completedAt = completed ? new Date() : undefined;
      item.completedBy = session.userName;
      if (notes !== undefined) item.notes = notes;
      if (documentUrl !== undefined) item.documentUrl = documentUrl;
      if (documentName !== undefined) item.documentName = documentName;
    }

    const allDone = checklist.items.every((i: any) => i.completed);
    if (allDone) {
      checklist.status = "Completed";
      checklist.completedDate = new Date();

      // Notify Admins when checklist fully completed
      await notifyAdmins(tenantObjectId, {
        title: `${checklist.type} Checklist Completed`,
        message: `${checklist.userName} completed all ${checklist.type} checklist items.`,
        type: "hr",
        linkUrl: "/dashboard/hr?tab=checklists",
      });
    } else {
      checklist.status = "In Progress";
    }

    await checklist.save();
    return NextResponse.json({ checklist });
  } catch (error: unknown) {
    console.error("PUT /api/hr/checklists error:", error);
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
}
