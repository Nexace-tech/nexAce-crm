import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * PATCH: Update client details or log retainer hours.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const { tenantObjectId } = authResult;
    const body = await request.json();

    await connectToDatabase();

    const client = await Client.findOne({ _id: id, tenantId: tenantObjectId });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (body.name !== undefined) client.name = body.name;
    if (body.company !== undefined) client.company = body.company;
    if (body.email !== undefined) client.email = body.email;
    if (body.phone !== undefined) client.phone = body.phone;
    if (body.status !== undefined) client.status = body.status;
    if (body.retainerHours !== undefined) client.retainerHours = Number(body.retainerHours);
    if (body.usedHours !== undefined) client.usedHours = Number(body.usedHours);
    if (body.logHours !== undefined) client.usedHours = Math.max(0, client.usedHours + Number(body.logHours));
    if (body.monthlyValue !== undefined) client.monthlyValue = Number(body.monthlyValue);
    if (body.notes !== undefined) client.notes = body.notes;

    await client.save();

    return NextResponse.json({ client, message: "Client updated successfully" });
  } catch (error: any) {
    console.error("API PATCH Client error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove a client retainer record (Admin only).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const { tenantObjectId } = authResult;

    await connectToDatabase();

    const deletedClient = await Client.findOneAndDelete({ _id: id, tenantId: tenantObjectId });
    if (!deletedClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Client record deleted successfully" });
  } catch (error: any) {
    console.error("API DELETE Client error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
