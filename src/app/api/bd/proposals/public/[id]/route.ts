import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Proposal } from "@/models/Proposal";
import mongoose from "mongoose";

// GET: Fetch proposal for public client review
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
    }

    await connectToDatabase();
    const proposal = await Proposal.findById(id).lean();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/bd/proposals/public/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Public client action (Accept & Sign OR Request Changes / Decline)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid proposal ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action, signedBy, signatureType, signatureImage, clientNotes } = body;
    // action: "accept" | "decline"

    await connectToDatabase();
    const proposal = await Proposal.findById(id);

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (action === "accept") {
      proposal.status = "Accepted";
      proposal.signedBy = signedBy || proposal.clientName;
      proposal.signedAt = new Date();
      if (signatureType) proposal.signatureType = signatureType;
      if (signatureImage) proposal.signatureImage = signatureImage;
      if (clientNotes) proposal.clientNotes = clientNotes;
      await proposal.save();

      return NextResponse.json({
        success: true,
        message: "Proposal accepted and signed successfully!",
        proposal,
      });
    } else if (action === "decline") {
      proposal.status = "Declined";
      if (clientNotes) proposal.clientNotes = clientNotes;
      await proposal.save();

      return NextResponse.json({
        success: true,
        message: "Proposal status updated.",
        proposal,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/bd/proposals/public/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
