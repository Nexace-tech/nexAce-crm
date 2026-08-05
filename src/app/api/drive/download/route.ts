import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { DriveFile } from "@/models/DriveFile";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.resolve(path.join(process.cwd(), "src", "uploads"));

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

    // Fix #3: Path traversal guard — resolve and verify the path stays within UPLOAD_DIR
    const resolvedPath = path.resolve(path.join(UPLOAD_DIR, file.filePath));
    if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep) && resolvedPath !== UPLOAD_DIR) {
      console.error(`Path traversal attempt blocked: ${file.filePath}`);
      return new Response("Forbidden", { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return new Response("File not found on disk storage", { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    const isImage =
      (file.mimeType || "").startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
    const disposition = isImage
      ? `inline; filename="${encodeURIComponent(file.name)}"`
      : `attachment; filename="${encodeURIComponent(file.name)}"`;

    // Fix #12: Stream the file instead of loading entire content into memory
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
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("API GET Download file error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
