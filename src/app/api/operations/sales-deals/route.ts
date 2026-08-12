import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalesDeal } from "@/models/SalesDeal";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_DEALS = [
  { clientAccount: "Apex Digital", dealName: "Brand Revamp 2026", dealValue: 48000, stage: "Proposal Sent", probability: 65, owner: "Sara Khan", expectedClose: "2026-09-30", venture: "Ace Consultancys" },
  { clientAccount: "NovaTech Solutions", dealName: "ERP Integration Q3", dealValue: 95000, stage: "Negotiation", probability: 80, owner: "Ahmed Raza", expectedClose: "2026-08-31", venture: "Ace Consultancys" },
  { clientAccount: "Greenfield Corp", dealName: "HR Module Deployment", dealValue: 22000, stage: "Discovery", probability: 40, owner: "Omar Malik", expectedClose: "2026-10-15", venture: "Ace Consultancys" },
  { clientAccount: "AlphaStream Media", dealName: "Content Ops Retainer", dealValue: 14400, stage: "Closed Won", probability: 100, owner: "Fatima Noor", expectedClose: "2026-07-01", venture: "Ace Consultancys" },
  { clientAccount: "BlueSky Logistics", dealName: "Fleet Tracking Platform", dealValue: 67000, stage: "Prospecting", probability: 20, owner: "Bilal Hassan", expectedClose: "2026-12-01", venture: "Ace Consultancys" },
  { clientAccount: "TerraFund Capital", dealName: "Compliance Audit Suite", dealValue: 31000, stage: "Closed Lost", probability: 0, owner: "Ayesha Qureshi", expectedClose: "2026-06-15", venture: "Ace Consultancys" },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    let deals = await SalesDeal.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (deals.length === 0) {
      const seedDocs = SEED_DEALS.map((d) => ({
        ...d,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await SalesDeal.insertMany(seedDocs);
      deals = await SalesDeal.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ deals });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/operations/sales-deals error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { clientAccount, dealName, dealValue, stage, probability, owner, expectedClose, venture, notes } = body;

    if (!clientAccount?.trim() || !dealName?.trim()) {
      return NextResponse.json({ error: "Client account and deal name are required" }, { status: 400 });
    }

    await connectToDatabase();

    const deal = await SalesDeal.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      clientAccount: clientAccount.trim(),
      dealName: dealName.trim(),
      dealValue: Number(dealValue) || 0,
      stage: stage || "Prospecting",
      probability: Number(probability) || 50,
      owner: owner?.trim() || session.userName || "",
      expectedClose: expectedClose || "",
      venture: venture?.trim() || "Ace Consultancys",
      notes: notes?.trim() || "",
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "SALES_DEAL_CREATED",
      targetName: dealName.trim(),
      details: `Created sales deal "${dealName.trim()}" for ${clientAccount.trim()} — $${dealValue || 0}`,
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/operations/sales-deals error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
