import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRDocument } from "@/models/HRDocument";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { isSubAdminRole } from "@/lib/roles";
import { getHRAccessScope } from "@/lib/hrIsolation";
import { notify } from "@/lib/notify";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const query: any = { tenantId: tenantObjectId };

    const scope = await getHRAccessScope(session, tenantObjectId, userObjectId);

    if (scope.isPrivilegedAdmin) {
      // Unrestricted admin view
    } else if (scope.allowedUserIds) {
      query.$or = [
        { isRestricted: false },
        { targetUserId: { $in: scope.allowedUserIds } },
        { "requestedBy.userId": userObjectId },
      ];
    } else {
      // General view
      query.$or = [
        { isRestricted: false },
        { targetUserId: userObjectId },
      ];
    }

    const docs = await HRDocument.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ documents: docs, isIsolated: scope.isIsolated });
  } catch (error: unknown) {
    console.error("GET /api/hr/documents error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    const isPrivileged =
      session.role === "Admin" ||
      session.role === "Manager" ||
      session.role === "HR" ||
      session.role === "OPS" ||
      isSubAdminRole(session.role);

    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: Only HR or Admins can request/create documents" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const {
      title,
      category,
      fileUrl,
      fileSize,
      targetUserId,
      targetUserName,
      isRestricted,
      status, // "Requested" | "Submitted" | "Verified"
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Document title is required" }, { status: 400 });
    }

    let validatedTargetUserId = undefined;
    let validatedTargetUserName = targetUserName || "";
    if (targetUserId) {
      const { User } = await import("@/models/User");
      const targetUser = await User.findOne({ _id: targetUserId, tenantId: tenantObjectId }).lean();
      if (!targetUser) {
        return NextResponse.json({ error: "Target employee not found in this workspace" }, { status: 404 });
      }
      validatedTargetUserId = targetUser._id;
      validatedTargetUserName = targetUser.name;
    }

    const docStatus = status === "Requested" ? "Requested" : "Submitted";

    // If not a request, fileUrl is required
    if (docStatus === "Submitted" && !fileUrl) {
      return NextResponse.json({ error: "File URL is required when uploading document records" }, { status: 400 });
    }

    const doc = await HRDocument.create({
      tenantId: tenantObjectId,
      title: title.trim(),
      category: category || "Document",
      fileUrl: fileUrl || "",
      fileSize: fileSize || "N/A",
      targetUserId: validatedTargetUserId,
      targetUserName: validatedTargetUserName,
      isRestricted: isRestricted !== undefined ? isRestricted : true,
      uploadedBy: session.userName,
      status: docStatus,
      requestedBy:
        docStatus === "Requested"
          ? {
              userId: userObjectId,
              userName: session.userName,
              requestedAt: new Date(),
            }
          : undefined,
      notes: notes || "",
    });

    // Notify employee if document is requested
    if (docStatus === "Requested" && validatedTargetUserId) {
      try {
        await notify(tenantObjectId, validatedTargetUserId.toString(), {
          title: "New Document Requested by HR",
          message: `${session.userName} has requested document "${title.trim()}". Please submit it from your dashboard.`,
          type: "hr",
          linkUrl: "/dashboard/hr?tab=vault",
        });
      } catch (notifErr) {
        console.warn("Failed to notify employee:", notifErr);
      }
    }

    return NextResponse.json({ document: doc, message: docStatus === "Requested" ? "Document requested from employee" : "Document created" }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/hr/documents error:", error);
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
  }
}

/**
 * PUT: Update document verification status (HR / Admin can Verify or Reject)
 */
export async function PUT(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    const isPrivileged =
      session.role === "Admin" ||
      session.role === "Manager" ||
      session.role === "HR" ||
      session.role === "OPS" ||
      isSubAdminRole(session.role);

    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: Only HR or Admins can verify documents" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { documentId, status, notes } = body;

    if (!documentId || !status) {
      return NextResponse.json({ error: "documentId and status are required" }, { status: 400 });
    }

    const updateFields: any = { status };
    if (notes !== undefined) updateFields.notes = notes;

    if (status === "Verified") {
      updateFields.verifiedBy = {
        userId: userObjectId,
        userName: session.userName,
        verifiedAt: new Date(),
      };
    }

    const doc = await HRDocument.findOneAndUpdate(
      { _id: documentId, tenantId: tenantObjectId },
      { $set: updateFields },
      { new: true }
    );

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Notify employee of document verification result
    if (doc.targetUserId) {
      try {
        await notify(tenantObjectId, doc.targetUserId.toString(), {
          title: `Document ${status === "Verified" ? "Verified" : "Status Updated"}`,
          message: `Your document "${doc.title}" has been marked as ${status} by ${session.userName}.`,
          type: "hr",
          linkUrl: "/dashboard/hr?tab=vault",
        });
      } catch (notifErr) {
        console.warn("Failed to notify employee:", notifErr);
      }
    }

    return NextResponse.json({ document: doc, message: `Document marked as ${status}` });
  } catch (error: unknown) {
    console.error("PUT /api/hr/documents error:", error);
    return NextResponse.json({ error: "Failed to update document status" }, { status: 500 });
  }
}
