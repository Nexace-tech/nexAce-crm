import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { Notification } from "@/models/Notification";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/mail";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import mongoose from "mongoose";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();

    // Auto-generate invoices for any active/renewed subscriptions
    try {
      const { autoGenerateAllSubscriptionInvoices } = await import("@/lib/it-subscription-invoice");
      await autoGenerateAllSubscriptionInvoices({
        tenantObjectId,
        userObjectId: isPrivileged ? userObjectId : undefined,
        userName: session.userName,
        ownerFilter: !isPrivileged ? session.userName : undefined,
      });
    } catch (invErr) {
      console.error("autoGenerateAllSubscriptionInvoices in invoices GET error:", invErr);
    }

    const query: Record<string, any> = { tenantId: tenantObjectId };

    const { getHRAccessScope } = await import("@/lib/hrIsolation");
    const hrScope = await getHRAccessScope(session, tenantObjectId, userObjectId);

    if (hrScope.isHR) {
      if (hrScope.isIsolated && hrScope.allowedUserIds) {
        query.createdBy = { $in: hrScope.allowedUserIds };
      }
    } else if (!isPrivileged) {
      const userDoc = await User.findById(userObjectId).select("name email").lean();
      const userEmail = (userDoc as { email?: string; name?: string } | null)?.email?.trim();
      const userName = (userDoc as { email?: string; name?: string } | null)?.name?.trim() || session.userName?.trim();

      const orConditions: any[] = [
        { createdBy: userObjectId },
      ];
      if (userName) {
        const escapedName = userName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orConditions.push({ businessName: new RegExp(`^${escapedName}$`, "i") });
        orConditions.push({ billedToName: new RegExp(`^${escapedName}$`, "i") });
        orConditions.push({ customerNo: new RegExp(userName.replace(/\s+/g, ""), "i") });
      }
      if (userEmail) {
        const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        orConditions.push({ businessEmail: new RegExp(`^${escapedEmail}$`, "i") });
        orConditions.push({ billedToEmail: new RegExp(`^${escapedEmail}$`, "i") });
      }

      query.$or = orConditions;
    }

    const invoices = await ITInvoice.find(query).sort({ createdAt: -1 }).lean();

    // Query FinanceInvoices as well (e.g. Invoices created for this employee by HR or Finance)
    const { FinanceInvoice } = await import("@/models/FinanceInvoice");
    const financeQuery: Record<string, any> = { tenantId: tenantObjectId };

    if (hrScope.isHR) {
      if (hrScope.isIsolated && hrScope.allowedUserIds) {
        financeQuery.createdBy = { $in: hrScope.allowedUserIds };
      }
    } else if (!isPrivileged) {
      const userDoc = await User.findById(userObjectId).select("name email").lean();
      const userEmail = (userDoc as any)?.email?.trim();
      const userName = (userDoc as any)?.name?.trim() || session.userName?.trim();

      const finOr: any[] = [
        { createdBy: userObjectId },
        { targetUserId: userObjectId },
      ];
      if (userEmail) {
        const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        finOr.push({ businessEmail: new RegExp(`^${escapedEmail}$`, "i") });
        finOr.push({ customerNo: new RegExp(`^${escapedEmail}$`, "i") });
      }
      if (userName) {
        const escaped = userName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        finOr.push({ client: new RegExp(`^${escaped}$`, "i") });
        finOr.push({ businessName: new RegExp(`^${escaped}$`, "i") });
      }
      financeQuery.$or = finOr;
    }

    const financeInvoices = await FinanceInvoice.find(financeQuery).sort({ createdAt: -1 }).lean();

    const tenantDoc = await Tenant.findById(tenantObjectId).select("signatureUrl").lean();
    const orgSignatureUrl = (tenantDoc as any)?.signatureUrl?.trim() || "";

    const enrichedInvoices = invoices.map((inv: any) => ({
      ...inv,
      approvedBy: inv.approvedBy || (inv.status === "Paid" ? (inv.paymentDetails?.paidBy || "Admin") : ""),
      approvedAt: inv.approvedAt || (inv.status === "Paid" ? (inv.paymentDetails?.paidAt || inv.updatedAt) : ""),
      signatureUrl: inv.signatureUrl || (inv.status === "Paid" ? orgSignatureUrl : ""),
    }));

    const mappedFinanceInvoices = financeInvoices.map((inv: any) => ({
      _id: inv._id?.toString() || inv._id,
      id: inv._id?.toString() || inv.id,
      invoiceNo: inv.invoiceNo,
      invoiceDate: inv.issuedDate || inv.invoiceDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
      dueDate: inv.dueDate || "",
      customerNo: inv.customerNo || `EMP-${inv.client || "STAFF"}`,
      businessName: inv.businessName || inv.client || "Employee",
      businessEmail: inv.businessEmail || "",
      businessAddress: "Employee / Internal Team",
      billedToName: inv.billedToName || inv.venture || "NexAce Technologies",
      billedToEmail: "finance@nexace.com",
      items: inv.lineItems || [],
      subtotal: inv.amount || 0,
      taxRate: 0,
      taxAmount: 0,
      total: inv.amount || 0,
      currency: inv.currency || "INR",
      status: inv.status || "Pending",
      notes: inv.notes || "",
      signatureUrl: inv.signatureUrl || (inv.status === "Paid" ? orgSignatureUrl : ""),
      approvedBy: inv.approvedBy || (inv.status === "Paid" ? (inv.paymentDetails?.paidBy || "Admin") : ""),
      approvedAt: inv.approvedAt || (inv.status === "Paid" ? (inv.paymentDetails?.paidAt || inv.updatedAt) : ""),
      approverRole: inv.approverRole || "HR",
      paymentDetails: inv.paymentDetails || null,
      bankDetails: inv.bankDetails || null,
      shiftAttendance: inv.shiftAttendance || null,
      timesheetEntries: inv.timesheetEntries || null,
      timeline: inv.timeline || [],
      rejectionReason: inv.rejectionReason || "",
      rejectionRemark: inv.rejectionRemark || "",
      objections: inv.objections || [],
      rejectionHistory: inv.rejectionHistory || [],
      revisionCount: inv.revisionCount || 0,
      approvalStage: inv.approvalStage || "",
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }));

    // Merge and deduplicate by invoiceNo
    const seen = new Set<string>();
    const allInvoices: any[] = [];
    for (const inv of [...enrichedInvoices, ...mappedFinanceInvoices]) {
      const key = (inv.invoiceNo || "").toUpperCase();
      if (!key || !seen.has(key)) {
        if (key) seen.add(key);
        allInvoices.push(inv);
      }
    }

    allInvoices.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.invoiceDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.invoiceDate || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ invoices: allInvoices });
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
      paidDate,
      notes,
      shiftAttendance,
      timesheetEntries,
      signatureUrl,
      bankDetails,
    } = body;

    if (!invoiceNo || !billedToName) {
      return NextResponse.json({ error: "Invoice Number and Billed To Name are required." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await ITInvoice.findOne({ tenantId: tenantObjectId, invoiceNo: invoiceNo.trim() }).lean();
    if (existing) {
      return NextResponse.json({ error: `Invoice with number ${invoiceNo} already exists.` }, { status: 400 });
    }

    const submitterDoc = await User.findById(userObjectId).select("hrId managerId email name").lean() as any;

    const initialTimeline = [
      {
        stage: "SUBMITTED",
        status: status || "Pending",
        actorName: session.userName || "Employee",
        actorRole: session.role || "Employee",
        actorId: userObjectId,
        note: "Invoice generated and submitted for HR timesheet & attendance verification.",
        timestamp: new Date(),
      },
    ];

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
      status: status || "Pending",
      approvalStage: "PENDING_HR",
      paidDate: paidDate || (status === "Paid" ? new Date().toISOString().slice(0, 10) : ""),
      notes: notes || "",
      // Structured shift clock & timesheet data for admin visibility
      shiftAttendance: shiftAttendance || null,
      timesheetEntries: timesheetEntries || null,
      signatureUrl: signatureUrl || "",
      bankDetails: bankDetails ? {
        bankName: (bankDetails.bankName || "").trim(),
        accountNo: (bankDetails.accountNo || "").trim(),
        ifscCode: (bankDetails.ifscCode || "").trim(),
        upiId: (bankDetails.upiId || "").trim(),
      } : undefined,
      timeline: initialTimeline,
      createdBy: userObjectId,
    });

    // ── Auto-sync employee bank details to User profile ──────────────────────
    if (bankDetails && (bankDetails.bankName || bankDetails.accountNo || bankDetails.ifscCode || bankDetails.upiId)) {
      try {
        await User.updateOne(
          { _id: userObjectId },
          {
            $set: {
              "bankDetails.bankName": (bankDetails.bankName || "").trim(),
              "bankDetails.accountNo": (bankDetails.accountNo || "").trim(),
              "bankDetails.ifscCode": (bankDetails.ifscCode || "").trim(),
              "bankDetails.upiId": (bankDetails.upiId || "").trim(),
            },
          }
        );
      } catch (syncErr) {
        console.error("Failed to auto-sync bank details to User profile:", syncErr);
      }
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_INVOICE_CREATED",
      targetName: created.invoiceNo,
      details: `Created invoice ${created.invoiceNo} for ${billedToName.trim()} (₹${total || 0})`,
    });

    // Notify Assigned HR Partner (or all active HRs) + Admins
    try {
      const notifiedIds = new Set<string>();

      // 1. Identify HR Partner(s) to review timesheets
      let hrRecipients: mongoose.Types.ObjectId[] = [];
      if (submitterDoc?.hrId) {
        hrRecipients.push(submitterDoc.hrId);
      } else {
        const activeHRs = await User.find({
          tenantId: tenantObjectId,
          role: "HR",
          status: "Active",
        }).select("_id").lean();
        hrRecipients = activeHRs.map((h) => h._id as mongoose.Types.ObjectId);
      }

      for (const hrId of hrRecipients) {
        const idStr = hrId.toString();
        if (notifiedIds.has(idStr)) continue;
        notifiedIds.add(idStr);
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: hrId,
          title: "New Timesheet Invoice to Review",
          message: `${session.userName} submitted invoice ${created.invoiceNo} (${currency || "INR"} ${Number(total || 0).toLocaleString()}). Please verify shift attendance and project timesheets.`,
          type: "finance",
          linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(created.invoiceNo)}`,
          read: false,
        });
      }

      // 2. Also notify Admins / OPS
      const admins = await User.find({
        tenantId: tenantObjectId,
        role: { $in: ["Admin", "OPS"] },
        status: "Active",
      }).select("_id").lean();

      for (const admin of admins) {
        const idStr = admin._id.toString();
        if (notifiedIds.has(idStr)) continue;
        notifiedIds.add(idStr);
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: admin._id,
          title: "New Invoice Submitted (HR Review Pending)",
          message: `${session.userName} submitted invoice ${created.invoiceNo} for ${billedToName.trim()} (${currency || "INR"} ${Number(total || 0).toLocaleString()}). Routed to HR for timesheet verification.`,
          type: "finance",
          linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(created.invoiceNo)}`,
          read: false,
          adminOnly: true,
        });
      }

      // 3. Send confirmation in-app notification to the Submitter who raised the invoice
      await Notification.create({
        tenantId: tenantObjectId,
        recipientId: userObjectId,
        title: `Invoice ${created.invoiceNo} Submitted to HR`,
        message: `Your invoice ${created.invoiceNo} (${currency || "INR"} ${Number(total || 0).toLocaleString()}) has been submitted and routed to HR for timesheet & attendance verification.`,
        type: "finance",
        linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(created.invoiceNo)}`,
        read: false,
      });
    } catch (notifErr) {
      console.error("Invoice notification error:", notifErr);
    }

    // Send confirmation email to the submitting user
    try {
      const submitterEmail = submitterDoc?.email || (session as any).userEmail || (session as any).email;
      if (submitterEmail) {
        await sendEmail({
          to: submitterEmail,
          subject: `[NexAce CRM] Invoice ${created.invoiceNo} Submitted to HR for Review`,
          text: `Hello ${submitterDoc?.name || session.userName},\n\nYour invoice ${created.invoiceNo} for ${billedToName.trim()} (${currency || "INR"} ${Number(total || 0).toLocaleString()}) has been submitted and is currently pending timesheet & attendance verification by HR.\n\nOnce HR verifies your hours, it will automatically advance to Admin for payment.\n\nLog in to your NexAce dashboard to track its status.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h2 style="color: #4f46e5; margin-top: 0;">✦ Invoice Submitted to HR</h2>
              <p style="color: #475569; font-size: 14px;">Hello <strong>${submitterDoc?.name || session.userName}</strong>,</p>
              <p style="color: #475569; font-size: 14px;">Your invoice has been submitted and is <strong>pending timesheet & attendance verification by HR</strong>.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${created.invoiceNo}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Billed To:</strong> ${billedToName.trim()}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ${currency || "INR"} ${Number(total || 0).toLocaleString()}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Current Stage:</strong> <span style="color: #f59e0b; font-weight: bold;">1. Pending HR Review</span></p>
              </div>
              <p style="color: #475569; font-size: 14px;">Once HR approves your hours, your invoice will automatically advance to Admin for payment processing.</p>
              <p style="color: #94a3b8; font-size: 12px;">Log in to <a href="/dashboard/settings?tab=invoice" style="color: #4f46e5;">NexAce CRM</a> to track live progress.</p>
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
