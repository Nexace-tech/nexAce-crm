import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { HROnboarding } from "@/models/HROnboarding";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/mail";
import { isSubAdminRole } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    const isPrivileged =
      session.role === "Admin" ||
      session.role === "Manager" ||
      session.role === "HR" ||
      session.role === "OPS" ||
      isSubAdminRole(session.role);

    if (!isPrivileged) {
      return NextResponse.json({ error: "Forbidden: Only HR and Managers can send onboarding reminders" }, { status: 403 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { userId, checklistId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Employee userId is required" }, { status: 400 });
    }

    const employee = await User.findOne({ _id: userId, tenantId: tenantObjectId }).select("name email username hrId").lean();
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check checklist status
    const query: any = { tenantId: tenantObjectId, userId: employee._id, type: "Onboarding" };
    if (checklistId) query._id = checklistId;
    const checklist = await HROnboarding.findOne(query).lean();

    const pendingItemCount = checklist
      ? (checklist.items || []).filter((i: any) => !i.completed).length
      : 0;

    const senderName = (session as any).name || (session as any).userName || "HR Operations";

    // Send In-App Notification
    await notify(tenantObjectId, employee._id.toString(), {
      title: "📌 Action Required: Submit Onboarding Documents",
      message: `Your HR Partner (${senderName}) has sent a reminder to submit your ${pendingItemCount > 0 ? `${pendingItemCount} pending ` : ""}onboarding documents.`,
      type: "hr",
      linkUrl: "/dashboard/hr?tab=checklists",
    });

    // Send Email Reminder
    if (employee.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      try {
        await sendEmail({
          to: employee.email,
          subject: "📌 Action Required: Please Submit Your Onboarding Documents",
          text: `Hello ${employee.name}, this is a friendly reminder from your HR Partner (${senderName}) to upload your pending onboarding documents. Please sign in and complete your submission: ${appUrl}/dashboard/hr?tab=checklists`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0f766e; margin-top: 0;">Onboarding Document Reminder</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                Hello <strong>${employee.name}</strong>,
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                Your dedicated HR Partner <strong>${senderName}</strong> has sent a reminder regarding your onboarding documentation.
              </p>
              <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.6;">
                <p style="margin: 0; color: #115e59;">
                  Please submit your government identification proof, address verification, and banking information so we can finalize your employment records and payroll enrollment.
                </p>
              </div>
              <div style="margin-top: 24px;">
                <a href="${appUrl}/dashboard/hr?tab=checklists" style="display: inline-block; padding: 10px 20px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  Open Onboarding Checklist &rarr;
                </a>
              </div>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("Failed to send onboarding email reminder:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Onboarding reminder sent to ${employee.name} successfully!`,
    });
  } catch (error: any) {
    console.error("POST /api/hr/checklists/remind error:", error);
    return NextResponse.json({ error: error.message || "Failed to send reminder" }, { status: 500 });
  }
}
