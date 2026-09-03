import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { Notification } from "@/models/Notification";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/mail";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();

    let query: Record<string, any> = { tenantId: tenantObjectId };

    if (!isPrivileged) {
      const userDoc = await User.findById(userObjectId).select("email").lean();
      const userEmail = (userDoc as { email?: string } | null)?.email;
      const orConditions: any[] = [{ createdBy: userObjectId }];
      if (userEmail) {
        orConditions.push({ businessEmail: new RegExp(`^${userEmail.trim()}$`, "i") });
      }
      if (session.userName) {
        orConditions.push({ businessName: new RegExp(`^${session.userName.trim()}$`, "i") });
      }
      query.$or = orConditions;
    }

    const invoices = await ITInvoice.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ invoices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/invoices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const {
      invoiceNo,
      invoiceDate,
      dueDate,
      customerNo,
      businessName,
      businessAddress,
      businessEmail,
      billedToName,
      billedToAddress,
      billedToEmail,
      shipToAddress,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency,
      status,
      notes,
      shiftAttendance,
      timesheetEntries,
    } = body;

    if (!invoiceNo || !billedToName) {
      return NextResponse.json({ error: "Invoice Number and Billed To Name are required." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await ITInvoice.findOne({ tenantId: tenantObjectId, invoiceNo: invoiceNo.trim() });
    if (existing) {
      return NextResponse.json({ error: `Invoice with number ${invoiceNo} already exists.` }, { status: 400 });
    }

    const created = await ITInvoice.create({
      tenantId: tenantObjectId,
      invoiceNo: invoiceNo.trim(),
      invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      customerNo: customerNo || "",
      businessName: businessName || "Hencework",
      businessAddress: businessAddress || "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
      businessEmail: businessEmail || "jampack_01@hencework.com",
      billedToName: billedToName.trim(),
      billedToAddress: billedToAddress || "",
      billedToEmail: billedToEmail || "",
      shipToAddress: shipToAddress || "",
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount: Number(taxAmount) || 0,
      total: Number(total) || 0,
      currency: currency || "INR",
      status: status || "Draft",
      notes: notes || "",
      // Structured shift clock & timesheet data for admin visibility
      shiftAttendance: shiftAttendance || null,
      timesheetEntries: timesheetEntries || null,
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_INVOICE_CREATED",
      targetName: created.invoiceNo,
      details: `Created invoice ${created.invoiceNo} for ${billedToName.trim()} (₹${total || 0})`,
    });

    // Notify all Admins / OPS / Managers + the submitter's Reporting Manager
    try {
      const admins = await User.find({
        tenantId: tenantObjectId,
        role: { $in: ["Admin", "OPS", "Manager"] },
      }).select("_id");

      // Collect IDs already notified to avoid duplicates
      const notifiedIds = new Set<string>();

      for (const admin of admins) {
        const idStr = admin._id.toString();
        notifiedIds.add(idStr);
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: admin._id,
          title: "New Invoice Submitted",
          message: `${session.userName} submitted invoice ${created.invoiceNo} for ${billedToName.trim()} (${currency || "INR"} ${Number(total || 0).toLocaleString()}). Review and update its status.`,
          type: "system",
          linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(created.invoiceNo)}`,
          read: false,
        });
      }

      // Also notify the submitter's Reporting Manager if set and not already notified
      const submitterDoc = await User.findById(userObjectId).select("managerId").lean() as { managerId?: mongoose.Types.ObjectId } | null;
      if (submitterDoc?.managerId && !notifiedIds.has(submitterDoc.managerId.toString())) {
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: submitterDoc.managerId,
          title: "New Invoice Submitted",
          message: `${session.userName} submitted invoice ${created.invoiceNo} for ${billedToName.trim()} (${currency || "INR"} ${Number(total || 0).toLocaleString()}). Review and update its status.`,
          type: "system",
          linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(created.invoiceNo)}`,
          read: false,
        });
      }
    } catch (notifErr) {
      console.error("Invoice notification error:", notifErr);
    }

    // Send confirmation email to the submitting user
    try {
      const submitter = await User.findById(userObjectId).select("email name").lean() as { email?: string; name?: string } | null;
      if (submitter?.email) {
        await sendEmail({
          to: submitter.email,
          subject: `[NexAce CRM] Invoice ${created.invoiceNo} Submitted Successfully`,
          text: `Hello ${submitter.name || session.userName},\n\nYour invoice ${created.invoiceNo} for ${billedToName.trim()} (${currency || "INR"} ${Number(total || 0).toLocaleString()}) has been submitted and is pending review.\n\nLog in to your NexAce dashboard to track its status.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h2 style="color: #4f46e5; margin-top: 0;">✦ Invoice Submitted</h2>
              <p style="color: #475569; font-size: 14px;">Hello <strong>${submitter.name || session.userName}</strong>,</p>
              <p style="color: #475569; font-size: 14px;">Your invoice has been submitted and is <strong>pending review</strong> by your admin team.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${created.invoiceNo}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Billed To:</strong> ${billedToName.trim()}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ${currency || "INR"} ${Number(total || 0).toLocaleString()}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">You will be notified when the status is updated by your admin.</p>
              <p style="color: #94a3b8; font-size: 12px;">Log in to <a href="/dashboard/settings?tab=invoice" style="color: #4f46e5;">NexAce CRM</a> to view your invoice history.</p>
            </div>
          `,
        });
      }
    } catch (mailErr) {
      console.error("Invoice confirmation email error:", mailErr);
    }

    return NextResponse.json({ invoice: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/invoices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
