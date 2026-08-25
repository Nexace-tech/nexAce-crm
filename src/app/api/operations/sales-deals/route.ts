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
    await connectToDatabase();

    // ── Handle Bulk Import for Sales Deals ───────────────────────────────────
    if (body.bulk === true && Array.isArray(body.items)) {
      const validDeals: any[] = [];
      const errors: string[] = [];

      body.items.forEach((item: any, idx: number) => {
        const clientAccount = item.clientAccount || item.name || item.company;
        const dealName = item.dealName || item.projectName || `${clientAccount} Deal`;

        if (!clientAccount) {
          errors.push(`Row ${idx + 1}: Missing clientAccount`);
          return;
        }

        validDeals.push({
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount,
          dealName,
          dealValue: Number(item.dealValue || item.monthlyValue || item.value || 50000),
          stage: item.stage || "Prospecting",
          probability: Number(item.probability) || 50,
          owner: item.owner || item.deliveryOwner || session.userName || "Admin",
          expectedClose: item.expectedClose || item.targetEndDate || "2026-12-31",
          venture: item.venture || "Ace Consultancys",
          notes: item.notes || "Bulk imported deal",
        });
      });

      if (validDeals.length === 0) {
        return NextResponse.json({ error: "No valid deals to import", errors }, { status: 400 });
      }

      const inserted = await SalesDeal.insertMany(validDeals);
      await ActivityLog.create({
        tenantId: tenantObjectId,
        userId: userObjectId,
        userName: session.userName || "Admin",
        action: `Bulk imported ${inserted.length} sales deals`,
        targetName: "SalesDeals",
        details: `Imported deals for ${validDeals.slice(0, 3).map(d => d.clientAccount).join(", ")}...`,
      });

      return NextResponse.json({
        success: true,
        count: inserted.length,
        message: `Successfully bulk imported ${inserted.length} sales deals!`,
        deals: inserted,
      }, { status: 201 });
    }

    // ── Handle Single Deal Creation ──────────────────────────────────────────
    const { clientAccount, dealName, dealValue, stage, probability, owner, expectedClose, venture, notes } = body;

    if (!clientAccount?.trim() || !dealName?.trim()) {
      return NextResponse.json({ error: "Client account and deal name are required" }, { status: 400 });
    }

    const deal = await SalesDeal.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      clientAccount: clientAccount.trim(),
      dealName: dealName.trim(),
      dealValue: Number(dealValue) || 0,
      stage: stage || "Prospecting",
      probability: Number(probability) >= 0 ? Number(probability) : 50,
      owner: owner?.trim() || session.userName || "Unassigned",
      expectedClose: expectedClose || "",
      venture: venture || "Ace Consultancys",
      notes: notes || "",
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Created sales deal: ${deal.dealName}`,
      targetName: "SalesDeals",
      details: `Client: ${deal.clientAccount} | Value: $${deal.dealValue} | Stage: ${deal.stage}`,
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/operations/sales-deals error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
