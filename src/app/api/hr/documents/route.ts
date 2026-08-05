import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRDocument } from "@/models/HRDocument";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    await connectToDatabase();
    const query: any = { tenantId: tenantObjectId };

    if (session.role === "Employee") {
      query.$or = [
        { isRestricted: false },
        { targetUserId: userObjectId },
      ];
    }

    const docs = await HRDocument.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ documents: docs });
  } catch (error: unknown) {
    console.error("GET /api/hr/documents error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    await connectToDatabase();
    const body = await req.json();
    const { title, category, fileUrl, fileSize, targetUserId, targetUserName, isRestricted } = body;

    if (!title || !fileUrl) {
      return NextResponse.json({ error: "Title and File URL are required" }, { status: 400 });
    }

    const doc = await HRDocument.create({
      tenantId: tenantObjectId,
      title,
      category: category || "Other",
      fileUrl,
      fileSize: fileSize || "1.5 MB",
      targetUserId: targetUserId || undefined,
      targetUserName: targetUserName || "",
      isRestricted: isRestricted !== undefined ? isRestricted : true,
      uploadedBy: session.userName,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/hr/documents error:", error);
    return NextResponse.json({ error: "Failed to upload document record" }, { status: 500 });
  }
}
