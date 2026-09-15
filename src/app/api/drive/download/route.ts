import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { DriveFile } from "@/models/DriveFile";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.resolve(path.join(process.cwd(), "src", "uploads"));

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
};

/**
 * GET: Serve uploaded files securely (isolating tenants).
 * Query: ?fileId=... OR ?path=...
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId") || searchParams.get("id");
    const relativePath = searchParams.get("path") || searchParams.get("filePath");

    if (!fileId && !relativePath) {
      return new Response("File ID or path is required", { status: 400 });
    }

    let filePathOnDisk = "";
    let downloadName = "document";
    let mimeType = "application/octet-stream";

    const isAdmin = Boolean(session.role && session.role.trim().toLowerCase() === "admin");

    if (fileId) {
      await connectToDatabase();
      const file = await DriveFile.findById(fileId);
      if (!file || file.tenantId.toString() !== session.tenantId) {
        return new Response("File not found", { status: 404 });
      }
      // Non-admin can only access/download their own files
      if (!isAdmin && file.uploadedBy && file.uploadedBy.toString() !== session.userId) {
        return new Response("Forbidden: Access restricted to your own files", { status: 403 });
      }
      filePathOnDisk = file.filePath;
      downloadName = file.name;
      mimeType = file.mimeType || "application/octet-stream";
    } else if (relativePath) {
      filePathOnDisk = relativePath;
      const rawName = path.basename(relativePath);
      const cleanName = rawName.replace(/^\d+[-_]/, "");
      downloadName = cleanName || rawName;

      const ext = path.extname(rawName).toLowerCase().replace(".", "");
      mimeType = MIME_MAP[ext] || "application/octet-stream";
    }

    // Path traversal guard — resolve and verify the path stays within UPLOAD_DIR
    const resolvedPath = path.resolve(path.join(UPLOAD_DIR, filePathOnDisk));
    if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep) && resolvedPath !== UPLOAD_DIR) {
      console.error(`Path traversal attempt blocked: ${filePathOnDisk}`);
      return new Response("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return new Response("File not found on disk storage", { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    const isImage = mimeType.startsWith("image/") && !mimeType.includes("svg");
    const isPdf = mimeType === "application/pdf";
    const isText = mimeType.startsWith("text/") || mimeType === "application/json";
    const forceDownload = searchParams.get("download") === "true";

    // For PDFs, images, and text viewed directly, allow inline viewing if not forced download
    const safeFileName = downloadName.replace(/[\r\n"']/g, "_");
    const disposition = (!forceDownload && (isImage || isPdf || isText))
      ? `inline; filename="${encodeURIComponent(safeFileName)}"`
      : `attachment; filename="${encodeURIComponent(safeFileName)}"`;

    // Stream the file instead of loading entire content into memory
    const nodeStream = fs.createReadStream(resolvedPath);
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error: unknown) {
    console.error("API GET Download file error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
