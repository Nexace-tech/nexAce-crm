import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { RolePermission } from "@/models/RolePermission";
import mongoose from "mongoose";

// Default module preset matrix for roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  OPS: {
    overview: true,
    team: true,
    calendar: true,
    projects: true,
    chat: true,
    clients: true,
    sales: true,
    bd: true,
    finance: true,
    referrals: true,
    goals: true,
    hr: true,
    it: true,
    analytics: true,
    notifications: true,
    settings: true,
  },
  Manager: {
    overview: true,
    team: true,
    calendar: true,
    projects: true,
    chat: true,
    clients: false,
    sales: true,
    bd: true,
    finance: false,
    referrals: true,
    goals: true,
    hr: true,
    it: false,
    analytics: false,
    notifications: true,
    settings: true,
  },
  HR: {
    overview: true,
    team: true,
    calendar: true,
    projects: true,
    chat: true,
    clients: false,
    sales: false,
    bd: false,
    finance: false,
    referrals: true,
    goals: true,
    hr: true,
    it: true,
    analytics: true,
    notifications: true,
    settings: true,
  },
  Employee: {
    overview: true,
    team: true,
    calendar: true,
    projects: true,
    chat: true,
    clients: false,
    sales: false,
    bd: false,
    finance: false,
    referrals: true,
    goals: true,
    hr: true,
    it: false,
    analytics: false,
    notifications: true,
    settings: true,
  },
};

