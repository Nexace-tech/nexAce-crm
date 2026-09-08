import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRDocument } from "@/models/HRDocument";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { Tenant } from "@/models/Tenant";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.resolve(path.join(process.cwd(), "src", "uploads", "HR"));

const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "php", "phtml", "html", "htm",
  "js", "mjs", "cjs", "vbs", "jar", "py", "cgi", "pl", "scr", "dll", "ps1",
]);

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const title = (formData.get("title") as string | null)?.trim();
    const category = (formData.get("category") as string | null) || "Contract";
    const requestedTargetUserId = formData.get("targetUserId") as string | null;
    const requestedTargetUserName = formData.get("targetUserName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Document title is required" }, { status: 400 });
    }

    const fileName = (file as any).name || "document";
    const fileExt = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";
    const size = file.size;

    if (DANGEROUS_EXTENSIONS.has(fileExt)) {
      return NextResponse.json({ error: `File type '.${fileExt}' is not allowed.` }, { status: 400 });
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (size > MAX_SIZE) {
      return NextResponse.json({
        error: `File exceeds 25 MB limit (${(size / 1024 / 1024).toFixed(1)} MB)`,
      }, { status: 400 });
    }

    await connectToDatabase();

    const tenantDoc = await Tenant.findById(tenantObjectId).lean();
    const allowedExts: string[] = (tenantDoc as any)?.allowedExtensions?.length
      ? (tenantDoc as any).allowedExtensions.map((e: string) => e.toLowerCase())
      : ["png", "jpg", "jpeg", "pdf", "docx", "doc", "xlsx", "txt", "svg", "webp"];

    if (fileExt && !allowedExts.includes(fileExt)) {
      return NextResponse.json({
        error: `File type '.${fileExt}' is not permitted. Allowed: ${allowedExts.map(e => `.${e}`).join(", ")}`,
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await mkdir(UPLOAD_DIR, { recursive: true });

    const timestamp = Date.now();
    const safeName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const destPath = path.join(UPLOAD_DIR, safeName);
    await writeFile(destPath, buffer);

    const fileUrl = `/api/drive/download?path=HR/${encodeURIComponent(safeName)}`;
    const fileSizeLabel =
      size < 1024 ? `${size} B`
      : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

    const validCategories = ["Offer Letter", "NDA", "KRA Agreement", "Policy", "Tax Document", "Contract", "Document", "Other"] as const;
    type DocCategory = typeof validCategories[number];
    const resolvedCategory: DocCategory = validCategories.includes(category as DocCategory) ? (category as DocCategory) : "Other";

    const isPrivileged = session.role === "Admin" || session.role === "Manager" || session.role === "HR";
    const finalTargetUserId = (isPrivileged && requestedTargetUserId) ? requestedTargetUserId : userObjectId;
    const finalTargetUserName = (isPrivileged && requestedTargetUserName) ? requestedTargetUserName : session.userName;

    const doc = await HRDocument.create({
      tenantId: tenantObjectId,
      title,
      category: resolvedCategory,
      fileUrl,
      fileSize: fileSizeLabel,
      targetUserId: finalTargetUserId,
      targetUserName: finalTargetUserName,
      isRestricted: true,
      uploadedBy: session.userName,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/hr/documents/upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
