import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITAccessEntry } from "@/models/ITAccessEntry";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_ACCESS_ENTRIES = [
  { tool: "Slack", category: "Communication", assignee: "Ahmed Raza", role: "Admin", accessLevel: "Full Access", dateGranted: "2025-01-10", status: "Active" },
  { tool: "Notion", category: "Knowledge Base", assignee: "Sara Khan", role: "Editor", accessLevel: "Edit", dateGranted: "2025-02-14", status: "Active" },
  { tool: "Google Workspace", category: "Productivity", assignee: "Omar Malik", role: "User", accessLevel: "Standard", dateGranted: "2025-03-01", status: "Active" },
  { tool: "GitHub", category: "Dev Tools", assignee: "Zain Ali", role: "Contributor", accessLevel: "Write", dateGranted: "2025-04-05", status: "Active" },
  { tool: "Figma", category: "Design", assignee: "Fatima Noor", role: "Viewer", accessLevel: "View Only", dateGranted: "2025-05-20", status: "Active" },
  { tool: "AWS Console", category: "Infrastructure", assignee: "Bilal Hassan", role: "DevOps", accessLevel: "Full Access", dateGranted: "2025-01-15", status: "Active" },
  { tool: "Canva Pro", category: "Design", assignee: "Mariam Siddiqui", role: "Editor", accessLevel: "Full Access", dateGranted: "2025-06-10", status: "Active" },
  { tool: "Zoom", category: "Communication", assignee: "Hassan Shah", role: "Host", accessLevel: "Host", dateGranted: "2025-02-28", status: "Suspended" },
  { tool: "HubSpot CRM", category: "CRM", assignee: "Ayesha Qureshi", role: "Sales Rep", accessLevel: "Edit", dateGranted: "2025-07-01", status: "Active" },
  { tool: "Stripe Dashboard", category: "Finance", assignee: "Umar Farooq", role: "Viewer", accessLevel: "View Only", dateGranted: "2025-08-01", status: "Pending" },
  { tool: "Jira", category: "Project Management", assignee: "Nadia Rao", role: "Project Lead", accessLevel: "Full Access", dateGranted: "2025-04-20", status: "Active" },
  { tool: "Loom", category: "Communication", assignee: "Tariq Hussain", role: "Creator", accessLevel: "Full Access", dateGranted: "2025-09-05", status: "Revoked" },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();
    let entries = await ITAccessEntry.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (entries.length === 0) {
      const seedDocs = SEED_ACCESS_ENTRIES.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ITAccessEntry.insertMany(seedDocs);
      entries = await ITAccessEntry.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/access error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { tool, category, assignee, role, accessLevel, dateGranted, status } = body;

    if (!tool?.trim() || !assignee?.trim()) {
      return NextResponse.json({ error: "Tool and Assignee are required" }, { status: 400 });
    }

    await connectToDatabase();

    const doc = await ITAccessEntry.create({
      tenantId: tenantObjectId,
      tool: tool.trim(),
      category: category?.trim() || "",
      assignee: assignee.trim(),
      role: role?.trim() || "",
      accessLevel: accessLevel?.trim() || "Full Access",
      dateGranted: dateGranted || new Date().toISOString().slice(0, 10),
      status: status || "Active",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_ACCESS_GRANTED",
      targetName: assignee.trim(),
      details: `Granted ${accessLevel || "Full Access"} to "${tool.trim()}" for ${assignee.trim()}`,
    });

    return NextResponse.json({ entry: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/access error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
