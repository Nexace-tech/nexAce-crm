import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * GET: Fetch all client retainers for the authenticated tenant.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const clients = await Client.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 });

    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error("API GET Clients error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Create a new client retainer profile.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    const body = await request.json();
    const { name, company, email, phone, status, retainerHours, usedHours, monthlyValue, notes } = body;

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: "Client Name, Company, and Email are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newClient = await Client.create({
      name,
      company,
      email,
      phone: phone || "",
      status: status || "Active",
      retainerHours: Number(retainerHours) || 0,
      usedHours: Number(usedHours) || 0,
      monthlyValue: Number(monthlyValue) || 0,
      notes: notes || "",
      tenantId: tenantObjectId,
    });

    return NextResponse.json({ client: newClient, message: "Client created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Client error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
