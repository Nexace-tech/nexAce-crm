import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "birthdays");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB maximum

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: "Only image files (JPEG, PNG, WebP, GIF) or PDFs are permitted" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum allowed size is 10MB." },
        { status: 413 }
      );
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Determine extension
    const originalName = file.name || "attachment";
    let ext = path.extname(originalName).toLowerCase();
    if (!ext) {
      ext = isImage ? ".webp" : ".pdf";
    }

    const safeHash = crypto.randomBytes(8).toString("hex");
    const safeFileName = `wish-${Date.now()}-${safeHash}${ext}`;
    const destinationPath = path.join(UPLOAD_DIR, safeFileName);

    await writeFile(destinationPath, buffer);

    const publicUrl = `/uploads/birthdays/${safeFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: originalName,
      type: isImage ? "image" : "file",
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("[POST /api/birthdays/upload] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
