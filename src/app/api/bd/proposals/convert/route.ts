import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { Project } from "@/models/Project";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { proposalId, convertTo } = body; // convertTo: "invoice" | "project"

    if (!proposalId || !convertTo) {
      return NextResponse.json({ error: "proposalId and convertTo ('invoice' | 'project') are required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const proposal = await Proposal.findOne({
      _id: new mongoose.Types.ObjectId(proposalId),
      tenantId: tenantObjectId,
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (convertTo === "invoice") {
      // Generate invoice number
      const count = await FinanceInvoice.countDocuments({ tenantId: tenantObjectId });
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      const issueDateStr = proposal.issueDate ? new Date(proposal.issueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      const dueDateStr = proposal.openTill ? new Date(proposal.openTill).toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const lineItems = (proposal.items || []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      }));

      // Create FinanceInvoice record in Finance Portal (Corporate & External Client Billing)
      const financeInvoice = await FinanceInvoice.create({
        tenantId: tenantObjectId,
        createdBy: userObjectId,
        invoiceNo,
        client: proposal.clientName,
        amount: proposal.totalValue,
        currency: proposal.currency || "USD",
        status: "Pending",
        issuedDate: issueDateStr,
        dueDate: dueDateStr,
        category: "Client Billing",
        venture: "Ace Consultancys",
        lineItems,
        notes: `Converted from Proposal #${proposal.proposalCode} - ${proposal.subject}`,
      });

      proposal.convertedInvoiceId = financeInvoice._id as mongoose.Types.ObjectId;
      await proposal.save();

      return NextResponse.json({
        success: true,
        message: `Successfully converted to Invoice ${invoiceNo}`,
        invoiceId: financeInvoice._id,
        invoiceNo,
      });
    } else if (convertTo === "project") {
      const projectName = proposal.projectName || `${proposal.clientName} - ${proposal.subject}`;
      
      const project = await Project.create({
        tenantId: tenantObjectId,
        name: projectName,
        description: proposal.description || `Project initiated from accepted Proposal #${proposal.proposalCode}.\n\nScope:\n${(proposal.items || []).map(i => `- ${i.description} ($${i.amount})`).join("\n")}`,
        status: "In Progress",
        priority: "High",
        startDate: proposal.issueDate || new Date(),
        dueDate: proposal.openTill || new Date(Date.now() + 60 * 86400000),
        cost: proposal.totalValue,
        isInternal: false,
        members: [userObjectId],
      });

      proposal.convertedProjectId = project._id as mongoose.Types.ObjectId;
      await proposal.save();

      return NextResponse.json({
        success: true,
        message: `Successfully converted to Project '${projectName}'`,
        projectId: project._id,
        projectName,
      });
    }

    return NextResponse.json({ error: "Invalid convertTo value" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/bd/proposals/convert error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
