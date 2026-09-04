import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import mongoose from "mongoose";

// ─── Colour palette cycling for client avatar initials ───────────────────────
const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500",
  "bg-amber-500", "bg-sky-500", "bg-teal-500", "bg-orange-500",
];

// ─── Demo seed data ───────────────────────────────────────────────────────────
function buildDemoProposals(tenantId: mongoose.Types.ObjectId) {
  const now = new Date();
  const d = (offset: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    return dt;
  };

  const seed = [
    {
      proposalCode: "PROP-001",
      subject: "SEO & Digital Marketing Proposal",
      projectName: "TruelySell Growth Campaign",
      clientName: "NovaWave LLC",
      clientCompany: "NovaWave LLC",
      clientEmail: "contact@novawave.io",
      clientAvatarColor: "bg-blue-500",
      status: "Accepted",
      totalValue: 204214,
      currency: "USD",
      issueDate: d(-30),
      openTill: d(30),
      items: [
        { description: "SEO Audit & Strategy", quantity: 1, unitPrice: 85000, amount: 85000 },
        { description: "Content Marketing (6 months)", quantity: 6, unitPrice: 15000, amount: 90000 },
        { description: "Analytics & Reporting", quantity: 1, unitPrice: 29214, amount: 29214 },
      ],
      subtotal: 204214,
      taxRate: 0,
      taxAmount: 0,
      description: "Comprehensive SEO and digital marketing package tailored for e-commerce growth.",
    },
    {
      proposalCode: "PROP-002",
      subject: "Web Design & Branding Package",
      projectName: "Redwood Rebrand",
      clientName: "Redwood Inc",
      clientCompany: "Redwood Inc",
      clientEmail: "hello@redwood.co",
      clientAvatarColor: "bg-rose-500",
      status: "Sent",
      totalValue: 145000,
      currency: "USD",
      issueDate: d(-15),
      openTill: d(15),
      items: [
        { description: "Brand Identity Design", quantity: 1, unitPrice: 55000, amount: 55000 },
        { description: "Website Redesign (10 pages)", quantity: 10, unitPrice: 8000, amount: 80000 },
        { description: "Logo & Style Guide", quantity: 1, unitPrice: 10000, amount: 10000 },
      ],
      subtotal: 145000,
      taxRate: 0,
      taxAmount: 0,
      description: "Full brand overhaul including logo, style guide, and responsive website.",
    },
    {
      proposalCode: "PROP-003",
      subject: "Enterprise CRM Implementation",
      projectName: "HarborView Digital Transformation",
      clientName: "HarborView",
      clientCompany: "HarborView Corp",
      clientEmail: "it@harborview.com",
      clientAvatarColor: "bg-violet-500",
      status: "Draft",
      totalValue: 320000,
      currency: "USD",
      issueDate: d(-5),
      openTill: d(60),
      items: [
        { description: "CRM Setup & Configuration", quantity: 1, unitPrice: 120000, amount: 120000 },
        { description: "Data Migration", quantity: 1, unitPrice: 80000, amount: 80000 },
        { description: "Training & Onboarding (20 users)", quantity: 20, unitPrice: 6000, amount: 120000 },
      ],
      subtotal: 320000,
      taxRate: 0,
      taxAmount: 0,
      description: "Full enterprise CRM rollout covering configuration, data migration, and team onboarding.",
    },
    {
      proposalCode: "PROP-004",
      subject: "Mobile App Development",
      projectName: "CoastalStar Customer App",
      clientName: "CoastalStar Co.",
      clientCompany: "CoastalStar Co.",
      clientEmail: "dev@coastalstar.co",
      clientAvatarColor: "bg-emerald-500",
      status: "Declined",
      totalValue: 98500,
      currency: "USD",
      issueDate: d(-45),
      openTill: d(-5),
      items: [
        { description: "UI/UX Design (iOS & Android)", quantity: 1, unitPrice: 35000, amount: 35000 },
        { description: "App Development (React Native)", quantity: 1, unitPrice: 55000, amount: 55000 },
        { description: "QA & Testing", quantity: 1, unitPrice: 8500, amount: 8500 },
      ],
      subtotal: 98500,
      taxRate: 0,
      taxAmount: 0,
      description: "Cross-platform mobile app for customer portal and loyalty rewards.",
    },
    {
      proposalCode: "PROP-005",
      subject: "Cloud Infrastructure & DevOps Setup",
      projectName: "SummitPeak Scaling Initiative",
      clientName: "Summit Peak",
      clientCompany: "Summit Peak Ventures",
      clientEmail: "ops@summitpeak.io",
      clientAvatarColor: "bg-sky-500",
      status: "Sent",
      totalValue: 175000,
      currency: "USD",
      issueDate: d(-10),
      openTill: d(25),
      items: [
        { description: "Cloud Architecture Design", quantity: 1, unitPrice: 45000, amount: 45000 },
        { description: "CI/CD Pipeline Setup", quantity: 1, unitPrice: 65000, amount: 65000 },
        { description: "Monitoring & Alerting (12 months)", quantity: 12, unitPrice: 5417, amount: 65000 },
      ],
      subtotal: 175000,
      taxRate: 0,
      taxAmount: 0,
      description: "End-to-end DevOps setup with cloud migration and automated deployment pipelines.",
    },
    {
      proposalCode: "PROP-006",
      subject: "E-Commerce Platform Development",
      projectName: "BlueSky Marketplace",
      clientName: "BlueSky Industries",
      clientCompany: "BlueSky Industries",
      clientEmail: "projects@bluesky.ind",
      clientAvatarColor: "bg-teal-500",
      status: "Accepted",
      totalValue: 285000,
      currency: "USD",
      issueDate: d(-60),
      openTill: d(-20),
      items: [
        { description: "E-Commerce Platform (Next.js)", quantity: 1, unitPrice: 150000, amount: 150000 },
        { description: "Payment Gateway Integration", quantity: 3, unitPrice: 20000, amount: 60000 },
        { description: "Product Catalogue Migration", quantity: 1, unitPrice: 35000, amount: 35000 },
        { description: "SEO Launch Package", quantity: 1, unitPrice: 40000, amount: 40000 },
      ],
      subtotal: 285000,
      taxRate: 0,
      taxAmount: 0,
      description: "Full-stack e-commerce platform with multi-vendor support and integrated payment solutions.",
    },
    {
      proposalCode: "PROP-007",
      subject: "AI Chatbot Integration",
      projectName: "SilverHawk AI Assistant",
      clientName: "SilverHawk Corp",
      clientCompany: "SilverHawk Corp",
      clientEmail: "ai@silverhawk.com",
      clientAvatarColor: "bg-orange-500",
      status: "Draft",
      totalValue: 92000,
      currency: "USD",
      issueDate: d(-2),
      openTill: d(45),
      items: [
        { description: "AI Model Fine-tuning", quantity: 1, unitPrice: 40000, amount: 40000 },
        { description: "Chatbot UI Development", quantity: 1, unitPrice: 28000, amount: 28000 },
        { description: "API Integration & Testing", quantity: 1, unitPrice: 24000, amount: 24000 },
      ],
      subtotal: 92000,
      taxRate: 0,
      taxAmount: 0,
      description: "Custom AI chatbot integrated with existing CRM and customer support platform.",
    },
    {
      proposalCode: "PROP-008",
      subject: "Data Analytics Dashboard",
      projectName: "RiverStone Business Intelligence",
      clientName: "RiverStone Ventures",
      clientCompany: "RiverStone Ventures",
      clientEmail: "analytics@riverstone.vc",
      clientAvatarColor: "bg-amber-500",
      status: "Expired",
      totalValue: 68000,
      currency: "USD",
      issueDate: d(-90),
      openTill: d(-30),
      items: [
        { description: "Dashboard Design & Architecture", quantity: 1, unitPrice: 28000, amount: 28000 },
        { description: "Data Pipeline Setup", quantity: 1, unitPrice: 25000, amount: 25000 },
        { description: "Training & Handover", quantity: 1, unitPrice: 15000, amount: 15000 },
      ],
      subtotal: 68000,
      taxRate: 0,
      taxAmount: 0,
      description: "Executive analytics dashboard with live KPIs, sales forecasting, and drill-down reports.",
    },
  ];

  return seed.map((p) => ({ ...p, tenantId }));
}

