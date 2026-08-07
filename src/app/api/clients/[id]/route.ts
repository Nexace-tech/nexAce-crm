import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import mongoose from "mongoose";

/**
 * GET single client
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const client = await Client.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Server Error" }, { status: 500 });
  }
}

/**
 * PATCH: Update client retainer details OR add a contact log entry
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectToDatabase();

    const client = await Client.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Mode A: Log retainer hours used
    if (typeof body.logHours === "number") {
      client.usedHours = (client.usedHours || 0) + body.logHours;
    }

    // Mode B: Add contact history interaction log
    if (body.contactLog) {
      const { type, summary } = body.contactLog;
      client.contactHistory.push({
        date: new Date(),
        type: type || "Note",
        summary: summary || "Client interaction logged.",
        authorName: session.userName,
      });
    }

    // Mode C: Update fields directly
    if (body.name) client.name = body.name;
    if (body.company) client.company = body.company;
    if (body.email) client.email = body.email;
    if (body.phone !== undefined) client.phone = body.phone;
    if (body.status) client.status = body.status;
    if (body.pipelineStage) client.pipelineStage = body.pipelineStage;
    if (body.retainerHours !== undefined) client.retainerHours = body.retainerHours;
    if (body.usedHours !== undefined && typeof body.logHours !== "number") client.usedHours = body.usedHours;
    if (body.monthlyValue !== undefined) client.monthlyValue = body.monthlyValue;
    if (body.renewalDate !== undefined) client.renewalDate = body.renewalDate ? new Date(body.renewalDate) : undefined;
    if (body.notes !== undefined) client.notes = body.notes;

    await client.save();

    return NextResponse.json({ success: true, client });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Server Error" }, { status: 500 });
  }
}

/**
 * DELETE client
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin" && session.role !== "Manager") {
      return NextResponse.json({ error: "Forbidden: Admins or Managers only" }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const client = await Client.findOneAndDelete({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Client deleted successfully" });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Server Error" }, { status: 500 });
  }
}