// Default feature action capabilities preset matrix
export const DEFAULT_FEATURE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  OPS: {
    // Overview
    viewKpiWidgets: true, viewShiftOverview: true, viewAnnouncements: true, createAnnouncements: true, viewRecentActivity: true,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, inviteTeamMembers: true, editEmployeeProfiles: true, deactivateEmployees: true, viewSalaryData: true, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: true, approveTimesheets: true, manageShifts: false, exportTimesheets: true, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: true, deleteProjects: true, assignTasksToOthers: true, changeTaskStatus: true, commentOnTasks: true, deleteTaskComments: true, manageProjectWiki: true, viewProjectGantt: true, exportProjectData: true,
    // Sprints
    createSprints: true, deleteSprints: true, moveBetweenSprints: true, completeSprints: true,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, deleteDriveFiles: true, bulkDeleteDriveFiles: true, shareDriveFiles: true,
    // Chat
    sendChatMessages: true, createChatChannels: true, deleteChatChannels: true, pinChatMessages: true, deleteOthersChatMessages: true, viewMailCenter: true, sendEmails: true, deleteEmails: true, viewWhatsAppPanel: true, sendWhatsAppMessages: true, startVirtualHuddles: true, joinVirtualHuddles: true,
    // HR & Leave
    applyLeave: true, viewOwnLeaveStatus: true, viewTeamLeave: true, approveLeave: true, manageOnboarding: true, viewHRCases: true, createHRCases: true, viewHROnboarding: true, manageHRCases: true,
    // Appraisals
    viewOwnAppraisal: true, submitSelfReview: true, reviewTeamAppraisals: true, manageAppraisalCycles: true,
    // Goals & OKRs
    viewGoals: true, createGoals: true, editGoals: true, deleteGoals: true, sendKudos: true, manageSurveys: true, viewSurveyResults: true, submitSurveyResponses: true,
    // Analytics
    viewAnalyticsDashboard: true, viewAuditLogs: true, exportReports: true, viewSecurityEvents: true,
    // CRM & Clients
    viewClients: true, createClients: true, editClients: true, deleteClients: true, viewDeals: true, manageDeals: true, exportClientData: true, manageClientContacts: true,
    // Sales Workdesk
    viewSalesWorkdesk: true, createSalesDeals: true, editSalesDeals: true, deleteSalesDeals: true, changeDealStages: true,
    // BD & Leads
    viewBD: true, createLeads: true, editLeads: true, deleteLeads: true, importLeads: true, exportLeads: true, viewProposals: true, createProposals: true, editProposals: true, deleteProposals: true, sendProposals: true,
    // Finance & Invoices
    viewFinancePortal: true, viewInvoices: true, createInvoices: true, approveInvoices: true, confirmInvoicePayments: true, exportInvoices: true, manageExpenses: true, viewExpenseReports: true,
    // IT & Infrastructure
    viewITPortal: true, manageITAccess: true, manageITSubscriptions: true, manageITDevices: true, manageITInvoices: true,
    // Referrals
    submitReferral: true, viewOwnReferrals: true, viewAllReferrals: true, manageReferrals: true,
    // Notifications
    viewNotifications: true, deleteNotifications: true,
    // Admin & Users
    manageUsers: false, changeUserRoles: false, resetUserPasswords: false, viewBillingSubscription: false, manageBilling: false,
    // Settings
    viewWorkspaceSettings: true, editWorkspaceSettings: true, manageFileRestrictions: false, manageRolePermissions: false, viewIntegrations: true, manageIntegrations: false,
  },
  Manager: {
    // Overview
    viewKpiWidgets: true, viewShiftOverview: true, viewAnnouncements: true, createAnnouncements: true, viewRecentActivity: true,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, inviteTeamMembers: false, editEmployeeProfiles: false, deactivateEmployees: false, viewSalaryData: false, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: true, approveTimesheets: true, manageShifts: true, exportTimesheets: true, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: true, deleteProjects: false, assignTasksToOthers: true, changeTaskStatus: true, commentOnTasks: true, deleteTaskComments: false, manageProjectWiki: true, viewProjectGantt: true, exportProjectData: true,
    // Sprints
    createSprints: true, deleteSprints: false, moveBetweenSprints: true, completeSprints: true,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, deleteDriveFiles: true, bulkDeleteDriveFiles: false, shareDriveFiles: true,
    // Chat
    sendChatMessages: true, createChatChannels: true, deleteChatChannels: false, pinChatMessages: true, deleteOthersChatMessages: false, viewMailCenter: true, sendEmails: true, deleteEmails: false, viewWhatsAppPanel: true, sendWhatsAppMessages: true, startVirtualHuddles: true, joinVirtualHuddles: true,
    // HR & Leave
    applyLeave: true, viewOwnLeaveStatus: true, viewTeamLeave: true, approveLeave: true, manageOnboarding: false, viewHRCases: false, createHRCases: false, viewHROnboarding: true, manageHRCases: false,
    // Appraisals
    viewOwnAppraisal: true, submitSelfReview: true, reviewTeamAppraisals: true, manageAppraisalCycles: false,
    // Goals & OKRs
    viewGoals: true, createGoals: true, editGoals: true, deleteGoals: false, sendKudos: true, manageSurveys: false, viewSurveyResults: true, submitSurveyResponses: true,
    // Analytics
    viewAnalyticsDashboard: true, viewAuditLogs: false, exportReports: true, viewSecurityEvents: false,
    // CRM & Clients
    viewClients: false, createClients: false, editClients: false, deleteClients: false, viewDeals: false, manageDeals: false, exportClientData: false, manageClientContacts: false,
    // Sales Workdesk
    viewSalesWorkdesk: true, createSalesDeals: true, editSalesDeals: true, deleteSalesDeals: false, changeDealStages: true,
    // BD & Leads
    viewBD: true, createLeads: true, editLeads: true, deleteLeads: false, importLeads: true, exportLeads: true, viewProposals: true, createProposals: true, editProposals: true, deleteProposals: false, sendProposals: true,
    // Finance & Invoices
    viewFinancePortal: false, viewInvoices: false, createInvoices: true, approveInvoices: false, confirmInvoicePayments: false, exportInvoices: true, manageExpenses: false, viewExpenseReports: false,
    // IT & Infrastructure
    viewITPortal: false, manageITAccess: false, manageITSubscriptions: false, manageITDevices: false, manageITInvoices: false,
    // Referrals
    submitReferral: true, viewOwnReferrals: true, viewAllReferrals: false, manageReferrals: false,
    // Notifications
    viewNotifications: true, deleteNotifications: false,
    // Admin & Users
    manageUsers: false, changeUserRoles: false, resetUserPasswords: false, viewBillingSubscription: false, manageBilling: false,
    // Settings
    viewWorkspaceSettings: true, editWorkspaceSettings: false, manageFileRestrictions: false, manageRolePermissions: false, viewIntegrations: false, manageIntegrations: false,
  },
  HR: {
    // Overview
    viewKpiWidgets: true, viewShiftOverview: true, viewAnnouncements: true, createAnnouncements: false, viewRecentActivity: true,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, inviteTeamMembers: false, editEmployeeProfiles: false, deactivateEmployees: false, viewSalaryData: false, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: true, approveTimesheets: true, manageShifts: false, exportTimesheets: true, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: false, deleteProjects: false, assignTasksToOthers: false, changeTaskStatus: false, commentOnTasks: true, deleteTaskComments: false, manageProjectWiki: true, viewProjectGantt: false, exportProjectData: false,
    // Sprints
    createSprints: false, deleteSprints: false, moveBetweenSprints: false, completeSprints: false,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, deleteDriveFiles: false, bulkDeleteDriveFiles: false, shareDriveFiles: true,
    // Chat
    sendChatMessages: true, createChatChannels: false, deleteChatChannels: false, pinChatMessages: false, deleteOthersChatMessages: false, viewMailCenter: true, sendEmails: true, deleteEmails: false, viewWhatsAppPanel: false, sendWhatsAppMessages: false, startVirtualHuddles: true, joinVirtualHuddles: true,
    // HR & Leave
    applyLeave: true, viewOwnLeaveStatus: true, viewTeamLeave: true, approveLeave: true, manageOnboarding: true, viewHRCases: true, createHRCases: true, viewHROnboarding: true, manageHRCases: true,
    // Appraisals
    viewOwnAppraisal: true, submitSelfReview: true, reviewTeamAppraisals: true, manageAppraisalCycles: true,
    // Goals & OKRs
    viewGoals: true, createGoals: false, editGoals: false, deleteGoals: false, sendKudos: true, manageSurveys: true, viewSurveyResults: true, submitSurveyResponses: true,
    // Analytics
    viewAnalyticsDashboard: true, viewAuditLogs: false, exportReports: true, viewSecurityEvents: false,
    // CRM & Clients
    viewClients: false, createClients: false, editClients: false, deleteClients: false, viewDeals: false, manageDeals: false, exportClientData: false, manageClientContacts: false,
    // Sales Workdesk
    viewSalesWorkdesk: false, createSalesDeals: false, editSalesDeals: false, deleteSalesDeals: false, changeDealStages: false,
    // BD & Leads
    viewBD: false, createLeads: false, editLeads: false, deleteLeads: false, importLeads: false, exportLeads: false, viewProposals: false, createProposals: false, editProposals: false, deleteProposals: false, sendProposals: false,
    // Finance & Invoices
    viewFinancePortal: false, viewInvoices: false, createInvoices: true, approveInvoices: false, confirmInvoicePayments: false, exportInvoices: true, manageExpenses: false, viewExpenseReports: false,
    // IT & Infrastructure
    viewITPortal: true, manageITAccess: false, manageITSubscriptions: false, manageITDevices: true, manageITInvoices: false,
    // Referrals
    submitReferral: true, viewOwnReferrals: true, viewAllReferrals: true, manageReferrals: true,
    // Notifications
    viewNotifications: true, deleteNotifications: false,
    // Admin & Users — HR cannot manage user accounts, roles, or billing
    manageUsers: false, changeUserRoles: false, resetUserPasswords: false, viewBillingSubscription: false, manageBilling: false,
    // Settings — HR can only access own profile & password settings
    viewWorkspaceSettings: true, editWorkspaceSettings: false, manageFileRestrictions: false, manageRolePermissions: false, viewIntegrations: false, manageIntegrations: false,
  },
  Employee: {
    // Overview
    viewKpiWidgets: true, viewShiftOverview: false, viewAnnouncements: true, createAnnouncements: false, viewRecentActivity: true,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, inviteTeamMembers: false, editEmployeeProfiles: false, deactivateEmployees: false, viewSalaryData: false, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: false, approveTimesheets: false, manageShifts: false, exportTimesheets: false, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: false, deleteProjects: false, assignTasksToOthers: false, changeTaskStatus: true, commentOnTasks: true, deleteTaskComments: false, manageProjectWiki: false, viewProjectGantt: true, exportProjectData: false,
    // Sprints
    createSprints: false, deleteSprints: false, moveBetweenSprints: false, completeSprints: false,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, deleteDriveFiles: false, bulkDeleteDriveFiles: false, shareDriveFiles: true,
    // Chat
    sendChatMessages: true, createChatChannels: false, deleteChatChannels: false, pinChatMessages: false, deleteOthersChatMessages: false, viewMailCenter: false, sendEmails: false, deleteEmails: false, viewWhatsAppPanel: false, sendWhatsAppMessages: false, startVirtualHuddles: false, joinVirtualHuddles: true,
    // HR & Leave
    applyLeave: true, viewOwnLeaveStatus: true, viewTeamLeave: false, approveLeave: false, manageOnboarding: false, viewHRCases: false, createHRCases: false, viewHROnboarding: false, manageHRCases: false,
    // Appraisals
    viewOwnAppraisal: true, submitSelfReview: true, reviewTeamAppraisals: false, manageAppraisalCycles: false,
    // Goals & OKRs
    viewGoals: true, createGoals: false, editGoals: false, deleteGoals: false, sendKudos: true, manageSurveys: false, viewSurveyResults: false, submitSurveyResponses: true,
    // Analytics
    viewAnalyticsDashboard: false, viewAuditLogs: false, exportReports: false, viewSecurityEvents: false,
    // CRM & Clients
    viewClients: false, createClients: false, editClients: false, deleteClients: false, viewDeals: false, manageDeals: false, exportClientData: false, manageClientContacts: false,
    // Sales Workdesk
    viewSalesWorkdesk: false, createSalesDeals: false, editSalesDeals: false, deleteSalesDeals: false, changeDealStages: false,
    // BD & Leads
    viewBD: false, createLeads: false, editLeads: false, deleteLeads: false, importLeads: false, exportLeads: false, viewProposals: false, createProposals: false, editProposals: false, deleteProposals: false, sendProposals: false,
    // Finance & Invoices
    viewFinancePortal: false, viewInvoices: false, createInvoices: true, approveInvoices: false, confirmInvoicePayments: false, exportInvoices: true, manageExpenses: false, viewExpenseReports: false,
    // IT & Infrastructure
    viewITPortal: false, manageITAccess: false, manageITSubscriptions: false, manageITDevices: false, manageITInvoices: false,
    // Referrals
    submitReferral: true, viewOwnReferrals: true, viewAllReferrals: false, manageReferrals: false,
    // Notifications
    viewNotifications: true, deleteNotifications: false,
    // Admin & Users
    manageUsers: false, changeUserRoles: false, resetUserPasswords: false, viewBillingSubscription: false, manageBilling: false,
    // Settings
    viewWorkspaceSettings: true, editWorkspaceSettings: false, manageFileRestrictions: false, manageRolePermissions: false, viewIntegrations: false, manageIntegrations: false,
  },
};