// ─── GET: List proposals for current tenant ───────────────────────────────────
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const project = searchParams.get("project") || "";

    // Seed demo data if the tenant has no proposals
    const existingCount = await Proposal.countDocuments({ tenantId: tenantObjectId });
    if (existingCount === 0) {
      const demos = buildDemoProposals(tenantObjectId);
      await Proposal.insertMany(demos);
    }

    // Build query
    const query: Record<string, unknown> = { tenantId: tenantObjectId };
    if (status && status !== "All") query.status = status;
    if (project) query.projectName = { $regex: project, $options: "i" };
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { clientName: { $regex: search, $options: "i" } },
        { proposalCode: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
      ];
    }

    const proposals = await Proposal.find(query)
      .sort({ issueDate: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ proposals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/bd/proposals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Create a new proposal ─────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      subject, projectName, clientName, clientEmail, clientCompany,
      items = [], taxRate = 0, currency = "USD",
      discountType = "fixed", discountValue = 0,
      issueDate, openTill, status = "Draft",
      signedBy, signedAt,
      assignedTo = [], tags = [], attachments = [], description = "", terms = "",
      dealId, leadId,
    } = body;

    if (!subject || !clientName || !issueDate || !openTill) {
      return NextResponse.json({ error: "subject, clientName, issueDate and openTill are required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // Generate unique proposal code
    const count = await Proposal.countDocuments({ tenantId: tenantObjectId });
    const proposalCode = `PROP-${String(count + 1).padStart(3, "0")}`;

    // Calculate totals
    const subtotal = items.reduce((s: number, i: { amount: number }) => s + (Number(i.amount) || 0), 0);
    const discVal = Number(discountValue) || 0;
    const discountAmount = discountType === "percent" ? parseFloat(((subtotal * discVal) / 100).toFixed(2)) : discVal;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = parseFloat(((taxableAmount * Number(taxRate)) / 100).toFixed(2));
    const totalValue = taxableAmount + taxAmount;

    const colorIndex = count % AVATAR_COLORS.length;
    const clientAvatarColor = AVATAR_COLORS[colorIndex];

    const proposal = await Proposal.create({
      tenantId: tenantObjectId,
      proposalCode,
      subject,
      projectName,
      clientName,
      clientEmail,
      clientCompany,
      clientAvatarColor,
      items,
      subtotal,
      discountType,
      discountValue: discVal,
      discountAmount,
      taxRate: Number(taxRate),
      taxAmount,
      totalValue,
      currency,
      issueDate: new Date(issueDate),
      openTill: new Date(openTill),
      status,
      signedBy,
      signedAt: signedAt ? new Date(signedAt) : undefined,
      assignedTo,
      tags,
      attachments,
      description,
      terms,
      ...(dealId && mongoose.Types.ObjectId.isValid(dealId) ? { dealId: new mongoose.Types.ObjectId(dealId) } : {}),
      ...(leadId && mongoose.Types.ObjectId.isValid(leadId) ? { leadId: new mongoose.Types.ObjectId(leadId) } : {}),
      createdBy: new mongoose.Types.ObjectId(session.userId),
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/bd/proposals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH: Update proposal ───────────────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Valid proposal id required" }, { status: 400 });


    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // Recalculate financials if items, taxRate, or discount are updated
    if (updates.items || updates.taxRate !== undefined || updates.discountValue !== undefined || updates.discountType !== undefined) {
      const existing = await Proposal.findOne({ _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId }).lean();
      const items = updates.items ?? existing?.items ?? [];
      const taxRate = Number(updates.taxRate !== undefined ? updates.taxRate : existing?.taxRate ?? 0);
      const discountType = updates.discountType ?? existing?.discountType ?? "fixed";
      const discVal = Number(updates.discountValue !== undefined ? updates.discountValue : existing?.discountValue ?? 0);
      const subtotal = items.reduce((s: number, i: { amount: number }) => s + (Number(i.amount) || 0), 0);
      const discountAmount = discountType === "percent" ? parseFloat(((subtotal * discVal) / 100).toFixed(2)) : discVal;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
      updates.subtotal = subtotal;
      updates.discountType = discountType;
      updates.discountValue = discVal;
      updates.discountAmount = discountAmount;
      updates.taxAmount = taxAmount;
      updates.totalValue = taxableAmount + taxAmount;
    }

    if (updates.issueDate) updates.issueDate = new Date(updates.issueDate);
    if (updates.openTill) updates.openTill = new Date(updates.openTill);

    const proposal = await Proposal.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId },
      { $set: updates },
      { new: true }
    );

    if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

    return NextResponse.json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/bd/proposals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: Remove proposal ──────────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Proposal id required" }, { status: 400 });

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    const deleted = await Proposal.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: tenantObjectId,
    });

    if (!deleted) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/bd/proposals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
