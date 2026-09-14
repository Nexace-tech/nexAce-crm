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
    clients: true,
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
    clients: true,
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
    clients: true,
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
    viewKpiWidgets: true, viewShiftOverview: true, viewRecentActivity: true, viewAnnouncements: true, createAnnouncements: true,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, editEmployeeProfiles: true, inviteTeamMembers: true, deactivateEmployees: true, viewSalaryData: true, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: true, approveTimesheets: true, exportTimesheets: true, manageShifts: true, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: true, deleteProjects: true, assignTasksToOthers: true, changeTaskStatus: true, commentOnTasks: true, deleteTaskComments: true, manageProjectWiki: true, viewProjectGantt: true, exportProjectData: true,
    // Sprints
    createSprints: true, moveBetweenSprints: true, completeSprints: true, deleteSprints: true,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, shareDriveFiles: true, deleteDriveFiles: true, bulkDeleteDriveFiles: true,
    // Chat
    sendChatMessages: true, createChatChannels: true, deleteChatChannels: true, pinChatMessages: true, deleteOthersChatMessages: true, viewMailCenter: true, sendEmails: true, deleteEmails: true, viewWhatsAppPanel: true, sendWhatsAppMessages: true, startVirtualHuddles: true, joinVirtualHuddles: true,
    // HR & Leave
    viewOwnLeaves: true, applyLeaves: true, viewAllLeaves: true, approveLeaves: true, manageCompanyChecklists: true, manageHRVault: true, manageHRCases: true,
    // Appraisals
    viewOwnAppraisals: true, submitSelfReview: true, viewManagerReviews: true, createAppraisalCycles: true,
    // Goals & OKRs
    viewGoals: true, createGoals: true, manageGoals: true, sendKudos: true, submitSurvey: true, createPulseSurveys: true,
    // Analytics
    viewAnalyticsOverview: true, viewPerformanceMetrics: true, viewAuditLogs: true, exportAuditLogs: true,
    // CRM & Clients
    viewClients: true, createClients: true, manageClients: true, deleteClients: true, manageContracts: true, manageHRWorkdesk: true, manageExternalTeams: true, viewReports: true, exportClientData: true,
    // BD & Leads
    viewBD: true, manageLeads: true, deleteLeads: true, manageProposals: true, sendProposals: true, manageExecutiveTargets: true, exportBD: true,
    // Finance & Invoices
    viewFinancePortal: true, createInvoices: true, approveInvoices: true, confirmInvoicePayments: true, exportInvoices: true, manageExpenses: true, viewExpenseReports: true,
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
    viewKpiWidgets: true, viewShiftOverview: true, viewRecentActivity: true, viewAnnouncements: true, createAnnouncements: true,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, editEmployeeProfiles: false, inviteTeamMembers: false, deactivateEmployees: false, viewSalaryData: false, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: true, approveTimesheets: true, exportTimesheets: true, manageShifts: true, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: true, deleteProjects: false, assignTasksToOthers: true, changeTaskStatus: true, commentOnTasks: true, deleteTaskComments: false, manageProjectWiki: true, viewProjectGantt: true, exportProjectData: true,
    // Sprints
    createSprints: true, moveBetweenSprints: true, completeSprints: true, deleteSprints: false,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, shareDriveFiles: true, deleteDriveFiles: true, bulkDeleteDriveFiles: false,
    // Chat
    sendChatMessages: true, createChatChannels: true, deleteChatChannels: false, pinChatMessages: true, deleteOthersChatMessages: false, viewMailCenter: true, sendEmails: true, deleteEmails: false, viewWhatsAppPanel: true, sendWhatsAppMessages: true, startVirtualHuddles: true, joinVirtualHuddles: true,
    // HR & Leave
    viewOwnLeaves: true, applyLeaves: true, viewAllLeaves: true, approveLeaves: true, manageCompanyChecklists: false, manageHRVault: false, manageHRCases: false,
    // Appraisals
    viewOwnAppraisals: true, submitSelfReview: true, viewManagerReviews: true, createAppraisalCycles: false,
    // Goals & OKRs
    viewGoals: true, createGoals: true, manageGoals: false, sendKudos: true, submitSurvey: true, createPulseSurveys: false,
    // Analytics
    viewAnalyticsOverview: true, viewPerformanceMetrics: true, viewAuditLogs: false, exportAuditLogs: false,
    // CRM & Clients
    viewClients: false, createClients: false, manageClients: false, deleteClients: false, manageContracts: false, manageHRWorkdesk: false, manageExternalTeams: false, viewReports: false, exportClientData: false,
    // BD & Leads
    viewBD: true, manageLeads: true, deleteLeads: false, manageProposals: true, sendProposals: true, manageExecutiveTargets: false, exportBD: true,
    // Finance & Invoices
    viewFinancePortal: false, createInvoices: true, approveInvoices: false, confirmInvoicePayments: false, exportInvoices: true, manageExpenses: false, viewExpenseReports: false,
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
    viewKpiWidgets: true, viewShiftOverview: true, viewRecentActivity: true, viewAnnouncements: true, createAnnouncements: false,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, editEmployeeProfiles: true, inviteTeamMembers: true, deactivateEmployees: false, viewSalaryData: true, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: true, approveTimesheets: true, exportTimesheets: true, manageShifts: false, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: false, deleteProjects: false, assignTasksToOthers: false, changeTaskStatus: false, commentOnTasks: true, deleteTaskComments: false, manageProjectWiki: true, viewProjectGantt: true, exportProjectData: false,
    // Sprints
    createSprints: false, moveBetweenSprints: false, completeSprints: false, deleteSprints: false,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, shareDriveFiles: true, deleteDriveFiles: false, bulkDeleteDriveFiles: false,
    // Chat
    sendChatMessages: true, createChatChannels: false, deleteChatChannels: false, pinChatMessages: false, deleteOthersChatMessages: false, viewMailCenter: true, sendEmails: true, deleteEmails: false, viewWhatsAppPanel: false, sendWhatsAppMessages: false, startVirtualHuddles: true, joinVirtualHuddles: true,
    // HR & Leave
    viewOwnLeaves: true, applyLeaves: true, viewAllLeaves: true, approveLeaves: true, manageCompanyChecklists: true, manageHRVault: true, manageHRCases: true,
    // Appraisals
    viewOwnAppraisals: true, submitSelfReview: true, viewManagerReviews: true, createAppraisalCycles: true,
    // Goals & OKRs
    viewGoals: true, createGoals: false, manageGoals: false, sendKudos: true, submitSurvey: true, createPulseSurveys: true,
    // Analytics
    viewAnalyticsOverview: true, viewPerformanceMetrics: true, viewAuditLogs: false, exportAuditLogs: false,
    // CRM & Clients
    viewClients: false, createClients: false, manageClients: false, deleteClients: false, manageContracts: true, manageHRWorkdesk: true, manageExternalTeams: false, viewReports: false, exportClientData: false,
    // BD & Leads
    viewBD: false, manageLeads: false, deleteLeads: false, manageProposals: false, sendProposals: false, manageExecutiveTargets: false, exportBD: false,
    // Finance & Invoices
    viewFinancePortal: false, createInvoices: false, approveInvoices: false, confirmInvoicePayments: false, exportInvoices: false, manageExpenses: false, viewExpenseReports: false,
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
    viewKpiWidgets: true, viewShiftOverview: false, viewRecentActivity: true, viewAnnouncements: true, createAnnouncements: false,
    // Team
    viewTeamDirectory: true, viewEmployeeProfiles: true, editEmployeeProfiles: false, inviteTeamMembers: false, deactivateEmployees: false, viewSalaryData: false, viewOrgChart: true,
    // Calendar & Time
    logOwnTimesheet: true, editOwnTimesheet: true, viewTeamTimesheets: false, approveTimesheets: false, exportTimesheets: false, manageShifts: false, viewShiftCalendar: true, clockInOut: true,
    // Projects
    viewProjects: true, createProjects: false, deleteProjects: false, assignTasksToOthers: false, changeTaskStatus: true, commentOnTasks: true, deleteTaskComments: false, manageProjectWiki: false, viewProjectGantt: true, exportProjectData: false,
    // Sprints
    createSprints: false, moveBetweenSprints: false, completeSprints: false, deleteSprints: false,
    // Drive
    viewDriveFiles: true, uploadDriveFiles: true, downloadDriveFiles: true, shareDriveFiles: true, deleteDriveFiles: false, bulkDeleteDriveFiles: false,
    // Chat
    sendChatMessages: true, createChatChannels: false, deleteChatChannels: false, pinChatMessages: false, deleteOthersChatMessages: false, viewMailCenter: false, sendEmails: false, deleteEmails: false, viewWhatsAppPanel: false, sendWhatsAppMessages: false, startVirtualHuddles: false, joinVirtualHuddles: true,
    // HR & Leave
    viewOwnLeaves: true, applyLeaves: true, viewAllLeaves: false, approveLeaves: false, manageCompanyChecklists: false, manageHRVault: false, manageHRCases: false,
    // Appraisals
    viewOwnAppraisals: true, submitSelfReview: true, viewManagerReviews: false, createAppraisalCycles: false,
    // Goals & OKRs
    viewGoals: true, createGoals: false, manageGoals: false, sendKudos: true, submitSurvey: true, createPulseSurveys: false,
    // Analytics
    viewAnalyticsOverview: false, viewPerformanceMetrics: false, viewAuditLogs: false, exportAuditLogs: false,
    // CRM & Clients
    viewClients: false, createClients: false, manageClients: false, deleteClients: false, manageContracts: false, manageHRWorkdesk: false, manageExternalTeams: false, viewReports: false, exportClientData: false,
    // BD & Leads
    viewBD: false, manageLeads: false, deleteLeads: false, manageProposals: false, sendProposals: false, manageExecutiveTargets: false, exportBD: false,
    // Finance & Invoices
    viewFinancePortal: false, createInvoices: false, approveInvoices: false, confirmInvoicePayments: false, exportInvoices: false, manageExpenses: false, viewExpenseReports: false,
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

    // Clean up obsolete sales module/features and ensure proper defaults for all roles
    Object.keys(permissionsMap).forEach((roleKey) => {
      if (permissionsMap[roleKey]) {
        delete (permissionsMap[roleKey] as any).sales;
      }
    });

    Object.keys(featurePermissionsMap).forEach((roleKey) => {
      const fMap = featurePermissionsMap[roleKey];
      if (fMap) {
        // Clean up obsolete sales features
        delete (fMap as any).viewSalesWorkdesk;
        delete (fMap as any).createSalesDeals;
        delete (fMap as any).editSalesDeals;
        delete (fMap as any).deleteSalesDeals;
        delete (fMap as any).changeDealStages;
        delete (fMap as any).manageDeals;
        delete (fMap as any).exportSales;
        delete (fMap as any).manageSalesSettings;

        // Apply defaults for newly introduced granular permissions if undefined
        const roleDefaults = DEFAULT_FEATURE_PERMISSIONS[roleKey] || DEFAULT_FEATURE_PERMISSIONS.Employee;
        Object.keys(roleDefaults).forEach((fKey) => {
          if (fMap[fKey] === undefined) {
            fMap[fKey] = roleDefaults[fKey];
          }
        });
      }
    });

    // Ensure Projects & Drive access for HR and Employee
    if (permissionsMap.HR) {
      permissionsMap.HR.projects = true;
    }
    if (permissionsMap.Employee) {
      permissionsMap.Employee.projects = true;
    }
    if (featurePermissionsMap.HR) {
      featurePermissionsMap.HR.viewProjects = true;
      featurePermissionsMap.HR.manageContracts = true;
      featurePermissionsMap.HR.manageHRWorkdesk = true;
      featurePermissionsMap.HR.viewClients = false;
    }
    if (featurePermissionsMap.Employee) {
      featurePermissionsMap.Employee.viewProjects = true;
      featurePermissionsMap.Employee.viewClients = false;
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