/**
 * GET: Fetch all module & granular feature permissions for the current tenant.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const dbPermissions = await RolePermission.find({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    const permissionsMap: Record<string, Record<string, boolean>> = JSON.parse(
      JSON.stringify(DEFAULT_ROLE_PERMISSIONS)
    );

    const featurePermissionsMap: Record<string, Record<string, boolean>> = JSON.parse(
      JSON.stringify(DEFAULT_FEATURE_PERMISSIONS)
    );

    dbPermissions.forEach((doc) => {
      if (doc.role) {
        if (doc.modulePermissions) {
          permissionsMap[doc.role] = {
            ...(permissionsMap[doc.role] || DEFAULT_ROLE_PERMISSIONS.Employee),
            ...(doc.modulePermissions as any),
          };
        }
        if (doc.featurePermissions) {
          featurePermissionsMap[doc.role] = {
            ...(featurePermissionsMap[doc.role] || DEFAULT_FEATURE_PERMISSIONS.Employee),
            ...(doc.featurePermissions as any),
          };
        }
      }
    });

    // Ensure viewOrgChart and team module are true for all roles by default
    Object.keys(permissionsMap).forEach((roleKey) => {
      if (permissionsMap[roleKey]) {
        permissionsMap[roleKey].team = true;
      }
    });
    Object.keys(featurePermissionsMap).forEach((roleKey) => {
      if (featurePermissionsMap[roleKey]) {
        featurePermissionsMap[roleKey].viewOrgChart = true;
        featurePermissionsMap[roleKey].viewTeamDirectory = true;
        featurePermissionsMap[roleKey].viewEmployeeProfiles = true;
      }
    });

    // Ensure HR role has Projects module access enabled by default
    if (permissionsMap.HR) {
      permissionsMap.HR.projects = true;
    }

    const customRoles = dbPermissions.filter((d) => d.isCustom).map((d) => d.role);

    return NextResponse.json({
      permissions: permissionsMap,
      featurePermissions: featurePermissionsMap,
      defaultPermissions: DEFAULT_ROLE_PERMISSIONS,
      defaultFeaturePermissions: DEFAULT_FEATURE_PERMISSIONS,
      customRoles,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Permissions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Update, reset, or import module & granular feature action permissions for a role (Admin only).
 * Body:
 *   - Normal: { role: string, isCustom?: boolean, modulePermissions: { ... }, featurePermissions: { ... } }
 *   - Reset:  { action: "reset", role: string }
 *   - Import: { action: "bulk-import", policies: { [role]: { modulePermissions, featurePermissions, isCustom } } }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    await connectToDatabase();

    // 1. Bulk Import Action
    if (body.action === "bulk-import" && body.policies && typeof body.policies === "object") {
      const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
      const entries = Object.entries(body.policies);
      for (const [rName, policyData] of entries) {
        if (!rName || rName === "Admin") continue;
        const p = policyData as any;
        await RolePermission.findOneAndUpdate(
          { tenantId: tenantObjectId, role: rName.trim() },
          {
            $set: {
              role: rName.trim(),
              isCustom: p.isCustom ?? !["OPS", "Manager", "HR", "Employee"].includes(rName.trim()),
              modulePermissions: p.modulePermissions || {},
              featurePermissions: p.featurePermissions || {},
            },
          },
          { upsert: true }
        );
      }
      return NextResponse.json({ success: true, message: "Bulk policies imported successfully" });
    }

    const { role, isCustom, modulePermissions, featurePermissions, action } = body;

    if (!role || typeof role !== "string" || !role.trim()) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const cleanRole = role.trim();

    if (cleanRole === "Admin") {
      return NextResponse.json({ error: "Admin role permissions cannot be altered" }, { status: 400 });
    }

    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);

    // 2. Reset to System Defaults Action
    if (action === "reset") {
      if (["OPS", "Manager", "HR", "Employee"].includes(cleanRole)) {
        await RolePermission.deleteOne({
          tenantId: tenantObjectId,
          role: cleanRole,
        });
      } else {
        // For custom roles, reset to Employee template
        await RolePermission.findOneAndUpdate(
          { tenantId: tenantObjectId, role: cleanRole },
          {
            $set: {
              modulePermissions: DEFAULT_ROLE_PERMISSIONS.Employee,
              featurePermissions: DEFAULT_FEATURE_PERMISSIONS.Employee,
            },
          }
        );
      }
      return NextResponse.json({ success: true, message: `Reset '${cleanRole}' policy to defaults` });
    }

    // 3. Normal Update / Save Action
    const updatePayload: any = {
      role: cleanRole,
    };

    if (isCustom !== undefined) updatePayload.isCustom = isCustom;
    if (modulePermissions) updatePayload.modulePermissions = modulePermissions;
    if (featurePermissions) updatePayload.featurePermissions = featurePermissions;

    const updatedDoc = await RolePermission.findOneAndUpdate(
      {
        tenantId: tenantObjectId,
        role: cleanRole,
      },
      {
        $set: updatePayload,
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, permission: updatedDoc });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Permissions error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE: Remove a custom role (Admin only).
 * Query param: ?role=...
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleToDelete = searchParams.get("role");

    if (!roleToDelete || ["Admin", "OPS", "Manager", "HR", "Employee"].includes(roleToDelete)) {
      return NextResponse.json({ error: "Cannot delete built-in system roles" }, { status: 400 });
    }

    await connectToDatabase();

    await RolePermission.deleteOne({
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
      role: roleToDelete,
    });

    return NextResponse.json({ success: true, deletedRole: roleToDelete });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API DELETE Permission error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
