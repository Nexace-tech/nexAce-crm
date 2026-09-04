import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    await connectToDatabase();
    const leads = await Lead.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ leads });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/bd/leads error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    await connectToDatabase();

    // ── Bulk Import Support ──
    if (Array.isArray(body) || Array.isArray(body?.leads)) {
      const items = Array.isArray(body) ? body : body.leads;
      if (!items || items.length === 0) {
        return NextResponse.json({ error: "No leads provided for import." }, { status: 400 });
      }

      const validItems = items.filter((item: any) => item.leadName || item.companyName);
      if (validItems.length === 0) {
        return NextResponse.json({ error: "All rows are missing required lead name or company." }, { status: 400 });
      }

      const documents = validItems.map((item: any) => ({
        tenantId: tenantObjectId,
        createdBy: userObjectId,
        leadName: item.leadName?.trim() || "Untitled Lead",
        companyName: item.companyName?.trim() || "Independent",
        phone: item.phone?.trim() || "",
        email: item.email?.trim() || "",
        status: ["New","Contacted","Qualified","Proposal","Negotiation","Closed","Lost"].includes(item.status) ? item.status : "New",
        stage: ["Inpipeline","Follow Up","Schedule Service","Conversation"].includes(item.stage) ? item.stage : "Inpipeline",
        leadType: item.leadType === "Internal" ? "Internal" : "External",
        source: item.source || "CSV Import",
        owner: item.owner?.trim() || session.userName || "Unassigned",
        venture: item.venture || "Ace Consultancys",
        location: item.location || "",
        value: Number(item.value) || 0,
        currency: item.currency || "USD",
        notes: item.notes || "",
        history: [
          {
            fromStatus: undefined,
            toStatus: ["New","Contacted","Qualified","Proposal","Negotiation","Closed","Lost"].includes(item.status) ? item.status : "New",
            fromStage: undefined,
            toStage: ["Inpipeline","Follow Up","Schedule Service","Conversation"].includes(item.stage) ? item.stage : "Inpipeline",
            changedBy: userObjectId,
            changedByName: session.userName || "Admin",
            notes: item.notes || "Lead created via CSV import",
            timestamp: new Date(),
          },
        ],
      }));

      const createdLeads = await Lead.insertMany(documents);
      return NextResponse.json({ success: true, count: createdLeads.length, leads: createdLeads }, { status: 201 });
    }

    const lead = await Lead.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      leadName: body.leadName,
      companyName: body.companyName,
      phone: body.phone || "",
      email: body.email || "",
      status: body.status || "New",
      stage: body.stage || "Inpipeline",
      leadType: body.leadType || "External",
      source: body.source || "",
      owner: body.owner?.trim() || session.userName || "Unassigned",
      venture: body.venture || "Ace Consultancys",
      location: body.location || "",
      value: Number(body.value) || 0,
      currency: body.currency || "USD",
      notes: body.notes || "",
      history: [
        {
          fromStatus: undefined,
          toStatus: body.status || "New",
          fromStage: undefined,
          toStage: body.stage || "Inpipeline",
          changedBy: userObjectId,
          changedByName: session.userName || "Admin",
          notes: body.notes || "Lead created",
          timestamp: new Date(),
        },
      ],
    });

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/bd/leads error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
