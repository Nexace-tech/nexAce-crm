import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Define the public uploads directory for proposals
const PROPOSALS_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "proposals");

// File size limit: 20 MB max
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 });
    }

    const rawName = (file as any).name || "attachment.pdf";
    // Sanitize filename
    const safeBase = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const savedFileName = `${uniquePrefix}-${safeBase}`;

    // Ensure directory exists
    await mkdir(PROPOSALS_UPLOAD_DIR, { recursive: true });

    // Write file to public/uploads/proposals
    const destinationPath = path.join(PROPOSALS_UPLOAD_DIR, savedFileName);
    await writeFile(destinationPath, buffer);

    const attachment = {
      name: rawName,
      url: `/uploads/proposals/${savedFileName}`,
      size: buffer.length,
      type: file.type || "application/octet-stream",
      uploadedAt: new Date(),
    };

    return NextResponse.json({ success: true, attachment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/bd/proposals/upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
