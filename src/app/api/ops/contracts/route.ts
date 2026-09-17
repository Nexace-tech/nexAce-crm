import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ClientContract } from "@/models/ClientContract";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/mail";

// ── GET  /api/ops/contracts ────────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireTenantSession();
    if (isAuthError(auth)) return auth;
    const { tenantObjectId } = auth;

    await connectToDatabase();

    const [contracts, tenant] = await Promise.all([
      ClientContract.find({ tenantId: tenantObjectId })
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean(),
      Tenant.findById(tenantObjectId).lean(),
    ]);

    const organization = tenant ? {
      name:    tenant.legalName?.trim() || tenant.name?.trim() || "",
      address: tenant.address?.trim() || "",
      city:    tenant.city?.trim() || "",
      country: tenant.country?.trim() || "",
      phone:   tenant.phone?.trim() || tenant.tollFreePhone?.trim() || "",
      email:   tenant.email?.trim() || tenant.billingEmail?.trim() || "",
      website: tenant.website?.trim() || "",
      taxId:   tenant.taxId?.trim() || "",
    } : null;

    return NextResponse.json({ contracts, organization });
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
      budget,
      currency,
      ndaAttachment,
      agreementAttachment,
      otherAttachments,
      status,
      mailSent,
      notifyOnCreate,
      generateInvoice,
      notes,
    } = body;

    // Detailed validation with clear field-level feedback
    if (!sender?.name?.trim()) {
      return NextResponse.json({ error: "Sender company name is required" }, { status: 400 });
    }
    if (!receiver?.name?.trim()) {
      return NextResponse.json({ error: "Client company name is required" }, { status: 400 });
    }
    if (!pocName?.trim()) {
      return NextResponse.json({ error: "Point of contact (POC) name is required" }, { status: 400 });
    }
    if (!pocEmail?.trim()) {
      return NextResponse.json({ error: "Point of contact (POC) email is required" }, { status: 400 });
    }
    if (!contractType) {
      return NextResponse.json({ error: "Contract type is required" }, { status: 400 });
    }

    const parsedStart = startDate && !isNaN(new Date(startDate).getTime()) ? new Date(startDate) : undefined;
    const parsedEnd   = endDate   && !isNaN(new Date(endDate).getTime())   ? new Date(endDate)   : undefined;

    const contract = await ClientContract.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      clientCompany: receiver.name.trim(),
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
      startDate: parsedStart,
      endDate:   parsedEnd,
      budget:    typeof budget === "number" ? budget : (parseFloat(budget) || 0),
      currency:  currency?.trim() || "USD",
      ndaAttachment:       ndaAttachment?.url ? ndaAttachment : undefined,
      agreementAttachment: agreementAttachment?.url ? agreementAttachment : undefined,
      otherAttachments:    Array.isArray(otherAttachments) ? otherAttachments.filter((a: any) => a?.url) : [],
      status:          status || "Draft",
      mailSent:        !!mailSent,
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

        const contractBudget = typeof budget === "number" ? budget : (parseFloat(budget) || 0);
        const contractCurrency = currency?.trim() || "USD";

        const invoice = await FinanceInvoice.create({
          tenantId:  tenantObjectId,
          createdBy: userObjectId,
          invoiceNo,
          client:    receiver.name.trim(),
          amount:    contractBudget,
          currency:  contractCurrency,
          status:    "Draft",
          issuedDate: today.toISOString().split("T")[0],
          dueDate:    dueDate.toISOString().split("T")[0],
          category:   "Contract",
          venture:    sender.name.trim(),
          lineItems: [
            {
              description: `${typeLabel} Contract — ${pocName.trim()}`,
              quantity:    1,
              unitPrice:   contractBudget,
              amount:      contractBudget,
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

    // ── Send Email confirmation to POC if requested ──────────────────────────
    if (mailSent && pocEmail) {
      try {
        const typeLabel =
          contractType === "Custom" && customTypeLabel
            ? customTypeLabel
            : contractType.replace("_", " ");

        const formattedStart = startDate
          ? new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "Not specified";
        const formattedEnd = endDate
          ? new Date(endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "Not specified";

        await sendEmail({
          to: pocEmail.trim().toLowerCase(),
          subject: `Contract Agreement: ${sender.name.trim()} & ${receiver.name.trim()}`,
          text: `Dear ${pocName.trim()},\n\nA new ${typeLabel} contract has been confirmed between ${sender.name.trim()} and ${receiver.name.trim()}.\nContract Period: ${formattedStart} to ${formattedEnd}\nStatus: ${status || "Draft"}\n\nBest regards,\n${sender.name.trim()}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
              <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #1e293b; font-size: 20px; font-weight: 700;">Client Contract Confirmation</h2>
                <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">NexAce CRM • Operations</p>
              </div>
              <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Dear <strong>${pocName.trim()}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                This email confirms that the contract agreement between <strong>${sender.name.trim()}</strong> and <strong>${receiver.name.trim()}</strong> has been recorded in our system.
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                  <tbody>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; width: 35%;">Contract Type:</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${typeLabel}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Client (Receiver):</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${receiver.name.trim()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Issuer (Sender):</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${sender.name.trim()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Effective Period:</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${formattedStart} — ${formattedEnd}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b;">Status:</td>
                      <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${status || "Draft"}</td>
                    </tr>
                    ${notes?.trim() ? `
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Notes:</td>
                      <td style="padding: 6px 0; color: #334155;">${notes.trim()}</td>
                    </tr>` : ""}
                  </tbody>
                </table>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px;">
                If you have any questions, please reply directly or contact ${sender.email || sender.name.trim()}.
              </p>
              <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
                Generated by NexAce CRM • Automated Notification
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("[OPS/CONTRACTS] Email notification failed:", mailErr);
      }
    }

    const populated = await ClientContract.findById(contract._id)
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json({ contract: populated }, { status: 201 });
  } catch (err: any) {
    console.error("[OPS/CONTRACTS POST]", err);
    let errorMsg = "Failed to create contract";
    if (err?.name === "ValidationError") {
      errorMsg = Object.values(err.errors || {})
        .map((e: any) => e.message)
        .join(", ") || err.message;
    } else if (err?.message) {
      errorMsg = err.message;
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
