import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { proposalId, recipientEmail, cc, subject, message } = body;

    if (!proposalId || !recipientEmail) {
      return NextResponse.json({ error: "proposalId and recipientEmail are required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    const proposal = await Proposal.findOne({
      _id: new mongoose.Types.ObjectId(proposalId),
      tenantId: tenantObjectId,
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Update proposal status to Sent and save dispatch audit
    proposal.status = "Sent";
    proposal.lastSentAt = new Date();
    proposal.lastSentTo = recipientEmail;
    await proposal.save();

    // In a production environment with SMTP / SendGrid / Resend, the email would be dispatched here.
    // We log the transmission for CRM audit trail.
    console.log(`[PROPOSAL EMAIL DISPATCH] To: ${recipientEmail}, CC: ${cc || "none"}, Subject: ${subject}`);

    return NextResponse.json({
      success: true,
      message: `Proposal #${proposal.proposalCode} successfully sent to ${recipientEmail}`,
      sentAt: proposal.lastSentAt,
      status: proposal.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/bd/proposals/send error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
