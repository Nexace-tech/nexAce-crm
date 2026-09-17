import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ClientContract } from "@/models/ClientContract";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

// ── GET  /api/ops/contracts ────────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireTenantSession();
    if (isAuthError(auth)) return auth;
    const { tenantObjectId } = auth;

    await connectToDatabase();

    const contracts = await ClientContract.find({ tenantId: tenantObjectId })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ contracts });
  } catch (err) {
    console.error("[OPS/CONTRACTS GET]", err);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

// ── POST /api/ops/contracts ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await requireTenantSession();
    if (isAuthError(auth)) return auth;
    const { tenantObjectId, userObjectId } = auth;

    await connectToDatabase();

    const body = await req.json();
    const {
      sender,          // { name, address, city, country, phone, email, website, taxId }
      receiver,        // { name, address, city, country, phone, email, website, taxId }
      pocName,
      pocEmail,
      pocPhone,
      contractType,
      customTypeLabel,
      location,
      startDate,
      endDate,
      ndaAttachment,
      agreementAttachment,
      otherAttachments,
      status,
      notifyOnCreate,
      generateInvoice,
      notes,
    } = body;

    // Basic validation
    if (!sender?.name?.trim() || !receiver?.name?.trim() || !pocName?.trim() || !pocEmail?.trim() || !contractType) {
      return NextResponse.json(
        { error: "sender.name, receiver.name, pocName, pocEmail, and contractType are required" },
        { status: 400 }
      );
    }

    const contract = await ClientContract.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      sender: {
        name:    sender.name.trim(),
        address: sender.address?.trim() || undefined,
        city:    sender.city?.trim() || undefined,
        country: sender.country?.trim() || undefined,
        phone:   sender.phone?.trim() || undefined,
        email:   sender.email?.trim().toLowerCase() || undefined,
        website: sender.website?.trim() || undefined,
        taxId:   sender.taxId?.trim() || undefined,
      },
      receiver: {
        name:    receiver.name.trim(),
        address: receiver.address?.trim() || undefined,
        city:    receiver.city?.trim() || undefined,
        country: receiver.country?.trim() || undefined,
        phone:   receiver.phone?.trim() || undefined,
        email:   receiver.email?.trim().toLowerCase() || undefined,
        website: receiver.website?.trim() || undefined,
        taxId:   receiver.taxId?.trim() || undefined,
      },
      pocName:  pocName.trim(),
      pocEmail: pocEmail.trim().toLowerCase(),
      pocPhone: pocPhone?.trim() || undefined,
      contractType,
      customTypeLabel: contractType === "Custom" ? customTypeLabel?.trim() || undefined : undefined,
      location: location?.trim() || "",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate:   endDate ? new Date(endDate) : undefined,
      ndaAttachment:       ndaAttachment?.url ? ndaAttachment : undefined,
      agreementAttachment: agreementAttachment?.url ? agreementAttachment : undefined,
      otherAttachments:    Array.isArray(otherAttachments) ? otherAttachments.filter((a: any) => a?.url) : [],
      status:          status || "Draft",
      notifyOnCreate:  !!notifyOnCreate,
      generateInvoice: !!generateInvoice,
      notes: notes?.trim() || undefined,
    });

    // ── Auto-generate a Draft invoice in Finance if requested ─────────────────
    if (generateInvoice) {
      try {
        const today   = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 30);

        const count     = await FinanceInvoice.countDocuments({ tenantId: tenantObjectId });
        const invoiceNo = `INV-${String(count + 1).padStart(4, "0")}`;

        const typeLabel =
          contractType === "Custom" && customTypeLabel
            ? customTypeLabel
            : contractType === "Ad_Hoc"
            ? "Ad Hoc"
            : contractType;

        const invoice = await FinanceInvoice.create({
          tenantId:  tenantObjectId,
          createdBy: userObjectId,
          invoiceNo,
          client:    receiver.name.trim(),
          amount:    0,
          currency:  "USD",
          status:    "Draft",
          issuedDate: today.toISOString().split("T")[0],
          dueDate:    dueDate.toISOString().split("T")[0],
          category:   "Contract",
          venture:    sender.name.trim(),
          lineItems: [
            {
              description: `${typeLabel} Contract — ${pocName.trim()}`,
              quantity:    1,
              unitPrice:   0,
              amount:      0,
            },
          ],
          notes: `Auto-generated from Client Contract. Client: ${receiver.name.trim()}, POC: ${pocName.trim()} <${pocEmail.trim()}>`,
        });

        await ClientContract.findByIdAndUpdate(contract._id, {
          linkedInvoiceId: invoice._id,
        });
      } catch (invErr) {
        console.error("[OPS/CONTRACTS] Invoice generation failed:", invErr);
      }
    }

    // ── Notify admin/OPS users if requested ──────────────────────────────────
    if (notifyOnCreate) {
      try {
        const adminUsers = (await User.find({
          tenantId: tenantObjectId,
          role:     { $in: ["Admin", "OPS"] as string[] },
          status:   "active",
        } as Record<string, unknown>)
          .select("_id")
          .lean()) as Array<{ _id: unknown }>;

        const notifications = adminUsers.map((u: any) => ({
          recipientId: u._id,
          tenantId:    tenantObjectId,
          title:       "New Client Contract Created",
          message:     `A new ${contractType.replace("_", " ")} contract has been created for ${receiver.name.trim()} (POC: ${pocName.trim()}).`,
          type:        "system" as const,
          linkUrl:     "/dashboard/clients?tab=contracts",
          read:        false,
          adminOnly:   true,
        }));

        if (notifications.length) {
          await Notification.insertMany(notifications);
        }
      } catch (notifErr) {
        console.error("[OPS/CONTRACTS] Notification failed:", notifErr);
      }
    }

    const populated = await ClientContract.findById(contract._id)
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json({ contract: populated }, { status: 201 });
  } catch (err) {
    console.error("[OPS/CONTRACTS POST]", err);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}
