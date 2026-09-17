"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Module Metadata ──────────────────────────────────────────────────────────
export interface ModuleMeta {
  key: string;
  name: string;
  category: "Core & Overview" | "Operations & Delivery" | "Growth & Revenue" | "People & Culture" | "Platform & Security";
  description: string;
  icon: string;
}

export const MODULES: ModuleMeta[] = [
  { key: "overview", name: "Overview Dashboard", category: "Core & Overview", description: "Main dashboard KPI widgets and shift overviews", icon: "fa-solid fa-chart-simple" },
  { key: "team", name: "My Team Directory", category: "People & Culture", description: "Organization employee listing, org structure, and profiles", icon: "fa-solid fa-users" },
  { key: "calendar", name: "Calendar & Timesheets", category: "Operations & Delivery", description: "Work log entry, shift scheduling, and time tracking", icon: "fa-solid fa-calendar-days" },
  { key: "projects", name: "Projects, Sprints & Drive", category: "Operations & Delivery", description: "Agile kanban board, drive file storage, and project wiki", icon: "fa-solid fa-folder-tree" },
  { key: "chat", name: "Chat & Messaging", category: "Core & Overview", description: "Realtime workspace channels and direct team chat", icon: "fa-solid fa-comments" },
  { key: "clients", name: "OPS Portal", category: "Operations & Delivery", description: "Operations control, client retainers, HR allocations, external vendors & reports", icon: "fa-solid fa-list-check" },
  { key: "bd", name: "BD Portal", category: "Growth & Revenue", description: "Business development, leads qualification, proposals pipeline & client deals", icon: "fa-solid fa-briefcase" },
  { key: "finance", name: "Finance Portal", category: "Growth & Revenue", description: "Invoices, expenses, budget tracking, and payroll overview", icon: "fa-solid fa-coins" },
  { key: "referrals", name: "Candidate Referral Pipeline", category: "People & Culture", description: "Employee referral submissions and bonus tracking", icon: "fa-solid fa-link" },
  { key: "goals", name: "Goals, OKRs & Surveys", category: "People & Culture", description: "Strategic goal tracking, kudos, and team pulse surveys", icon: "fa-solid fa-bullseye" },
  { key: "hr", name: "HR Management Portal", category: "People & Culture", description: "Leave requests, appraisals, onboarding, and case tracking", icon: "fa-solid fa-user-tie" },
  { key: "it", name: "IT & Infrastructure Portal", category: "Platform & Security", description: "Manage access keys, SaaS subscriptions, hardware assets & vendor invoices", icon: "fa-solid fa-terminal" },
  { key: "analytics", name: "Analytics & Audit Logs", category: "Core & Overview", description: "Detailed activity timeline logs and workspace analytics", icon: "fa-solid fa-chart-line" },
  { key: "notifications", name: "Notification Center", category: "Core & Overview", description: "Real-time alerts, broadcast announcements, and notification history", icon: "fa-solid fa-bell" },
  { key: "settings", name: "Settings & Administration", category: "Platform & Security", description: "User management, workspace branding, and security", icon: "fa-solid fa-gear" },
];

export type FeatureCategory =
  | "Overview"
  | "Team"
  | "Calendar & Time"
  | "OPS Portal"
  | "Projects"
  | "Drive"
  | "Sprints"
  | "Chat"
  | "HR & Leave"
  | "Appraisals"
  | "Goals & OKRs"
  | "Analytics"
  | "BD & Leads"
  | "Finance & Invoices"
  | "IT & Infrastructure"
  | "Referrals"
  | "Notifications"
  | "Admin & Users"
  | "Settings";

export interface FeatureMeta {
  key: string;
  name: string;
  category: FeatureCategory;
  subGroup?: string;
  description: string;
  icon: string;
}

