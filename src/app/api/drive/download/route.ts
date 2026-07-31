import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { DriveFile } from "@/models/DriveFile";
import fs from "fs";
import path from "path";

/**
 * GET: Serve uploaded files securely (isolating tenants).
 * Query: ?fileId=...
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId") || searchParams.get("id");

    if (!fileId) {
      return new Response("File ID is required", { status: 400 });
    }

    await connectToDatabase();

    const file = await DriveFile.findById(fileId);
    if (!file || file.tenantId.toString() !== session.tenantId) {
      return new Response("File not found", { status: 404 });
    }

    const UPLOAD_DIR = path.join(process.cwd(), "src", "uploads");
    const filePathOnDisk = path.join(UPLOAD_DIR, file.filePath);

    if (!fs.existsSync(filePathOnDisk)) {
      return new Response("File not found on disk storage", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePathOnDisk);
    const isImage = (file.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
    const disposition = isImage ? `inline; filename="${encodeURIComponent(file.name)}"` : `attachment; filename="${encodeURIComponent(file.name)}"`;

    // Return binary file response
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("API GET Download file error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
