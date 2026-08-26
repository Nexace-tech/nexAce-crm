import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITSubscription } from "@/models/ITSubscription";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_SUBSCRIPTIONS = [
  { tool: "Slack Pro", category: "Communication", plan: "Pro", costPerMonth: 87.50, seats: 25, renewalDate: "2026-09-01", owner: "Ahmed Raza", status: "Active" },
  { tool: "Notion Team", category: "Knowledge Base", plan: "Team", costPerMonth: 40.00, seats: 20, renewalDate: "2026-08-20", owner: "Sara Khan", status: "Expiring Soon" },
  { tool: "Google Workspace Business", category: "Productivity", plan: "Business Starter", costPerMonth: 126.00, seats: 30, renewalDate: "2026-10-15", owner: "Omar Malik", status: "Active" },
  { tool: "GitHub Teams", category: "Dev Tools", plan: "Team", costPerMonth: 20.00, seats: 10, renewalDate: "2026-11-01", owner: "Zain Ali", status: "Active" },
  { tool: "Figma Professional", category: "Design", plan: "Professional", costPerMonth: 36.00, seats: 6, renewalDate: "2026-08-31", owner: "Fatima Noor", status: "Expiring Soon" },
  { tool: "AWS", category: "Infrastructure", plan: "Pay-as-you-go", costPerMonth: 340.00, seats: 1, renewalDate: "2026-12-31", owner: "Bilal Hassan", status: "Active" },
  { tool: "Canva Pro", category: "Design", plan: "Pro", costPerMonth: 16.99, seats: 5, renewalDate: "2026-09-15", owner: "Mariam Siddiqui", status: "Active" },
  { tool: "Zoom Business", category: "Communication", plan: "Business", costPerMonth: 24.99, seats: 10, renewalDate: "2026-07-01", owner: "Hassan Shah", status: "Expired" },
  { tool: "HubSpot Starter", category: "CRM", plan: "Starter", costPerMonth: 45.00, seats: 5, renewalDate: "2026-10-20", owner: "Ayesha Qureshi", status: "Active" },
  { tool: "Loom Business", category: "Communication", plan: "Business", costPerMonth: 12.50, seats: 5, renewalDate: "2026-06-01", owner: "Tariq Hussain", status: "Cancelled" },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    // Subscriptions are org-wide management data — only privileged roles can see them
    if (!isPrivileged) {
      return NextResponse.json({ subscriptions: [] });
    }

    await connectToDatabase();
    let subs = await ITSubscription.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (subs.length === 0) {
      const seedDocs = SEED_SUBSCRIPTIONS.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ITSubscription.insertMany(seedDocs);
      subs = await ITSubscription.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ subscriptions: subs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/subscriptions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { tool, category, plan, costPerMonth, seats, renewalDate, owner, status } = body;

    if (!tool?.trim()) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const doc = await ITSubscription.create({
      tenantId: tenantObjectId,
      tool: tool.trim(),
      category: category?.trim() || "",
      plan: plan?.trim() || "",
      costPerMonth: Number(costPerMonth) || 0,
      seats: Number(seats) || 1,
      renewalDate: renewalDate || "",
      owner: owner?.trim() || "",
      status: status || "Active",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_SUBSCRIPTION_ADDED",
      targetName: tool.trim(),
      details: `Added subscription for "${tool.trim()}" (${plan || "N/A"}) at $${costPerMonth || 0}/mo`,
    });

    return NextResponse.json({ subscription: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/subscriptions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
