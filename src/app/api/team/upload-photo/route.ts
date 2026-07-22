import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import fs from "fs";
import path from "path";

// Define the public uploads directory
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * POST: Upload a profile picture locally.
 */
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

    // Basic validation: must be an image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image" }, { status: 400 });
    }

    const originalName = (file as any).name || "avatar.jpg";
    const extension = path.extname(originalName) || ".jpg";

    // Convert file Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure public/uploads exists
    if (!fs.existsSync(PUBLIC_UPLOAD_DIR)) {
      fs.mkdirSync(PUBLIC_UPLOAD_DIR, { recursive: true });
    }

    // Save with unique name to prevent collisions
    const safeName = `avatar-${session.userId}-${Date.now()}${extension}`;
    const destinationPath = path.join(PUBLIC_UPLOAD_DIR, safeName);
    
    fs.writeFileSync(destinationPath, buffer);

    // Return the public URL path
    const photoUrl = `/uploads/${safeName}`;
    return NextResponse.json({ success: true, photoUrl });
  } catch (error: any) {
    console.error("API Profile Photo Upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