export const FEATURE_ACTIONS: FeatureMeta[] = [
  // Overview
  { key: "viewKpiWidgets", name: "View KPI Widgets", category: "Overview", subGroup: "Dashboard Widgets", description: "See KPI summary cards (headcount, leave, revenue)", icon: "fa-solid fa-gauge" },
  { key: "viewShiftOverview", name: "View Team Shift Overview", category: "Overview", subGroup: "Dashboard Widgets", description: "See today shift attendance and work status board", icon: "fa-solid fa-table-columns" },
  { key: "viewRecentActivity", name: "View Recent Activity Log", category: "Overview", subGroup: "Dashboard Widgets", description: "See recent activity timeline updates on dashboard", icon: "fa-solid fa-clock-rotate-left" },
  { key: "viewAnnouncements", name: "View Announcements", category: "Overview", subGroup: "Workspace Announcements", description: "Read global workspace broadcast announcements", icon: "fa-solid fa-bullhorn" },
  { key: "createAnnouncements", name: "Post Global Announcements", category: "Overview", subGroup: "Workspace Announcements", description: "Broadcast workspace-wide announcements to all members", icon: "fa-solid fa-bullhorn" },

  // Team
  { key: "viewTeamDirectory", name: "View Team Directory", category: "Team", subGroup: "Employee Roster & Profiles", description: "Browse the full employee roster and org chart", icon: "fa-solid fa-address-book" },
  { key: "viewEmployeeProfiles", name: "View Full Employee Profiles", category: "Team", subGroup: "Employee Roster & Profiles", description: "Access detailed staff profiles, skills, and social links", icon: "fa-solid fa-id-card" },
  { key: "editEmployeeProfiles", name: "Edit Any Employee Profile", category: "Team", subGroup: "Employee Roster & Profiles", description: "Modify name, department, or contact info for any user", icon: "fa-solid fa-user-pen" },
  { key: "inviteTeamMembers", name: "Invite New Team Members", category: "Team", subGroup: "User Management & Hiring", description: "Send workspace invitation emails to new hires", icon: "fa-solid fa-user-plus" },
  { key: "deactivateEmployees", name: "Deactivate / Suspend Users", category: "Team", subGroup: "User Management & Hiring", description: "Suspend or remove team members from the workspace", icon: "fa-solid fa-user-slash" },
  { key: "viewSalaryData", name: "View Compensation Data", category: "Team", subGroup: "Compensation & Org Structure", description: "See salary bands and compensation details per employee", icon: "fa-solid fa-sack-dollar" },
  { key: "viewOrgChart", name: "View Visual Org Hierarchy Chart", category: "Team", subGroup: "Compensation & Org Structure", description: "Access interactive organization tree structure", icon: "fa-solid fa-sitemap" },

  // Calendar & Time
  { key: "logOwnTimesheet", name: "Log Own Work Hours", category: "Calendar & Time", subGroup: "Timesheets & Hours Logging", description: "Submit own daily timesheet entries and work logs", icon: "fa-solid fa-clock" },
  { key: "editOwnTimesheet", name: "Edit Own Timesheet Entries", category: "Calendar & Time", subGroup: "Timesheets & Hours Logging", description: "Correct or update own submitted timesheet records", icon: "fa-solid fa-clock-rotate-left" },
  { key: "viewTeamTimesheets", name: "View Team Timesheets", category: "Calendar & Time", subGroup: "Timesheets & Hours Logging", description: "See all team member work hour logs and attendance records", icon: "fa-solid fa-calendar-week" },
  { key: "approveTimesheets", name: "Approve Team Timesheets", category: "Calendar & Time", subGroup: "Timesheets & Hours Logging", description: "Approve or reject employee submitted work hours", icon: "fa-solid fa-calendar-check" },
  { key: "exportTimesheets", name: "Export Timesheet Reports", category: "Calendar & Time", subGroup: "Timesheets & Hours Logging", description: "Download CSV/PDF timesheet data for payroll", icon: "fa-solid fa-file-csv" },
  { key: "manageShifts", name: "Manage Shift Schedules", category: "Calendar & Time", subGroup: "Shifts & Punch Clock", description: "Create, edit, and assign shift slots to employees", icon: "fa-solid fa-calendar-plus" },
  { key: "viewShiftCalendar", name: "View Team Shift Calendar", category: "Calendar & Time", subGroup: "Shifts & Punch Clock", description: "Access full team shift calendar and roster overview", icon: "fa-solid fa-calendar-days" },
  { key: "clockInOut", name: "Clock In & Clock Out Shift", category: "Calendar & Time", subGroup: "Shifts & Punch Clock", description: "Record daily shift punch-in and punch-out attendance", icon: "fa-solid fa-business-time" },

  // OPS Portal
  { key: "viewClients", name: "View OPS Retainers & Control", category: "OPS Portal", subGroup: "Operations Retainers", description: "Browse active client retainers, accounts, and health status", icon: "fa-solid fa-list-check" },
  { key: "createClients", name: "Create & Edit Operations Retainers", category: "OPS Portal", subGroup: "Operations Retainers", description: "Add new client accounts, set delivery owners & target dates", icon: "fa-solid fa-folder-plus" },
  { key: "manageClients", name: "Manage Retainers & Contact Logs", category: "OPS Portal", subGroup: "Operations Retainers", description: "Update progress %, health status, and add contact history logs", icon: "fa-solid fa-pen-to-square" },
  { key: "deleteClients", name: "Delete Operations Retainers", category: "OPS Portal", subGroup: "Operations Retainers", description: "Permanently remove client project retainers from the system", icon: "fa-solid fa-trash-can" },
  { key: "manageContracts", name: "Manage Contracts", category: "OPS Portal", subGroup: "Contracts", description: "Manage client contracts, SLAs, e-signatures, and terms", icon: "fa-solid fa-file-contract" },
  { key: "manageHRWorkdesk", name: "Manage HR Allocations", category: "OPS Portal", subGroup: "Resource Allocation", description: "Allocate staff to projects, manage utilization %, and bench status", icon: "fa-solid fa-user-gear" },
  { key: "manageExternalTeams", name: "Manage External Contractors", category: "OPS Portal", subGroup: "External Contractors", description: "Track third-party vendors, freelance contracts & hourly rates", icon: "fa-solid fa-users-gear" },
  { key: "viewReports", name: "Access Operations Reports", category: "OPS Portal", subGroup: "Reports & Data Export", description: "View aggregated project progress and workforce utilization reports", icon: "fa-solid fa-chart-pie" },
  { key: "exportClientData", name: "Export Client Data & Reports", category: "OPS Portal", subGroup: "Reports & Data Export", description: "Download CSV exports of client accounts and allocation matrices", icon: "fa-solid fa-file-export" },

  // Projects
  { key: "viewProjects", name: "View Projects & Tasks", category: "Projects", subGroup: "Kanban Boards & Tasks", description: "Browse all workspace projects and task boards", icon: "fa-solid fa-folder-open" },
  { key: "createProjects", name: "Create & Edit Projects", category: "Projects", subGroup: "Kanban Boards & Tasks", description: "Create new workspace projects and edit project details", icon: "fa-solid fa-folder-plus" },
  { key: "deleteProjects", name: "Delete Projects", category: "Projects", subGroup: "Kanban Boards & Tasks", description: "Permanently remove projects from the workspace", icon: "fa-solid fa-folder-minus" },
  { key: "assignTasksToOthers", name: "Assign Tasks to Others", category: "Projects", subGroup: "Kanban Boards & Tasks", description: "Delegate tasks to other team members in any project", icon: "fa-solid fa-user-tag" },
  { key: "changeTaskStatus", name: "Change Task Status", category: "Projects", subGroup: "Kanban Boards & Tasks", description: "Move tasks across Kanban columns and update progress", icon: "fa-solid fa-arrows-left-right" },
  { key: "commentOnTasks", name: "Comment on Tasks", category: "Projects", subGroup: "Task Comments & Collaboration", description: "Add comments and updates to project tasks", icon: "fa-solid fa-comment-dots" },
  { key: "deleteTaskComments", name: "Delete Any Task Comments", category: "Projects", subGroup: "Task Comments & Collaboration", description: "Remove comments posted by any team member on tasks", icon: "fa-solid fa-comment-slash" },
  { key: "manageProjectWiki", name: "Manage Project Wiki", category: "Projects", subGroup: "SOP Wiki & Reports", description: "Create, edit, and delete wiki pages inside projects", icon: "fa-solid fa-book-open" },
  { key: "viewProjectGantt", name: "View Gantt Timelines", category: "Projects", subGroup: "SOP Wiki & Reports", description: "Access Gantt timeline charts and project dependencies", icon: "fa-solid fa-chart-gantt" },
  { key: "exportProjectData", name: "Export Project Reports", category: "Projects", subGroup: "SOP Wiki & Reports", description: "Download project task summaries and CSV reports", icon: "fa-solid fa-file-export" },

  // Sprints
  { key: "createSprints", name: "Create & Edit Sprints", category: "Sprints", subGroup: "Sprint Planning & Execution", description: "Plan new sprint cycles and set sprint goals", icon: "fa-solid fa-person-running" },
  { key: "moveBetweenSprints", name: "Move Tasks Between Sprints", category: "Sprints", subGroup: "Sprint Planning & Execution", description: "Carry over or reassign tasks across sprint cycles", icon: "fa-solid fa-right-left" },
  { key: "completeSprints", name: "Complete & Close Sprints", category: "Sprints", subGroup: "Sprint Planning & Execution", description: "Mark sprint cycles complete and archive finished sprints", icon: "fa-solid fa-flag-checkered" },
  { key: "deleteSprints", name: "Delete Sprints", category: "Sprints", subGroup: "Sprint Management", description: "Remove sprint cycles from a project board", icon: "fa-solid fa-trash-can" },

  // Drive
  { key: "viewDriveFiles", name: "View Drive Files", category: "Drive", subGroup: "File Storage & Access", description: "Browse and preview files uploaded to drive storage", icon: "fa-solid fa-eye" },
  { key: "uploadDriveFiles", name: "Upload Drive Files", category: "Drive", subGroup: "File Storage & Access", description: "Upload new files and documents to drive storage", icon: "fa-solid fa-cloud-arrow-up" },
  { key: "downloadDriveFiles", name: "Download Drive Files", category: "Drive", subGroup: "File Storage & Access", description: "Download files stored in the drive repository", icon: "fa-solid fa-cloud-arrow-down" },
  { key: "shareDriveFiles", name: "Share Drive Document Links", category: "Drive", subGroup: "Sharing & File Cleanup", description: "Generate shareable links and assign document access", icon: "fa-solid fa-share-nodes" },
  { key: "deleteDriveFiles", name: "Delete Drive Files", category: "Drive", subGroup: "Sharing & File Cleanup", description: "Permanently remove files from drive storage", icon: "fa-solid fa-trash-can" },
  { key: "bulkDeleteDriveFiles", name: "Bulk Delete Drive Files", category: "Drive", subGroup: "Sharing & File Cleanup", description: "Select and delete multiple drive files at once", icon: "fa-solid fa-rectangle-xmark" },

  // Chat & Communication Sub-Features
  { key: "sendChatMessages", name: "Send Chat Messages", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Post messages in workspace channels and DMs", icon: "fa-solid fa-paper-plane" },
  { key: "createChatChannels", name: "Create Public Channels", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Create new department or topic discussion channels", icon: "fa-solid fa-hashtag" },
  { key: "deleteChatChannels", name: "Delete / Archive Channels", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Permanently remove channels and conversation history", icon: "fa-solid fa-folder-minus" },
  { key: "pinChatMessages", name: "Pin Important Messages", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Pin key messages and updates to channel headers", icon: "fa-solid fa-thumbtack" },
  { key: "deleteOthersChatMessages", name: "Moderate & Delete Chat Messages", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Remove inappropriate messages posted by other users", icon: "fa-solid fa-shield-halved" },
  { key: "viewMailCenter", name: "Access Integrated Mail Center", category: "Chat", subGroup: "Mail Center", description: "View synchronized SMTP/IMAP email client", icon: "fa-solid fa-envelope" },
  { key: "sendEmails", name: "Compose & Send Emails", category: "Chat", subGroup: "Mail Center", description: "Send professional emails directly from the workspace", icon: "fa-solid fa-paper-plane" },
  { key: "deleteEmails", name: "Delete Stored Mail Messages", category: "Chat", subGroup: "Mail Center", description: "Delete messages from the synced mail account", icon: "fa-solid fa-trash-can" },
  { key: "viewWhatsAppPanel", name: "Access WhatsApp Business Panel", category: "Chat", subGroup: "External Messaging", description: "Open WhatsApp Business Web direct access tab", icon: "fa-brands fa-whatsapp" },
  { key: "sendWhatsAppMessages", name: "Send Outbound WhatsApp Messages", category: "Chat", subGroup: "External Messaging", description: "Communicate directly with clients via WhatsApp Web", icon: "fa-solid fa-share" },
  { key: "startVirtualHuddles", name: "Start Instant Video Huddles", category: "Chat", subGroup: "Video Huddles", description: "Create instant team video conference rooms", icon: "fa-solid fa-video" },
  { key: "joinVirtualHuddles", name: "Join Team Video Huddles", category: "Chat", subGroup: "Video Huddles", description: "Participate in active team video conference calls", icon: "fa-solid fa-phone" },

  // HR & Leave
  { key: "viewOwnLeaves", name: "View Own Leave History", category: "HR & Leave", subGroup: "Leave Applications", description: "Access personal time-off records and balances", icon: "fa-solid fa-calendar-check" },
  { key: "applyLeaves", name: "Apply for Time-Off / Leave", category: "HR & Leave", subGroup: "Leave Applications", description: "Submit vacation, medical, or unpaid leave requests", icon: "fa-solid fa-calendar-plus" },
  { key: "viewAllLeaves", name: "View All Company Leave Requests", category: "HR & Leave", subGroup: "Leave Approvals & Records", description: "See leave calendar and requests across all departments", icon: "fa-solid fa-calendar-days" },
  { key: "approveLeaves", name: "Approve / Reject Leave Requests", category: "HR & Leave", subGroup: "Leave Approvals & Records", description: "Grant or decline time-off applications for employees", icon: "fa-solid fa-circle-check" },
  { key: "manageCompanyChecklists", name: "Manage On/Offboarding Checklists", category: "HR & Leave", subGroup: "HR Operations", description: "Create and assign employee onboarding workflow tasks", icon: "fa-solid fa-list-check" },
  { key: "manageHRVault", name: "Manage Company Policy Vault", category: "HR & Leave", subGroup: "HR Operations", description: "Upload and publish legal policies and handbook files", icon: "fa-solid fa-vault" },
  { key: "manageHRCases", name: "Manage Employee Grievance Cases", category: "HR & Leave", subGroup: "HR Operations", description: "Handle confidential HR disputes and disciplinary cases", icon: "fa-solid fa-scale-balanced" },

  // Appraisals
  { key: "viewOwnAppraisals", name: "View Own Performance Appraisals", category: "Appraisals", subGroup: "Performance Reviews", description: "See self review results and manager appraisal feedback", icon: "fa-solid fa-star" },
  { key: "submitSelfReview", name: "Submit Self-Appraisal Review", category: "Appraisals", subGroup: "Performance Reviews", description: "Complete annual or quarterly self-evaluation forms", icon: "fa-solid fa-file-signature" },
  { key: "viewManagerReviews", name: "Access Team Performance Reviews", category: "Appraisals", subGroup: "Performance Reviews", description: "View appraisal evaluations for all subordinate staff", icon: "fa-solid fa-chart-simple" },
  { key: "createAppraisalCycles", name: "Create New Review Cycles", category: "Appraisals", subGroup: "Review Cycle Administration", description: "Launch company-wide performance evaluation rounds", icon: "fa-solid fa-arrows-spin" },

  // Goals & OKRs
  { key: "viewGoals", name: "View Strategic Goals & OKRs", category: "Goals & OKRs", subGroup: "OKR Management", description: "Browse company-wide and departmental target metrics", icon: "fa-solid fa-bullseye" },
  { key: "createGoals", name: "Create & Update Strategic Goals", category: "Goals & OKRs", subGroup: "OKR Management", description: "Set new OKRs, key results, and update progress", icon: "fa-solid fa-circle-plus" },
  { key: "manageGoals", name: "Manage & Delete Company OKRs", category: "Goals & OKRs", subGroup: "OKR Management", description: "Modify or archive company-wide strategic objectives", icon: "fa-solid fa-pen-to-square" },
  { key: "sendKudos", name: "Send Kudos Appreciation", category: "Goals & OKRs", subGroup: "Culture & Feedback", description: "Post public appreciation badges to colleagues", icon: "fa-solid fa-heart" },
  { key: "submitSurvey", name: "Respond to Pulse Surveys", category: "Goals & OKRs", subGroup: "Culture & Feedback", description: "Answer anonymous company satisfaction questionnaires", icon: "fa-solid fa-square-poll-vertical" },
  { key: "createPulseSurveys", name: "Create & Analyze Pulse Surveys", category: "Goals & OKRs", subGroup: "Culture & Feedback", description: "Launch company pulse surveys and view response metrics", icon: "fa-solid fa-chart-pie" },

  // Analytics
  { key: "viewAnalyticsOverview", name: "View Workspace Analytics", category: "Analytics", subGroup: "Performance & Audits", description: "Access time utilization and workload distribution charts", icon: "fa-solid fa-chart-line" },
  { key: "viewPerformanceMetrics", name: "View Staff Performance Scores", category: "Analytics", subGroup: "Performance & Audits", description: "See team delivery velocity and task completion rates", icon: "fa-solid fa-gauge-high" },
  { key: "viewAuditLogs", name: "Access System Activity Audit Logs", category: "Analytics", subGroup: "Performance & Audits", description: "Browse chronological security and action trail", icon: "fa-solid fa-shield-halved" },
  { key: "exportAuditLogs", name: "Export Audit Log Trail", category: "Analytics", subGroup: "Performance & Audits", description: "Download CSV records of all platform activity logs", icon: "fa-solid fa-download" },

  // BD & Leads
  { key: "viewBD", name: "View BD Portal & Leads", category: "BD & Leads", subGroup: "Lead Acquisition", description: "Access BD lead lists, client accounts, and lead capture logs", icon: "fa-solid fa-briefcase" },
  { key: "manageLeads", name: "Create & Qualify Leads", category: "BD & Leads", subGroup: "Lead Acquisition", description: "Add new prospective leads, qualify status, and assign owners", icon: "fa-solid fa-user-plus" },
  { key: "deleteLeads", name: "Delete BD Leads", category: "BD & Leads", subGroup: "Lead Acquisition", description: "Remove obsolete lead records from the BD system", icon: "fa-solid fa-trash-can" },
  { key: "manageProposals", name: "Draft Commercial Proposals", category: "BD & Leads", subGroup: "Proposals & Contracts", description: "Create and edit structured client pricing and scope proposals", icon: "fa-solid fa-file-contract" },
  { key: "sendProposals", name: "Dispatch Client Proposals", category: "BD & Leads", subGroup: "Proposals & Contracts", description: "Email and share formal proposals with prospective clients", icon: "fa-solid fa-paper-plane" },
  { key: "manageExecutiveTargets", name: "Set BD Sales Targets", category: "BD & Leads", subGroup: "Performance Targets", description: "Configure quarterly revenue quotas for business development staff", icon: "fa-solid fa-bullseye" },
  { key: "exportBD", name: "Export BD Reports", category: "BD & Leads", subGroup: "Performance Targets", description: "Download CSV records of leads, conversion rates, and proposals", icon: "fa-solid fa-file-export" },

  // Finance & Invoices
  { key: "viewFinancePortal", name: "Access Finance Portal", category: "Finance & Invoices", subGroup: "Invoices Management", description: "View company invoicing, billing records, and payment receipts", icon: "fa-solid fa-coins" },
  { key: "createInvoices", name: "Generate & Send Invoices", category: "Finance & Invoices", subGroup: "Invoices Management", description: "Create professional client invoices with itemized line items", icon: "fa-solid fa-file-invoice-dollar" },
  { key: "approveInvoices", name: "Approve & Manage Invoices", category: "Finance & Invoices", subGroup: "Invoices Management", description: "Approve, reject, and update invoice status", icon: "fa-solid fa-circle-check" },
  { key: "confirmInvoicePayments", name: "Confirm Payments & Attach Proof", category: "Finance & Invoices", subGroup: "Invoices Management", description: "Mark invoices as Paid, record Bank Transfer/UPI/Cash and save payment proofs in Drive", icon: "fa-solid fa-receipt" },
  { key: "exportInvoices", name: "Export & Download Invoices PDF", category: "Finance & Invoices", subGroup: "Invoices Management", description: "Download official PDF invoice documents and export data", icon: "fa-solid fa-file-pdf" },
  { key: "manageExpenses", name: "Record & Manage Expenses", category: "Finance & Invoices", subGroup: "Expenses & Budget", description: "Create, categorize, edit, and delete company operational expenses", icon: "fa-solid fa-money-bill-transfer" },
  { key: "viewExpenseReports", name: "View Financial & Expense Reports", category: "Finance & Invoices", subGroup: "Expenses & Budget", description: "Access detailed monthly expense breakdowns and audit reports", icon: "fa-solid fa-chart-pie" },

  // IT & Infrastructure
  { key: "viewITPortal", name: "Access IT Portal", category: "IT & Infrastructure", subGroup: "IT Command Center", description: "Browse the IT Portal overview and hardware/software inventory", icon: "fa-solid fa-terminal" },
  { key: "manageITAccess", name: "Manage Access Keys & Credentials", category: "IT & Infrastructure", subGroup: "Access & Security", description: "Grant, suspend, or revoke tool access records and user credentials", icon: "fa-solid fa-key" },
  { key: "manageITSubscriptions", name: "Manage SaaS Subscriptions", category: "IT & Infrastructure", subGroup: "SaaS Subscriptions", description: "Track software subscriptions, plan renewals, and monthly costs", icon: "fa-solid fa-credit-card" },
  { key: "manageITDevices", name: "Manage Hardware Device Assets", category: "IT & Infrastructure", subGroup: "Hardware Assets", description: "Register, assign, repair, and retire company laptops & hardware", icon: "fa-solid fa-laptop" },
  { key: "manageITInvoices", name: "Manage IT & Vendor Invoices", category: "IT & Infrastructure", subGroup: "Invoices & Billing", description: "Create, edit, and track payment status of vendor and client invoices", icon: "fa-solid fa-file-invoice-dollar" },

  // Referrals
  { key: "submitReferral", name: "Submit Candidate Referrals", category: "Referrals", subGroup: "Referral Pipeline", description: "Nominate external candidates through the referral program", icon: "fa-solid fa-paper-plane" },
  { key: "viewOwnReferrals", name: "Track Own Referral Status", category: "Referrals", subGroup: "Referral Pipeline", description: "See the status and bonus payout of own referrals", icon: "fa-solid fa-list-check" },
  { key: "viewAllReferrals", name: "View All Referrals Pipeline", category: "Referrals", subGroup: "Referral Pipeline", description: "See referral submissions across the entire organization", icon: "fa-solid fa-sitemap" },
  { key: "manageReferrals", name: "Manage & Update Referrals", category: "Referrals", subGroup: "Referral Pipeline", description: "Update referral status, approve bonuses, and set payout", icon: "fa-solid fa-pen-to-square" },

  // Notifications
  { key: "viewNotifications", name: "View Notification Center", category: "Notifications", subGroup: "Workspace Alerts", description: "Access full notification history stream and search alerts", icon: "fa-solid fa-bell" },
  { key: "deleteNotifications", name: "Clear Notification History", category: "Notifications", subGroup: "Workspace Alerts", description: "Delete individual notifications or clear entire notification logs", icon: "fa-solid fa-trash-can" },

  // Admin & Users
  { key: "manageUsers", name: "Manage User Accounts", category: "Admin & Users", subGroup: "User Account Administration", description: "Invite, edit roles, reset passwords, or suspend users", icon: "fa-solid fa-user-gear" },
  { key: "changeUserRoles", name: "Change User Roles", category: "Admin & Users", subGroup: "User Account Administration", description: "Promote or demote users to different permission roles", icon: "fa-solid fa-user-shield" },
  { key: "resetUserPasswords", name: "Reset User Passwords", category: "Admin & Users", subGroup: "User Account Administration", description: "Force-reset passwords for any team member account", icon: "fa-solid fa-key" },
  { key: "viewBillingSubscription", name: "View Billing & Subscription", category: "Admin & Users", subGroup: "Billing & SaaS Subscription", description: "See the workspace subscription tier and seat usage", icon: "fa-solid fa-credit-card" },
  { key: "manageBilling", name: "Change Subscription Plan", category: "Admin & Users", subGroup: "Billing & SaaS Subscription", description: "Upgrade or downgrade the SaaS subscription plan", icon: "fa-solid fa-file-invoice-dollar" },

  // Settings
  { key: "viewWorkspaceSettings", name: "View Workspace Settings", category: "Settings", subGroup: "Workspace Configuration", description: "Access workspace configuration and branding settings", icon: "fa-solid fa-sliders" },
  { key: "editWorkspaceSettings", name: "Edit Workspace Settings", category: "Settings", subGroup: "Workspace Configuration", description: "Modify company name, branding, and workspace configuration", icon: "fa-solid fa-screwdriver-wrench" },
  { key: "manageFileRestrictions", name: "Manage File Upload Policies", category: "Settings", subGroup: "Workspace Configuration", description: "Configure allowed file types for drive storage uploads", icon: "fa-solid fa-file-circle-exclamation" },
  { key: "manageRolePermissions", name: "Manage Role Permissions", category: "Settings", subGroup: "RBAC Security", description: "Configure which modules and features each role can access", icon: "fa-solid fa-lock-open" },
  { key: "viewIntegrations", name: "View API Integrations", category: "Settings", subGroup: "API Integrations", description: "See connected third-party integrations and API keys", icon: "fa-solid fa-plug" },
  { key: "manageIntegrations", name: "Manage API Integrations", category: "Settings", subGroup: "API Integrations", description: "Connect, disconnect, or rotate keys for integrations", icon: "fa-solid fa-plug-circle-bolt" },
];

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  "Overview", "Team", "Calendar & Time", "OPS Portal", "Projects", "Sprints", "Drive",
  "Chat", "HR & Leave", "Appraisals", "Goals & OKRs", "Analytics",
  "BD & Leads", "Finance & Invoices", "IT & Infrastructure", "Referrals", "Notifications", "Admin & Users", "Settings",
];

export const CATEGORY_COLORS: Record<FeatureCategory, { text: string; bg: string; border: string; badge: string }> = {
  "Overview":          { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Team":              { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Calendar & Time":   { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "OPS Portal":        { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Projects":          { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Sprints":           { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Drive":             { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Chat":              { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "HR & Leave":        { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Appraisals":        { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Goals & OKRs":      { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Analytics":         { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "BD & Leads":        { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Finance & Invoices": { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "IT & Infrastructure": { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Referrals":         { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Notifications":     { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Admin & Users":     { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
  "Settings":          { text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", badge: "bg-primary/15 text-primary" },
};

export const CATEGORY_ICONS: Record<FeatureCategory, string> = {
  "Overview":          "fa-solid fa-chart-simple",
  "Team":              "fa-solid fa-users",
  "Calendar & Time":   "fa-solid fa-calendar-days",
  "OPS Portal":        "fa-solid fa-list-check",
  "Projects":          "fa-solid fa-folder-tree",
  "Sprints":           "fa-solid fa-person-running",
  "Drive":             "fa-solid fa-hard-drive",
  "Chat":              "fa-solid fa-comments",
  "HR & Leave":        "fa-solid fa-briefcase",
  "Appraisals":        "fa-solid fa-star",
  "Goals & OKRs":      "fa-solid fa-bullseye",
  "Analytics":         "fa-solid fa-chart-line",
  "BD & Leads":        "fa-solid fa-briefcase",
  "Finance & Invoices": "fa-solid fa-coins",
  "IT & Infrastructure": "fa-solid fa-terminal",
  "Referrals":         "fa-solid fa-link",
  "Notifications":     "fa-solid fa-bell",
  "Admin & Users":     "fa-solid fa-user-gear",
  "Settings":          "fa-solid fa-gear",
};

export const DEFAULT_BUILTIN_ROLES = ["OPS", "Manager", "HR", "Employee"];

// ─── Preset Templates ─────────────────────────────────────────────────────────
interface RolePresetTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  icon: string;
  modules: string[];
  features: string[];
}

const PRESET_TEMPLATES: RolePresetTemplate[] = [
  {
    id: "full_access",
    name: "Full Admin Power (Sub-Admin)",
    badge: "Maximum Power",
    description: "Grants access to all 16 modules and all CRUD actions across the CRM.",
    icon: "fa-solid fa-crown",
    modules: MODULES.map((m) => m.key),
    features: FEATURE_ACTIONS.map((f) => f.key),
  },
  {
    id: "project_manager",
    name: "Project Manager & Sprint Lead",
    badge: "Delivery",
    description: "Focus on task delivery, sprint management, timesheet approvals, and project analytics.",
    icon: "fa-solid fa-diagram-project",
    modules: ["overview", "team", "calendar", "projects", "chat", "referrals", "goals", "hr", "analytics", "notifications"],
    features: [
      "viewKpiWidgets", "viewShiftOverview", "viewRecentActivity", "viewAnnouncements",
      "viewTeamDirectory", "viewEmployeeProfiles", "viewOrgChart",
      "logOwnTimesheet", "editOwnTimesheet", "viewTeamTimesheets", "approveTimesheets", "exportTimesheets", "manageShifts", "viewShiftCalendar", "clockInOut",
      "viewProjects", "createProjects", "deleteProjects", "assignTasksToOthers", "changeTaskStatus", "commentOnTasks", "deleteTaskComments", "manageProjectWiki", "viewProjectGantt", "exportProjectData",
      "createSprints", "moveBetweenSprints", "completeSprints", "deleteSprints",
      "viewDriveFiles", "uploadDriveFiles", "downloadDriveFiles", "shareDriveFiles", "deleteDriveFiles",
      "sendChatMessages", "createChatChannels", "pinChatMessages", "viewMailCenter", "sendEmails", "startVirtualHuddles", "joinVirtualHuddles",
      "viewOwnLeaves", "applyLeaves", "viewAllLeaves", "viewOwnAppraisals", "submitSelfReview", "viewManagerReviews",
      "viewGoals", "createGoals", "sendKudos", "submitSurvey",
      "viewAnalyticsOverview", "viewPerformanceMetrics", "exportAuditLogs",
      "viewNotifications",
    ],
  },
  {
    id: "sales_bd",
    name: "Business Development Specialist",
    badge: "Growth",
    description: "Tailored for business development, leads qualification, proposals pipeline & client deals.",
    icon: "fa-solid fa-briefcase",
    modules: ["overview", "team", "calendar", "chat", "bd", "referrals", "notifications"],
    features: [
      "viewKpiWidgets", "viewAnnouncements", "viewTeamDirectory", "viewEmployeeProfiles", "viewOrgChart",
      "logOwnTimesheet", "editOwnTimesheet", "clockInOut",
      "sendChatMessages", "viewMailCenter", "sendEmails", "viewWhatsAppPanel", "sendWhatsAppMessages", "startVirtualHuddles", "joinVirtualHuddles",
      "viewBD", "manageLeads", "deleteLeads", "manageProposals", "sendProposals", "manageExecutiveTargets", "exportBD",
      "submitReferral", "viewOwnReferrals", "viewNotifications",
      "viewDriveFiles", "uploadDriveFiles", "downloadDriveFiles", "shareDriveFiles",
    ],
  },
  {
    id: "finance_controller",
    name: "Finance & Accounts Specialist",
    badge: "Finance",
    description: "Invoices generation, expense recording, billing verification, and financial audit logs.",
    icon: "fa-solid fa-coins",
    modules: ["overview", "team", "clients", "finance", "it", "chat", "notifications"],
    features: [
      "viewKpiWidgets", "viewAnnouncements", "viewTeamDirectory", "viewSalaryData", "viewOrgChart",
      "viewClients", "viewReports", "exportClientData",
      "viewFinancePortal", "createInvoices", "approveInvoices", "confirmInvoicePayments", "exportInvoices", "manageExpenses", "viewExpenseReports",
      "viewITPortal", "manageITInvoices", "manageITSubscriptions",
      "sendChatMessages", "viewMailCenter", "sendEmails",
      "viewNotifications",
      "viewDriveFiles", "uploadDriveFiles", "downloadDriveFiles", "shareDriveFiles",
    ],
  },
  {
    id: "standard_employee",
    name: "Standard Team Member (Individual Contributor)",
    badge: "Day-to-Day",
    description: "Clean workspace with daily essentials: Timesheets, Kanban tasks, Chat, Leaves, and Kudos.",
    icon: "fa-solid fa-user",
    modules: ["overview", "team", "calendar", "projects", "chat", "referrals", "goals", "hr", "notifications"],
    features: [
      "viewKpiWidgets", "viewShiftOverview", "viewAnnouncements",
      "viewTeamDirectory", "viewEmployeeProfiles", "viewOrgChart",
      "logOwnTimesheet", "editOwnTimesheet", "clockInOut",
      "viewProjects", "changeTaskStatus", "commentOnTasks", "viewProjectWiki", "viewProjectGantt",
      "viewDriveFiles", "uploadDriveFiles", "downloadDriveFiles", "shareDriveFiles",
      "sendChatMessages", "viewMailCenter", "sendEmails", "joinVirtualHuddles",
      "viewOwnLeaves", "applyLeaves",
      "viewOwnAppraisals", "submitSelfReview",
      "viewGoals", "sendKudos", "submitSurvey",
      "submitReferral", "viewOwnReferrals",
      "viewNotifications",
    ],
  },
  {
    id: "read_only_auditor",
    name: "External Auditor / Read-Only Observer",
    badge: "Compliance",
    description: "Full visibility across all system records, audit logs, and timelines without edit or delete rights.",
    icon: "fa-solid fa-eye",
    modules: ["overview", "team", "calendar", "projects", "clients", "bd", "finance", "goals", "hr", "it", "analytics", "notifications"],
    features: [
      "viewKpiWidgets", "viewShiftOverview", "viewRecentActivity", "viewAnnouncements",
      "viewTeamDirectory", "viewEmployeeProfiles", "viewSalaryData", "viewOrgChart",
      "viewTeamTimesheets", "viewShiftCalendar",
      "viewProjects", "viewProjectWiki", "viewProjectGantt", "exportProjectData",
      "viewDriveFiles", "downloadDriveFiles",
      "viewAllLeaves", "viewManagerReviews", "viewGoals",
      "viewAnalyticsOverview", "viewPerformanceMetrics", "viewAuditLogs", "exportAuditLogs",
      "viewClients", "viewReports", "exportClientData",
      "viewBD", "exportBD",
      "viewFinancePortal", "viewExpenseReports", "exportInvoices",
      "viewITPortal", "viewAllReferrals", "viewNotifications",
    ],
  },
];

interface RoleDataControlTabProps {
  isAdmin: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function RoleDataControlTab({ isAdmin, showToast }: RoleDataControlTabProps) {
  const [selectedRole, setSelectedRole] = useState<string>("OPS");
  const [activeSubTab, setActiveSubTab] = useState<"modules" | "features" | "matrix">("features");
  const [permissionsMap, setPermissionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [featurePermissionsMap, setFeaturePermissionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [initialPermissionsMap, setInitialPermissionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [initialFeaturePermissionsMap, setInitialFeaturePermissionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [defaultPermissions, setDefaultPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [defaultFeaturePermissions, setDefaultFeaturePermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PERMITTED" | "DENIED">("ALL");
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [moduleStatusFilter, setModuleStatusFilter] = useState<"ALL" | "VISIBLE" | "HIDDEN">("ALL");
  const [matrixViewType, setMatrixViewType] = useState<"modules" | "features">("modules");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Category horizontal scroll controls
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 6);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
    }
  };

  useEffect(() => {
    checkCategoryScroll();
    window.addEventListener("resize", checkCategoryScroll);
    return () => window.removeEventListener("resize", checkCategoryScroll);
  }, [activeSubTab]);

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY * 1.5, behavior: "smooth" });
        checkCategoryScroll();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [activeSubTab]);

  const handleScrollCategories = (direction: "left" | "right") => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = 340;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
    setTimeout(checkCategoryScroll, 350);
  };

  const handleSelectCategory = (cat: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedCategoryFilter(cat);
    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  // Modals
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [cloneFromRole, setCloneFromRole] = useState("Employee");
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [roleToReset, setRoleToReset] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/permissions");
      if (res.ok) {
        const data = await res.json();
        const pMap = data.permissions || {};
        const fMap = data.featurePermissions || {};
        setPermissionsMap(pMap);
        setFeaturePermissionsMap(fMap);
        setInitialPermissionsMap(JSON.parse(JSON.stringify(pMap)));
        setInitialFeaturePermissionsMap(JSON.parse(JSON.stringify(fMap)));
        setDefaultPermissions(data.defaultPermissions || {});
        setDefaultFeaturePermissions(data.defaultFeaturePermissions || {});
        setCustomRoles(data.customRoles || []);
      }
    } catch (e) {
      console.error("fetchPermissions error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
    const expanded: Record<string, boolean> = {};
    FEATURE_CATEGORIES.forEach((cat) => { expanded[cat] = true; });
    setExpandedCategories(expanded);
  }, []);

  // ── Role Configuration ──────────────────────────────────────────────────────
  const defaultRoleConfig: Record<string, { label: string; color: string; activeBg: string; activeBorder: string; icon: string; isBuiltIn: boolean; badge?: string }> = {
    OPS:      { label: "OPS",          color: "text-primary", activeBg: "bg-primary/10", activeBorder: "border-primary/30", icon: "fa-solid fa-user-shield", isBuiltIn: true, badge: "SubAdmin" },
    Manager:  { label: "Manager",      color: "text-foreground", activeBg: "bg-muted", activeBorder: "border-border", icon: "fa-solid fa-user-gear", isBuiltIn: true },
    HR:       { label: "HR Specialist", color: "text-foreground", activeBg: "bg-muted", activeBorder: "border-border", icon: "fa-solid fa-user-group", isBuiltIn: true },
    Employee: { label: "Employee",     color: "text-foreground", activeBg: "bg-muted", activeBorder: "border-border", icon: "fa-solid fa-user", isBuiltIn: true },
  };

  const customColorStyles = [
    { color: "text-primary", activeBg: "bg-primary/10", activeBorder: "border-primary/30", icon: "fa-solid fa-user-tag" },
    { color: "text-primary", activeBg: "bg-primary/10", activeBorder: "border-primary/30", icon: "fa-solid fa-user-tie" },
    { color: "text-primary", activeBg: "bg-primary/10", activeBorder: "border-primary/30", icon: "fa-solid fa-user-check" },
    { color: "text-primary", activeBg: "bg-primary/10", activeBorder: "border-primary/30", icon: "fa-solid fa-id-badge" },
  ];

  const roleConfig: Record<string, { label: string; color: string; activeBg: string; activeBorder: string; icon: string; isBuiltIn: boolean; badge?: string }> = {
    ...defaultRoleConfig,
  };

  customRoles.forEach((r, idx) => {
    if (!roleConfig[r]) {
      const style = customColorStyles[idx % customColorStyles.length];
      roleConfig[r] = {
        label: r,
        color: style.color,
        activeBg: style.activeBg,
        activeBorder: style.activeBorder,
        icon: style.icon,
        isBuiltIn: false,
        badge: "Custom",
      };
    }
  });

  const allRoleKeys = Object.keys(roleConfig);

  // ── Dirty State Detection ──────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    const currMod = JSON.stringify(permissionsMap[selectedRole] || {});
    const initMod = JSON.stringify(initialPermissionsMap[selectedRole] || {});
    const currFeat = JSON.stringify(featurePermissionsMap[selectedRole] || {});
    const initFeat = JSON.stringify(initialFeaturePermissionsMap[selectedRole] || {});
    return currMod !== initMod || currFeat !== initFeat;
  }, [permissionsMap, initialPermissionsMap, featurePermissionsMap, initialFeaturePermissionsMap, selectedRole]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const activeRolePerms = permissionsMap[selectedRole] || {};
  const activeRoleFeaturePerms = featurePermissionsMap[selectedRole] || {};
  const totalModules = MODULES.length;
  const enabledModules = MODULES.filter((m) => activeRolePerms[m.key] ?? true).length;
  const totalFeatures = FEATURE_ACTIONS.length;
  const enabledFeatures = FEATURE_ACTIONS.filter((f) => activeRoleFeaturePerms[f.key] ?? false).length;

  const currentRoleCfg = roleConfig[selectedRole] || {
    label: selectedRole,
    color: "text-primary",
    activeBg: "bg-primary/10",
    activeBorder: "border-primary/40",
    icon: "fa-solid fa-user-tag",
    isBuiltIn: false,
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleModule = (moduleKey: string, targetRole: string = selectedRole) => {
    if (!isAdmin) return;
    setPermissionsMap((prev) => {
      const currentRolePerms = prev[targetRole] || {};
      const currentValue = currentRolePerms[moduleKey] ?? true;
      return { ...prev, [targetRole]: { ...currentRolePerms, [moduleKey]: !currentValue } };
    });
  };

  const handleToggleFeature = (featureKey: string, targetRole: string = selectedRole) => {
    if (!isAdmin) return;
    setFeaturePermissionsMap((prev) => {
      const currentRoleFeatures = prev[targetRole] || {};
      const currentValue = currentRoleFeatures[featureKey] ?? false;
      return { ...prev, [targetRole]: { ...currentRoleFeatures, [featureKey]: !currentValue } };
    });
  };

  const handleSetAllInCategory = (category: FeatureCategory, value: boolean) => {
    if (!isAdmin) return;
    const featuresInCat = FEATURE_ACTIONS.filter((f) => f.category === category);
    setFeaturePermissionsMap((prev) => {
      const currentRoleFeatures = prev[selectedRole] || {};
      const updates: Record<string, boolean> = {};
      featuresInCat.forEach((f) => { updates[f.key] = value; });
      return { ...prev, [selectedRole]: { ...currentRoleFeatures, ...updates } };
    });
  };

  const handleSetAllInSubGroup = (category: FeatureCategory, subGroup: string, value: boolean) => {
    if (!isAdmin) return;
    const featuresInSub = FEATURE_ACTIONS.filter((f) => f.category === category && (f.subGroup || "General Features") === subGroup);
    setFeaturePermissionsMap((prev) => {
      const currentRoleFeatures = prev[selectedRole] || {};
      const updates: Record<string, boolean> = {};
      featuresInSub.forEach((f) => { updates[f.key] = value; });
      return { ...prev, [selectedRole]: { ...currentRoleFeatures, ...updates } };
    });
  };

  const handleSetAllModules = (value: boolean) => {
    if (!isAdmin) return;
    setPermissionsMap((prev) => {
      const updates: Record<string, boolean> = {};
      MODULES.forEach((m) => { updates[m.key] = value; });
      return { ...prev, [selectedRole]: { ...(prev[selectedRole] || {}), ...updates } };
    });
  };

  const handleDiscardChanges = () => {
    setPermissionsMap(JSON.parse(JSON.stringify(initialPermissionsMap)));
    setFeaturePermissionsMap(JSON.parse(JSON.stringify(initialFeaturePermissionsMap)));
    showToast("Changes discarded", "success");
  };

  const handleApplyPresetTemplate = (template: RolePresetTemplate) => {
    if (!isAdmin) return;
    const modUpdates: Record<string, boolean> = {};
    MODULES.forEach((m) => {
      modUpdates[m.key] = template.modules.includes(m.key);
    });

    const featUpdates: Record<string, boolean> = {};
    FEATURE_ACTIONS.forEach((f) => {
      featUpdates[f.key] = template.features.includes(f.key);
    });

    setPermissionsMap((prev) => ({ ...prev, [selectedRole]: modUpdates }));
    setFeaturePermissionsMap((prev) => ({ ...prev, [selectedRole]: featUpdates }));
    setShowTemplateModal(false);
    showToast(`Template '${template.name}' applied to ${selectedRole}! Don't forget to save.`, "success");
  };

  const handleResetRoleToDefault = async (roleName: string) => {
    if (!isAdmin) return;
    try {
      setResetting(true);
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleName, action: "reset" }),
      });
      if (res.ok) {
        showToast(`'${roleName}' policy reset to system defaults!`, "success");
        setRoleToReset(null);
        await fetchPermissions();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("permissions-updated"));
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to reset permissions", "error");
      }
    } catch {
      showToast("Error resetting role permissions", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      const isCustomRole = !DEFAULT_BUILTIN_ROLES.includes(selectedRole);
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          isCustom: isCustomRole,
          modulePermissions: permissionsMap[selectedRole] || {},
          featurePermissions: featurePermissionsMap[selectedRole] || {},
        }),
      });
      if (res.ok) {
        showToast(`Permission policy for '${selectedRole}' saved!`, "success");
        await fetchPermissions();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("permissions-updated"));
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update permissions", "error");
      }
    } catch {
      showToast("Error updating role permissions", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      workspaceRBAC: {
        customRoles,
        roles: allRoleKeys.reduce((acc, r) => {
          acc[r] = {
            isCustom: !DEFAULT_BUILTIN_ROLES.includes(r),
            modulePermissions: permissionsMap[r] || {},
            featurePermissions: featurePermissionsMap[r] || {},
          };
          return acc;
        }, {} as Record<string, any>),
      },
    };

    const str = JSON.stringify(exportData, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(str);
      showToast("RBAC policy copied to clipboard!", "success");
    }

    const blob = new Blob([str], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexace-rbac-policy-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async () => {
    if (!importJsonText.trim()) {
      showToast("Please paste valid RBAC JSON payload", "error");
      return;
    }
    try {
      const parsed = JSON.parse(importJsonText);
      const policies = parsed.workspaceRBAC?.roles || parsed.roles || parsed;
      if (!policies || typeof policies !== "object") {
        showToast("Invalid RBAC JSON format: Missing roles object", "error");
        return;
      }

      setSaving(true);
      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk-import", policies }),
      });

      if (res.ok) {
        showToast("Bulk RBAC policies successfully imported!", "success");
        setShowExportImportModal(false);
        setImportJsonText("");
        await fetchPermissions();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("permissions-updated"));
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to import policies", "error");
      }
    } catch {
      showToast("Syntax error parsing JSON file. Please check format.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomRole = async () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      showToast("Please enter a role name", "error");
      return;
    }

    try {
      setSaving(true);
      const initialModules = permissionsMap[cloneFromRole] || permissionsMap.Employee || {};
      const initialFeatures = featurePermissionsMap[cloneFromRole] || featurePermissionsMap.Employee || {};

      const res = await fetch("/api/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: trimmed,
          isCustom: true,
          modulePermissions: initialModules,
          featurePermissions: initialFeatures,
        }),
      });

      if (res.ok) {
        showToast(`Custom role '${trimmed}' created!`, "success");
        setNewRoleName("");
        setShowAddRoleModal(false);
        await fetchPermissions();
        setSelectedRole(trimmed);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("permissions-updated"));
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create custom role", "error");
      }
    } catch {
      showToast("Error creating custom role", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomRole = async (roleName: string) => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/settings/permissions?role=${encodeURIComponent(roleName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Custom role '${roleName}' deleted`, "success");
        setSelectedRole("OPS");
        setRoleToDelete(null);
        await fetchPermissions();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete role", "error");
      }
    } catch {
      showToast("Error deleting custom role", "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered Features ───────────────────────────────────────────────────────
  const filteredFeatures = useMemo(() => {
    return FEATURE_ACTIONS.filter((f) => {
      const matchesSearch =
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.subGroup && f.subGroup.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategoryFilter === "ALL" || f.category === selectedCategoryFilter;

      const isPermitted = activeRoleFeaturePerms[f.key] ?? false;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PERMITTED" && isPermitted) ||
        (statusFilter === "DENIED" && !isPermitted);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedCategoryFilter, statusFilter, activeRoleFeaturePerms]);

  const visibleCategories = useMemo(() => {
    return FEATURE_CATEGORIES.filter((cat) =>
      filteredFeatures.some((f) => f.category === cat)
    );
  }, [filteredFeatures]);

  // ── Filtered Modules ────────────────────────────────────────────────────────
  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      const matchesSearch =
        !moduleSearchQuery ||
        m.name.toLowerCase().includes(moduleSearchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(moduleSearchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(moduleSearchQuery.toLowerCase());

      const isAllowed = activeRolePerms[m.key] ?? true;
      const matchesStatus =
        moduleStatusFilter === "ALL" ||
        (moduleStatusFilter === "VISIBLE" && isAllowed) ||
        (moduleStatusFilter === "HIDDEN" && !isAllowed);

      return matchesSearch && matchesStatus;
    });
  }, [moduleSearchQuery, moduleStatusFilter, activeRolePerms]);

  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    FEATURE_CATEGORIES.forEach((cat) => { next[cat] = expand; });
    setExpandedCategories(next);
  };

  return (
    <div className="space-y-6">
      {/* ── UN-SAVED CHANGES FLOATING BANNER ── */}
      {isDirty && isAdmin && (
        <div className="sticky top-4 z-40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 backdrop-blur-xl shadow-xl animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              Unsaved changes on <strong className="underline decoration-amber-500/60 font-bold">{currentRoleCfg.label}</strong> policy.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-background/80 hover:bg-background text-foreground border border-border shadow-xs transition-colors cursor-pointer flex-1 sm:flex-initial text-center"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 flex-1 sm:flex-initial"
            >
              <i className="fa-solid fa-floppy-disk text-xs" />
              {saving ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-primary text-base" />
              Role &amp; Feature Permissions
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              RBAC Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure access control, module visibility, and operational capabilities per role.
          </p>
        </div>

        {/* Global Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-nowrap sm:flex-wrap w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-card hover:bg-muted/60 text-foreground border border-border/80 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Apply Archetype Preset"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-primary text-xs" />
              <span>Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExportImportModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-card hover:bg-muted/60 text-foreground border border-border/80 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Export / Import JSON Policy"
            >
              <i className="fa-solid fa-file-code text-primary text-xs" />
              <span>Export / Import</span>
            </button>

            {currentRoleCfg.isBuiltIn ? (
              <button
                type="button"
                onClick={() => setRoleToReset(selectedRole)}
                disabled={resetting}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-border/80 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                title="Reset Role to Factory Defaults"
              >
                <i className="fa-solid fa-arrow-rotate-left text-xs" />
                <span>Reset</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRoleToDelete(selectedRole)}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/25 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                title="Delete Custom Role"
              >
                <i className="fa-solid fa-trash-can text-xs" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={saving || loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <i className={cn("fa-solid text-xs", saving ? "fa-spinner fa-spin" : "fa-floppy-disk")} />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── CLEAN INLINE STATUS & METADATA BAR (Replaces 3 giant bulky cards) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 flex-wrap bg-card/80 px-3.5 sm:px-4 py-2.5 rounded-xl border border-border/80 text-xs">
        {/* Left: Role Context */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-muted-foreground font-medium">Configuring:</span>
          <span className="font-bold text-foreground flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg">
            <i className={cn(currentRoleCfg.icon, "text-xs")} /> {currentRoleCfg.label}
          </span>
          {currentRoleCfg.badge && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border font-bold uppercase">
              {currentRoleCfg.badge}
            </span>
          )}
        </div>

        {/* Right: Metrics + Sync status */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-muted-foreground">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span>Modules:</span>
            <strong className="text-foreground font-semibold">{enabledModules}/{totalModules}</strong>
            <div className="w-10 sm:w-12 h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((enabledModules / (totalModules || 1)) * 100)}%` }} />
            </div>
          </div>

          <span className="text-border">•</span>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span>Permissions:</span>
            <strong className="text-foreground font-semibold">{enabledFeatures}/{totalFeatures}</strong>
            <span className="text-[11px] text-muted-foreground font-normal">({Math.round((enabledFeatures / (totalFeatures || 1)) * 100)}%)</span>
            <div className="w-10 sm:w-12 h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.round((enabledFeatures / (totalFeatures || 1)) * 100)}%` }} />
            </div>
          </div>

          <span className="text-border">•</span>

          {isDirty ? (
            <span className="text-amber-500 font-semibold inline-flex items-center gap-1 text-[11px]">
              <i className="fa-solid fa-circle-exclamation text-[10px]" /> Unsaved
            </span>
          ) : (
            <span className="text-primary font-medium inline-flex items-center gap-1 text-[11px]">
              <i className="fa-solid fa-circle-check text-[10px]" /> Synced
            </span>
          )}
        </div>
      </div>

      {/* ── ROLE SELECTOR & VIEW SUB-TABS ROW ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 flex-nowrap sm:flex-wrap w-full lg:w-auto">
          {allRoleKeys.map((role) => {
            const cfg = roleConfig[role];
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border whitespace-nowrap shrink-0 sm:shrink",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold ring-1 ring-primary/30"
                    : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                )}
              >
                <i className={cn(cfg.icon, isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                {cfg.label}
              </button>
            );
          })}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddRoleModal(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-dashed border-border/80 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40 whitespace-nowrap shrink-0"
              title="Add Custom Role"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Add Role</span>
            </button>
          )}
        </div>

        {/* View Switcher Tabs (Module Access | Feature Actions | Comparison Matrix) */}
        <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border/80 text-xs shrink-0 shadow-2xs overflow-x-auto no-scrollbar w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("features")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial",
              activeSubTab === "features" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-key text-xs" /> Feature Actions
            <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-bold", activeSubTab === "features" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {enabledFeatures}/{totalFeatures}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("modules")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial",
              activeSubTab === "modules" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-layer-group text-xs" /> Module Access
            <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-bold", activeSubTab === "modules" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {enabledModules}/{totalModules}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("matrix")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial",
              activeSubTab === "matrix" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-table-columns text-xs" /> Matrix
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: MODULE ACCESS TAB                                           */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "modules" && (
        <div className="space-y-4">
          {/* Search & Status Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search modules by name, keyword or category..."
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {moduleSearchQuery && (
                <button onClick={() => setModuleSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setModuleStatusFilter("ALL")}
                  className={cn("px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer", moduleStatusFilter === "ALL" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  All ({totalModules})
                </button>
                <button
                  type="button"
                  onClick={() => setModuleStatusFilter("VISIBLE")}
                  className={cn("px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-emerald-600 dark:text-emerald-400", moduleStatusFilter === "VISIBLE" ? "bg-emerald-500/15 shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  Visible ({enabledModules})
                </button>
                <button
                  type="button"
                  onClick={() => setModuleStatusFilter("HIDDEN")}
                  className={cn("px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-rose-500", moduleStatusFilter === "HIDDEN" ? "bg-rose-500/15 shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  Hidden ({totalModules - enabledModules})
                </button>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllModules(true)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-bold transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-check-double mr-1" /> Enable All
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllModules(false)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-muted text-muted-foreground border border-border hover:bg-accent font-bold transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark mr-1" /> Disable All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredModules.map((mod) => {
              const isAllowed = activeRolePerms[mod.key] ?? true;
              return (
                <div
                  key={mod.key}
                  onClick={() => handleToggleModule(mod.key)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex items-start justify-between gap-3.5 select-none",
                    isAdmin ? "cursor-pointer" : "cursor-default",
                    isAllowed
                      ? "border-emerald-500/40 bg-card hover:border-emerald-500/60 hover:shadow-sm border-l-4 border-l-emerald-500"
                      : "border-border/60 bg-muted/20 hover:bg-muted/30 opacity-65 border-l-4 border-l-transparent"
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-xl shrink-0 border shadow-xs transition-colors",
                      isAllowed ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-muted border-border text-muted-foreground"
                    )}>
                      <i className={cn(mod.icon, "text-base")} />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{mod.name}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-muted/60 text-muted-foreground border border-border font-semibold">
                          {mod.category}
                        </span>
                        {isAllowed ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold inline-flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[9px]" /> Accessible
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold inline-flex items-center gap-1">
                            <i className="fa-solid fa-circle-xmark text-[9px]" /> Restricted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                    </div>
                  </div>

                  {/* Tactile Toggle Switch */}
                  <div className="shrink-0 pt-1">
                    <div className={cn(
                      "w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer shadow-inner",
                      isAllowed ? "bg-emerald-500 shadow-xs shadow-emerald-500/40" : "bg-muted-foreground/25 border border-border/80"
                    )}>
                      <div className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 flex items-center justify-center text-[8px]",
                        isAllowed ? "translate-x-4 text-emerald-600" : "translate-x-0 text-muted-foreground/40"
                      )}>
                        <i className={cn("fa-solid", isAllowed ? "fa-check" : "fa-minus")} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: FEATURE ACTIONS TAB (Master-Detail Enterprise Layout)       */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "features" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          {/* ── LEFT COLUMN: Filter & Domains Navigation Sidebar ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-3.5 space-y-3 lg:sticky lg:top-4 shadow-2xs">
            {/* Search Input */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search capabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              )}
            </div>

            {/* Status Filter Segmented Control */}
            <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={cn(
                  "py-1 rounded-lg text-center font-medium transition-all cursor-pointer",
                  statusFilter === "ALL" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PERMITTED")}
                className={cn(
                  "py-1 rounded-lg text-center font-medium transition-all cursor-pointer flex items-center justify-center gap-1",
                  statusFilter === "PERMITTED" ? "bg-primary/10 text-primary border border-primary/20 font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-circle-check text-[9px]" /> Allowed
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DENIED")}
                className={cn(
                  "py-1 rounded-lg text-center font-medium transition-all cursor-pointer flex items-center justify-center gap-1",
                  statusFilter === "DENIED" ? "bg-muted text-foreground font-semibold shadow-2xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-circle-minus text-[9px]" /> Denied
              </button>
            </div>

            {/* Domains Navigation Header */}
            <div className="pt-1">
              <div className="flex items-center justify-between pb-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
                <span className="uppercase tracking-wider text-[10px]">Domains ({FEATURE_CATEGORIES.length})</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleExpandAll(true)}
                    className="hover:text-foreground cursor-pointer transition-colors"
                    title="Expand all accordions"
                  >
                    Expand
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleExpandAll(false)}
                    className="hover:text-foreground cursor-pointer transition-colors"
                    title="Collapse all accordions"
                  >
                    Collapse
                  </button>
                </div>
              </div>

              {/* On Mobile (<lg): Horizontal scrollable pill chips so it doesn't take 400px vertical space */}
              <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                    selectedCategoryFilter === "ALL"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "bg-background border-border/80 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-layer-group text-xs" />
                  <span>All ({FEATURE_ACTIONS.length})</span>
                </button>
                {FEATURE_CATEGORIES.map((cat) => {
                  const catCount = FEATURE_ACTIONS.filter((f) => f.category === cat).length;
                  const isSelected = selectedCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border whitespace-nowrap",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "bg-background border-border/80 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <i className={cn(CATEGORY_ICONS[cat], "text-xs", isSelected ? "text-primary-foreground" : "text-primary")} />
                      <span>{cat} ({catCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* On Desktop (>=lg): Vertical Scrollable Category List */}
              <div className="hidden lg:block max-h-[calc(100vh-320px)] overflow-y-auto no-scrollbar space-y-0.5 pr-0.5">
                {/* All Domains Item */}
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer text-left border",
                    selectedCategoryFilter === "ALL"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <i className="fa-solid fa-layer-group text-xs" />
                    All Domains
                  </span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-bold",
                    selectedCategoryFilter === "ALL" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {FEATURE_ACTIONS.length}
                  </span>
                </button>

                {/* Individual Categories */}
                {FEATURE_CATEGORIES.map((cat) => {
                  const catCount = FEATURE_ACTIONS.filter((f) => f.category === cat).length;
                  const catPermitted = FEATURE_ACTIONS.filter((f) => f.category === cat && (activeRoleFeaturePerms[f.key] ?? false)).length;
                  const isSelected = selectedCategoryFilter === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={cn(
                        "w-full px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer text-left border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <i className={cn(CATEGORY_ICONS[cat], "text-xs", isSelected ? "text-primary-foreground" : "text-primary")} />
                        <span className="truncate">{cat}</span>
                      </span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-md font-bold shrink-0",
                        isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {catPermitted}/{catCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Focused Permissions Workspace ── */}
          <div className="space-y-4 min-w-0">
            {/* Active Filter Notice */}
            {(searchQuery || statusFilter !== "ALL" || selectedCategoryFilter !== "ALL") && (
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3.5 py-2 rounded-xl border border-border/60">
                <span>
                  Showing <strong className="text-foreground">{filteredFeatures.length}</strong> capabilities
                  {selectedCategoryFilter !== "ALL" && <> in <strong className="text-foreground">{selectedCategoryFilter}</strong></>}
                  {statusFilter !== "ALL" && <> ({statusFilter.toLowerCase()} only)</>}
                  {searchQuery && <> matching &quot;{searchQuery}&quot;</>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategoryFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                  className="text-primary hover:underline font-bold cursor-pointer text-xs"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Categories Accordions / Content */}
            <div className="space-y-3.5">
              {visibleCategories.map((category) => {
                const catFeatures = filteredFeatures.filter((f) => f.category === category);
                const catIcon = CATEGORY_ICONS[category];
                const isExpanded = expandedCategories[category] ?? true;
                const enabledInCat = catFeatures.filter((f) => activeRoleFeaturePerms[f.key] ?? false).length;
                const allEnabled = catFeatures.every((f) => activeRoleFeaturePerms[f.key] ?? false);
                const noneEnabled = catFeatures.every((f) => !(activeRoleFeaturePerms[f.key] ?? false));

                return (
                  <div key={category} className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all">
                    {/* Category Header Bar */}
                    <div className="px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-border/60 bg-muted/20 dark:bg-card/70 hover:bg-muted/30 transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedCategories((prev) => ({ ...prev, [category]: !isExpanded }))}
                        className="flex items-center gap-3 flex-1 text-left cursor-pointer min-w-0"
                      >
                        <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 border bg-primary/10 border-primary/20 text-primary">
                          <i className={cn(catIcon, "text-xs")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-semibold text-foreground truncate">{category}</div>
                          <div className="text-[10px] text-muted-foreground">{catFeatures.length} capabilities</div>
                        </div>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ml-1 bg-primary/10 text-primary border border-primary/20">
                          {enabledInCat}/{catFeatures.length} Enabled
                        </span>
                        <i className={cn("fa-solid text-xs text-muted-foreground ml-2 shrink-0 transition-transform", isExpanded ? "fa-chevron-up" : "fa-chevron-down")} />
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleSetAllInCategory(category, true)}
                            disabled={allEnabled}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all flex items-center gap-1.5 shadow-2xs",
                              allEnabled
                                ? "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed"
                                : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/25 cursor-pointer active:scale-95"
                            )}
                            title="Grant all capabilities in this domain"
                          >
                            <i className="fa-solid fa-check-double text-[10px]" />
                            <span className="hidden xs:inline">Allow All</span>
                            <span className="xs:hidden">Allow</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetAllInCategory(category, false)}
                            disabled={noneEnabled}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all flex items-center gap-1.5 shadow-2xs",
                              noneEnabled
                                ? "bg-muted/40 text-muted-foreground/40 border-border/40 cursor-not-allowed"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border cursor-pointer active:scale-95"
                            )}
                            title="Revoke all capabilities in this domain"
                          >
                            <i className="fa-solid fa-ban text-[10px]" />
                            <span className="hidden xs:inline">Revoke All</span>
                            <span className="xs:hidden">Revoke</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Accordion Content */}
                    {isExpanded && (
                      <div className="divide-y divide-border/40">
                        {(() => {
                          const subGroups = Array.from(new Set(catFeatures.map((f) => f.subGroup || "General Features")));

                          return subGroups.map((subGroupName) => {
                            const subGroupFeats = catFeatures.filter((f) => (f.subGroup || "General Features") === subGroupName);
                            const subGroupPermitted = subGroupFeats.filter((f) => activeRoleFeaturePerms[f.key] ?? false).length;
                            const isSubAll = subGroupFeats.every((f) => activeRoleFeaturePerms[f.key] ?? false);

                            return (
                              <div key={subGroupName} className="space-y-0">
                                {/* Subgroup Header */}
                                <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                                      <i className="fa-solid fa-folder-tree" />
                                    </div>
                                    <span>{subGroupName}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <span className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full font-medium border transition-colors",
                                      isSubAll
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : "bg-muted text-muted-foreground border-border"
                                    )}>
                                      {subGroupPermitted}/{subGroupFeats.length}
                                    </span>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetAllInSubGroup(category, subGroupName, !isSubAll)}
                                        className={cn(
                                          "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95",
                                          isSubAll
                                            ? "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border"
                                            : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/25"
                                        )}
                                      >
                                        <i className={cn("fa-solid text-[9px]", isSubAll ? "fa-ban" : "fa-check")} />
                                        <span>{isSubAll ? "Revoke Group" : "Enable Group"}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Features inside Subgroup */}
                                <div className="p-3 sm:p-3.5 bg-muted/5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {subGroupFeats.map((feat) => {
                                    const isAllowed = activeRoleFeaturePerms[feat.key] ?? false;

                                    return (
                                      <div
                                        key={feat.key}
                                        onClick={() => handleToggleFeature(feat.key)}
                                        className={cn(
                                          "p-3 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 select-none group",
                                          isAdmin ? "cursor-pointer active:scale-[0.99]" : "cursor-default",
                                          isAllowed
                                            ? "bg-card border-border/80 shadow-2xs hover:border-primary/40 hover:shadow-xs"
                                            : "bg-card/40 border-border/40 hover:border-border/80 opacity-70 hover:opacity-90"
                                        )}
                                      >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className={cn(
                                            "w-9 h-9 flex items-center justify-center rounded-xl shrink-0 border transition-all shadow-2xs",
                                            isAllowed
                                              ? "bg-primary/10 text-primary border-primary/20 group-hover:scale-105"
                                              : "bg-muted border-border text-muted-foreground/60"
                                          )}>
                                            <i className={cn(feat.icon, "text-xs")} />
                                          </div>
                                          <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="font-semibold text-xs text-foreground flex items-center gap-2 flex-wrap">
                                              <span className="truncate">{feat.name}</span>
                                              {isAllowed ? (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20 shrink-0 inline-flex items-center gap-1">
                                                  <i className="fa-solid fa-circle-check text-[8px]" /> Permitted
                                                </span>
                                              ) : (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground/70 font-medium border border-border shrink-0 inline-flex items-center gap-1">
                                                  <i className="fa-solid fa-circle-minus text-[8px]" /> Denied
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed truncate sm:whitespace-normal">{feat.description}</p>
                                          </div>
                                        </div>

                                        {/* Tactile Toggle Switch */}
                                        <div className="shrink-0 pl-2">
                                          <div className={cn(
                                            "w-10 h-6 flex items-center rounded-full p-0.5 transition-all duration-200 cursor-pointer shadow-inner",
                                            isAllowed ? "bg-primary shadow-xs shadow-primary/30" : "bg-muted-foreground/20 border border-border/80 group-hover:bg-muted-foreground/30"
                                          )}>
                                            <div className={cn(
                                              "w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center text-[8px]",
                                              isAllowed ? "translate-x-4 text-primary font-bold" : "translate-x-0 text-muted-foreground/40"
                                            )}>
                                              <i className={cn("fa-solid", isAllowed ? "fa-check" : "fa-minus")} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 3: ROLE COMPARISON MATRIX                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "matrix" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap bg-card p-3 rounded-2xl border border-border shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-table text-primary text-xs" /> Comparison Target:
              </span>
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setMatrixViewType("modules")}
                  className={cn("px-3 py-1 rounded-lg font-bold transition-all cursor-pointer", matrixViewType === "modules" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  Modules ({totalModules})
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixViewType("features")}
                  className={cn("px-3 py-1 rounded-lg font-bold transition-all cursor-pointer", matrixViewType === "features" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                >
                  Features ({totalFeatures})
                </button>
              </div>
            </div>

            <div className="relative min-w-[260px]">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
              <input
                type="text"
                placeholder={`Search rows (${matrixViewType === "modules" ? "Modules" : "Actions"})...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* Matrix Table */}
          <div className="border border-border rounded-2xl overflow-hidden shadow-xs overflow-x-auto bg-card">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="p-3.5 font-bold text-foreground min-w-[240px]">
                    {matrixViewType === "modules" ? "Application Module" : "Feature Action Capability"}
                  </th>
                  {allRoleKeys.map((role) => {
                    const cfg = roleConfig[role];
                    const rModCount = MODULES.filter((m) => (permissionsMap[role] || {})[m.key] ?? true).length;
                    const rFeatCount = FEATURE_ACTIONS.filter((f) => (featurePermissionsMap[role] || {})[f.key] ?? false).length;
                    const percentage = matrixViewType === "modules"
                      ? Math.round((rModCount / (totalModules || 1)) * 100)
                      : Math.round((rFeatCount / (totalFeatures || 1)) * 100);

                    return (
                      <th key={role} className="p-3 text-center min-w-[120px] border-l border-border/50">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn("font-bold flex items-center gap-1.5", cfg.color)}>
                            <i className={cn(cfg.icon, "text-xs")} /> {cfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {matrixViewType === "modules" ? `${rModCount}/${totalModules}` : `${rFeatCount}/${totalFeatures}`} ({percentage}%)
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {matrixViewType === "modules" ? (
                  MODULES
                    .filter((m) => !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((mod) => (
                      <tr key={mod.key} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                              <i className={cn(mod.icon, "text-xs")} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground text-xs">{mod.name}</div>
                              <div className="text-[10px] text-muted-foreground">{mod.category}</div>
                            </div>
                          </div>
                        </td>
                        {allRoleKeys.map((role) => {
                          const isGranted = (permissionsMap[role] || {})[mod.key] ?? true;
                          return (
                            <td key={role} className="p-3 text-center border-l border-border/40">
                              <button
                                type="button"
                                onClick={() => handleToggleModule(mod.key, role)}
                                disabled={!isAdmin}
                                className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-xl transition-all",
                                  isAdmin ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default",
                                  isGranted
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                                    : "bg-muted/40 text-muted-foreground/40 border border-border/50"
                                )}
                                title={`${isGranted ? "Granted" : "Denied"} for ${role}`}
                              >
                                <i className={cn("fa-solid text-xs", isGranted ? "fa-check text-primary" : "fa-minus text-muted-foreground/40")} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                ) : (
                  FEATURE_ACTIONS
                    .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((feat) => (
                      <tr key={feat.key} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                              <i className={cn(feat.icon, "text-xs")} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground text-xs">{feat.name}</div>
                              <div className="text-[10px] text-muted-foreground">{feat.category} • {feat.subGroup}</div>
                            </div>
                          </div>
                        </td>
                        {allRoleKeys.map((role) => {
                          const isGranted = (featurePermissionsMap[role] || {})[feat.key] ?? false;
                          return (
                            <td key={role} className="p-3 text-center border-l border-border/40">
                              <button
                                type="button"
                                onClick={() => handleToggleFeature(feat.key, role)}
                                disabled={!isAdmin}
                                className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-xl transition-all",
                                  isAdmin ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default",
                                  isGranted
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                                    : "bg-muted/40 text-muted-foreground/40 border border-border/50"
                                )}
                                title={`${isGranted ? "Granted" : "Denied"} for ${role}`}
                              >
                                <i className={cn("fa-solid text-xs", isGranted ? "fa-check text-primary" : "fa-minus text-muted-foreground/40")} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: PRESET TEMPLATES                                             */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-solid fa-wand-magic-sparkles text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Apply Preset Role Archetype</h3>
                  <p className="text-xs text-muted-foreground">Select a pre-configured template to apply to &apos;{selectedRole}&apos;</p>
                </div>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {PRESET_TEMPLATES.map((tmpl) => (
                <div key={tmpl.id} className="p-4 rounded-2xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                        <i className={cn(tmpl.icon, "text-primary text-sm")} /> {tmpl.name}
                      </div>
                      <Badge variant="soft" color="info" className="text-[9px] px-1.5 py-0">{tmpl.badge}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tmpl.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                      <span><i className="fa-solid fa-layer-group text-primary mr-1" />{tmpl.modules.length} Modules</span>
                      <span>•</span>
                      <span><i className="fa-solid fa-key text-emerald-500 mr-1" />{tmpl.features.length} Actions</span>
                    </div>
                  </div>

                  <Button size="sm" onClick={() => handleApplyPresetTemplate(tmpl)} className="w-full text-xs font-semibold gap-1.5 cursor-pointer">
                    <i className="fa-solid fa-bolt text-xs" /> Apply to {selectedRole}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setShowTemplateModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EXPORT / IMPORT JSON                                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showExportImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                  <i className="fa-solid fa-file-code text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Export &amp; Import RBAC Policies</h3>
                  <p className="text-xs text-muted-foreground">Backup or restore granular role policies as JSON</p>
                </div>
              </div>
              <button onClick={() => setShowExportImportModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-muted/40 rounded-2xl border border-border flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground">Export Current RBAC Policies</div>
                  <div className="text-[11px] text-muted-foreground">Download or copy full workspace role configuration JSON</div>
                </div>
                <Button size="sm" onClick={handleExportJson} className="text-xs gap-1.5 cursor-pointer">
                  <i className="fa-solid fa-download text-xs" /> Export JSON
                </Button>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-foreground block">
                  Restore / Import JSON Configuration:
                </label>
                <textarea
                  rows={6}
                  placeholder='Paste workspace RBAC policies JSON here...'
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full p-3 text-[11px] font-mono rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setShowExportImportModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                onClick={handleImportJson}
                disabled={saving || !importJsonText.trim()}
                className="text-xs font-bold gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-cloud-arrow-up text-xs" />
                {saving ? "Importing..." : "Apply Imported Policies"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RESET ROLE CONFIRMATION                                      */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {roleToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                <i className="fa-solid fa-arrow-rotate-left text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Reset to System Baseline</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to restore <strong className="text-foreground">{roleToReset}</strong> to factory default permissions? Any customized overrides will be reverted.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setRoleToReset(null)} disabled={resetting}>
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                onClick={() => handleResetRoleToDefault(roleToReset)}
                disabled={resetting}
                className="gap-1.5 font-bold cursor-pointer"
              >
                <i className="fa-solid fa-arrow-rotate-left text-xs" />
                {resetting ? "Resetting..." : "Confirm Reset"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE CUSTOM ROLE                                           */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <i className="fa-solid fa-user-plus text-primary text-sm" /> Create Custom Role
              </h3>
              <button onClick={() => setShowAddRoleModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. QA Specialist, Support Lead, Sales Ops..."
                  value={newRoleName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Clone Base Permissions From</label>
                <select
                  value={cloneFromRole}
                  onChange={(e) => setCloneFromRole(e.target.value)}
                  className="w-full h-9 text-xs bg-background border border-border rounded-xl px-3 text-foreground outline-none cursor-pointer"
                >
                  <option value="Employee">Employee (Basic permissions)</option>
                  <option value="Manager">Manager (Team leadership permissions)</option>
                  <option value="HR">HR Specialist (HR &amp; Leave permissions)</option>
                  <option value="OPS">OPS SubAdmin (Broad workspace access)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowAddRoleModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                onClick={handleCreateCustomRole}
                disabled={saving || !newRoleName.trim()}
                className="text-xs font-semibold gap-1.5"
              >
                <i className="fa-solid fa-check text-xs" /> {saving ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DELETE CUSTOM ROLE CONFIRMATION                              */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Custom Role</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete the custom role <strong className="text-foreground">{roleToDelete}</strong>? Permissions configured for this role will be removed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setRoleToDelete(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleDeleteCustomRole(roleToDelete)}
                disabled={deleting}
                className="gap-2 font-semibold cursor-pointer"
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Delete Role
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
