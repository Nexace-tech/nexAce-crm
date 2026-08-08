"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModuleMeta {
  key: string;
  name: string;
  description: string;
  icon: string;
}

const MODULES: ModuleMeta[] = [
  { key: "overview", name: "Overview Dashboard", description: "Main dashboard KPI widgets and shift overviews", icon: "fa-solid fa-chart-simple" },
  { key: "team", name: "My Team Directory", description: "Organization employee listing, org structure, and profiles", icon: "fa-solid fa-users" },
  { key: "calendar", name: "Calendar & Timesheets", description: "Work log entry, shift scheduling, and time tracking", icon: "fa-solid fa-calendar-days" },
  { key: "projects", name: "Projects, Sprints & Drive", description: "Agile kanban board, drive file storage, and project wiki", icon: "fa-solid fa-folder-tree" },
  { key: "chat", name: "Chat & Messaging", description: "Realtime workspace channels and direct team chat", icon: "fa-solid fa-comments" },
  { key: "hr", name: "HR Management Portal", description: "Leave requests, appraisals, onboarding, and case tracking", icon: "fa-solid fa-briefcase" },
  { key: "goals", name: "Goals, OKRs & Surveys", description: "Strategic goal tracking, kudos, and team pulse surveys", icon: "fa-solid fa-bullseye" },
  { key: "analytics", name: "Analytics & Audit Logs", description: "Detailed activity timeline logs and workspace analytics", icon: "fa-solid fa-chart-line" },
  { key: "clients", name: "Operations", description: "Billable client project/retainer scope, owner, phase and health", icon: "fa-solid fa-list-check" },
  { key: "referrals", name: "Candidate Referral Pipeline", description: "Employee referral submissions and bonus tracking", icon: "fa-solid fa-link" },
  { key: "settings", name: "Settings & Administration", description: "User management, workspace branding, and security", icon: "fa-solid fa-gear" },
];

type FeatureCategory =
  | "Overview"
  | "Team"
  | "Calendar & Time"
  | "Projects"
  | "Drive"
  | "Sprints"
  | "Chat"
  | "HR & Leave"
  | "Appraisals"
  | "Goals & OKRs"
  | "Analytics"
  | "CRM & Clients"
  | "Referrals"
  | "Admin & Users"
  | "Settings";

interface FeatureMeta {
  key: string;
  name: string;
  category: FeatureCategory;
  subGroup?: string;
  description: string;
  icon: string;
}

const FEATURE_ACTIONS: FeatureMeta[] = [
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
  { key: "createChatChannels", name: "Create Chat Channels", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Create new public or private team chat channels", icon: "fa-solid fa-hashtag" },
  { key: "deleteChatChannels", name: "Delete Chat Channels", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Archive or permanently remove team chat channels", icon: "fa-solid fa-circle-minus" },
  { key: "pinChatMessages", name: "Pin Messages in Channels", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Pin important messages in any team channel", icon: "fa-solid fa-thumbtack" },
  { key: "deleteOthersChatMessages", name: "Delete Others Messages", category: "Chat", subGroup: "Workspace Chat & Channels", description: "Remove messages posted by other team members", icon: "fa-solid fa-comment-slash" },
  { key: "viewMailCenter", name: "View Mail Center Inbox", category: "Chat", subGroup: "Mail Center (Client Emails)", description: "Access and read client email threads in Mail Center", icon: "fa-solid fa-inbox" },
  { key: "sendEmails", name: "Send Mail Center Emails", category: "Chat", subGroup: "Mail Center (Client Emails)", description: "Compose & send external emails from Mail Center inbox", icon: "fa-solid fa-envelope" },
  { key: "deleteEmails", name: "Delete Mail Center Emails", category: "Chat", subGroup: "Mail Center (Client Emails)", description: "Remove or archive email threads in Mail Center", icon: "fa-solid fa-trash-can" },
  { key: "viewWhatsAppPanel", name: "Access WhatsApp Business", category: "Chat", subGroup: "WhatsApp Business API", description: "Access WhatsApp Business API threads and client chats", icon: "fa-brands fa-whatsapp" },
  { key: "sendWhatsAppMessages", name: "Send WhatsApp Messages", category: "Chat", subGroup: "WhatsApp Business API", description: "Send WhatsApp Business API messages to clients & leads", icon: "fa-solid fa-paper-plane" },
  { key: "startVirtualHuddles", name: "Start Virtual Video Huddles", category: "Chat", subGroup: "Virtual Video Huddles", description: "Launch audio/video huddles with team members", icon: "fa-solid fa-video" },
  { key: "joinVirtualHuddles", name: "Join Video Huddle Calls", category: "Chat", subGroup: "Virtual Video Huddles", description: "Join active audio/video huddles started by teammates", icon: "fa-solid fa-headset" },

  // HR & Leave
  { key: "applyLeave", name: "Apply for Leave", category: "HR & Leave", subGroup: "Leave Management", description: "Submit leave applications for self", icon: "fa-solid fa-calendar-xmark" },
  { key: "viewOwnLeaveStatus", name: "View Own Leave Status", category: "HR & Leave", subGroup: "Leave Management", description: "Track own leave request approval status and balance", icon: "fa-solid fa-calendar-day" },
  { key: "viewTeamLeave", name: "View Team Leave Requests", category: "HR & Leave", subGroup: "Leave Management", description: "See all pending and approved leave for team members", icon: "fa-solid fa-calendar-week" },
  { key: "approveLeave", name: "Approve / Reject Leave", category: "HR & Leave", subGroup: "Leave Management", description: "Review and approve or reject employee leave applications", icon: "fa-solid fa-calendar-check" },
  { key: "viewHROnboarding", name: "View HR Onboarding Portal", category: "HR & Leave", subGroup: "Onboarding & Offboarding", description: "Access new hire onboarding checklists and progress", icon: "fa-solid fa-user-graduate" },
  { key: "manageOnboarding", name: "Manage Onboarding Cases", category: "HR & Leave", subGroup: "Onboarding & Offboarding", description: "Create and manage new hire onboarding checklists", icon: "fa-solid fa-user-check" },
  { key: "viewHRCases", name: "View HR Cases & Issues", category: "HR & Leave", subGroup: "HR Compliance Help Desk", description: "Access HR case management and escalated issues", icon: "fa-solid fa-briefcase-medical" },
  { key: "createHRCases", name: "Create HR Cases", category: "HR & Leave", subGroup: "HR Compliance Help Desk", description: "Log new HR cases, grievances, or compliance issues", icon: "fa-solid fa-file-circle-plus" },
  { key: "manageHRCases", name: "Resolve & Close HR Cases", category: "HR & Leave", subGroup: "HR Compliance Help Desk", description: "Update, resolve, and close open HR compliance cases", icon: "fa-solid fa-folder-check" },

  // Appraisals
  { key: "viewOwnAppraisal", name: "View Own Appraisal", category: "Appraisals", subGroup: "Performance Reviews", description: "See own performance review scores and comments", icon: "fa-solid fa-star" },
  { key: "submitSelfReview", name: "Submit Self-Assessment", category: "Appraisals", subGroup: "Performance Reviews", description: "Fill in self-evaluation forms for performance cycles", icon: "fa-solid fa-pen-to-square" },
  { key: "reviewTeamAppraisals", name: "Review Team Appraisals", category: "Appraisals", subGroup: "Performance Reviews", description: "Score and submit appraisal reviews for direct reports", icon: "fa-solid fa-clipboard-list" },
  { key: "manageAppraisalCycles", name: "Manage Appraisal Cycles", category: "Appraisals", subGroup: "Cycle Administration", description: "Create and manage performance review cycle periods", icon: "fa-solid fa-rotate" },

  // Goals & OKRs
  { key: "viewGoals", name: "View Goals & OKRs", category: "Goals & OKRs", subGroup: "Strategic OKR Goals", description: "Browse workspace and team OKR goal tracking boards", icon: "fa-solid fa-bullseye" },
  { key: "createGoals", name: "Create Goals & Key Results", category: "Goals & OKRs", subGroup: "Strategic OKR Goals", description: "Set new strategic goals and define key result metrics", icon: "fa-solid fa-circle-plus" },
  { key: "editGoals", name: "Edit & Update Goals", category: "Goals & OKRs", subGroup: "Strategic OKR Goals", description: "Update goal progress, ownership, and target values", icon: "fa-solid fa-pen" },
  { key: "deleteGoals", name: "Delete Goals", category: "Goals & OKRs", subGroup: "Strategic OKR Goals", description: "Remove goals and OKRs from the workspace", icon: "fa-solid fa-trash" },
  { key: "sendKudos", name: "Send Kudos to Colleagues", category: "Goals & OKRs", subGroup: "Team Recognition & Kudos", description: "Send public recognition and kudos to team members", icon: "fa-solid fa-hands-clapping" },
  { key: "manageSurveys", name: "Create & Manage Surveys", category: "Goals & OKRs", subGroup: "Team Pulse Surveys", description: "Build and distribute team pulse surveys and feedback forms", icon: "fa-solid fa-clipboard-question" },
  { key: "viewSurveyResults", name: "View Survey Results", category: "Goals & OKRs", subGroup: "Team Pulse Surveys", description: "Access team sentiment survey submission analytics", icon: "fa-solid fa-chart-bar" },
  { key: "submitSurveyResponses", name: "Submit Team Pulse Surveys", category: "Goals & OKRs", subGroup: "Team Pulse Surveys", description: "Fill out and submit anonymous team pulse feedback", icon: "fa-solid fa-square-check" },

  // Analytics
  { key: "viewAnalyticsDashboard", name: "View Analytics Dashboard", category: "Analytics", subGroup: "Productivity Analytics", description: "Access workspace performance and productivity metrics", icon: "fa-solid fa-chart-line" },
  { key: "exportReports", name: "Export Reports & Data", category: "Analytics", subGroup: "Productivity Analytics", description: "Download workspace CSV, PDF, and analytics report files", icon: "fa-solid fa-file-export" },
  { key: "viewAuditLogs", name: "View Audit Activity Logs", category: "Analytics", subGroup: "Audit & Security Logs", description: "See detailed user action and login audit trail logs", icon: "fa-solid fa-scroll" },
  { key: "viewSecurityEvents", name: "View Security Events", category: "Analytics", subGroup: "Audit & Security Logs", description: "Access login failure, suspicious activity, and security logs", icon: "fa-solid fa-shield-halved" },

  // CRM & Clients
  { key: "viewClients", name: "View CRM Client Accounts", category: "CRM & Clients", subGroup: "Client Account Management", description: "Browse client account profiles and retainer details", icon: "fa-solid fa-handshake" },
  { key: "createClients", name: "Create Client Accounts", category: "CRM & Clients", subGroup: "Client Account Management", description: "Add new CRM client accounts and engagement records", icon: "fa-solid fa-user-plus" },
  { key: "editClients", name: "Edit Client Details", category: "CRM & Clients", subGroup: "Client Account Management", description: "Modify client profiles, contract info, and deal stages", icon: "fa-solid fa-user-pen" },
  { key: "deleteClients", name: "Delete Client Accounts", category: "CRM & Clients", subGroup: "Client Account Management", description: "Permanently remove client records from the CRM", icon: "fa-solid fa-user-minus" },
  { key: "exportClientData", name: "Export Client Retainer Reports", category: "CRM & Clients", subGroup: "Client Account Management", description: "Download CRM accounts and retainer invoices as CSV", icon: "fa-solid fa-file-csv" },
  { key: "manageClientContacts", name: "Manage Client Key Contacts", category: "CRM & Clients", subGroup: "Client Account Management", description: "Add and update primary stakeholder contact info", icon: "fa-solid fa-address-card" },
  { key: "viewDeals", name: "View CRM Deals & Pipeline", category: "CRM & Clients", subGroup: "Sales Pipeline & Deals", description: "Access the sales pipeline and deal stage tracking", icon: "fa-solid fa-money-bill-trend-up" },
  { key: "manageDeals", name: "Create & Manage Deals", category: "CRM & Clients", subGroup: "Sales Pipeline & Deals", description: "Add deals, update stages, and attach files to opportunities", icon: "fa-solid fa-suitcase-rolling" },

  // Referrals
  { key: "submitReferral", name: "Submit Candidate Referrals", category: "Referrals", subGroup: "Referral Pipeline", description: "Nominate external candidates through the referral program", icon: "fa-solid fa-paper-plane" },
  { key: "viewOwnReferrals", name: "Track Own Referral Status", category: "Referrals", subGroup: "Referral Pipeline", description: "See the status and bonus payout of own referrals", icon: "fa-solid fa-list-check" },
  { key: "viewAllReferrals", name: "View All Referrals Pipeline", category: "Referrals", subGroup: "Referral Pipeline", description: "See referral submissions across the entire organization", icon: "fa-solid fa-sitemap" },
  { key: "manageReferrals", name: "Manage & Update Referrals", category: "Referrals", subGroup: "Referral Pipeline", description: "Update referral status, approve bonuses, and set payout", icon: "fa-solid fa-pen-to-square" },

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

const FEATURE_CATEGORIES: FeatureCategory[] = [
  "Overview", "Team", "Calendar & Time", "Projects", "Sprints", "Drive",
  "Chat", "HR & Leave", "Appraisals", "Goals & OKRs", "Analytics",
  "CRM & Clients", "Referrals", "Admin & Users", "Settings",
];

const CATEGORY_COLORS: Record<FeatureCategory, { text: string; bg: string; border: string; badge: string }> = {
  "Overview":        { text: "text-sky-500",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  "Team":            { text: "text-violet-500",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  "Calendar & Time": { text: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "Projects":        { text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  "Sprints":         { text: "text-orange-500",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  "Drive":           { text: "text-teal-500",    bg: "bg-teal-500/10",    border: "border-teal-500/30",    badge: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
  "Chat":            { text: "text-green-500",   bg: "bg-green-500/10",   border: "border-green-500/30",   badge: "bg-green-500/15 text-green-600 dark:text-green-400" },
  "HR & Leave":      { text: "text-pink-500",    bg: "bg-pink-500/10",    border: "border-pink-500/30",    badge: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  "Appraisals":      { text: "text-rose-500",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  "Goals & OKRs":    { text: "text-indigo-500",  bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  "Analytics":       { text: "text-cyan-500",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    badge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  "CRM & Clients":   { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  "Referrals":       { text: "text-lime-500",    bg: "bg-lime-500/10",    border: "border-lime-500/30",    badge: "bg-lime-500/15 text-lime-600 dark:text-lime-400" },
  "Admin & Users":   { text: "text-red-500",     bg: "bg-red-500/10",     border: "border-red-500/30",     badge: "bg-red-500/15 text-red-600 dark:text-red-400" },
  "Settings":        { text: "text-slate-500",   bg: "bg-slate-500/10",   border: "border-slate-500/30",   badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
};

const CATEGORY_ICONS: Record<FeatureCategory, string> = {
  "Overview":        "fa-solid fa-chart-simple",
  "Team":            "fa-solid fa-users",
  "Calendar & Time": "fa-solid fa-calendar-days",
  "Projects":        "fa-solid fa-folder-tree",
  "Sprints":         "fa-solid fa-person-running",
  "Drive":           "fa-solid fa-hard-drive",
  "Chat":            "fa-solid fa-comments",
  "HR & Leave":      "fa-solid fa-briefcase",
  "Appraisals":      "fa-solid fa-star",
  "Goals & OKRs":    "fa-solid fa-bullseye",
  "Analytics":       "fa-solid fa-chart-line",
  "CRM & Clients":   "fa-solid fa-handshake",
  "Referrals":       "fa-solid fa-link",
  "Admin & Users":   "fa-solid fa-user-gear",
  "Settings":        "fa-solid fa-gear",
};

const DEFAULT_BUILTIN_ROLES = ["OPS", "Manager", "HR", "Employee"];

interface RoleDataControlTabProps {
  isAdmin: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function RoleDataControlTab({ isAdmin, showToast }: RoleDataControlTabProps) {
  const [selectedRole, setSelectedRole] = useState<string>("OPS");
  const [activeSubTab, setActiveSubTab] = useState<"modules" | "features">("modules");
  const [permissionsMap, setPermissionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [featurePermissionsMap, setFeaturePermissionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PERMITTED" | "DENIED">("ALL");

  // Create custom role modal states
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [cloneFromRole, setCloneFromRole] = useState("Employee");

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/permissions");
      if (res.ok) {
        const data = await res.json();
        setPermissionsMap(data.permissions || {});
        setFeaturePermissionsMap(data.featurePermissions || {});
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

  const handleToggleModule = (moduleKey: string) => {
    if (!isAdmin) return;
    setPermissionsMap((prev) => {
      const currentRolePerms = prev[selectedRole] || {};
      const currentValue = currentRolePerms[moduleKey] ?? true;
      return { ...prev, [selectedRole]: { ...currentRolePerms, [moduleKey]: !currentValue } };
    });
  };

  const handleToggleFeature = (featureKey: string) => {
    if (!isAdmin) return;
    setFeaturePermissionsMap((prev) => {
      const currentRoleFeatures = prev[selectedRole] || {};
      const currentValue = currentRoleFeatures[featureKey] ?? false;
      return { ...prev, [selectedRole]: { ...currentRoleFeatures, [featureKey]: !currentValue } };
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

  const handleSetAllModules = (value: boolean) => {
    if (!isAdmin) return;
    setPermissionsMap((prev) => {
      const updates: Record<string, boolean> = {};
      MODULES.forEach((m) => { updates[m.key] = value; });
      return { ...prev, [selectedRole]: { ...(prev[selectedRole] || {}), ...updates } };
    });
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
    } catch (e) {
      showToast("Error updating role permissions", "error");
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
    } catch (e) {
      showToast("Error creating custom role", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomRole = async (roleName: string) => {
    if (!confirm(`Are you sure you want to delete the custom role '${roleName}'?`)) {
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch(`/api/settings/permissions?role=${encodeURIComponent(roleName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Custom role '${roleName}' deleted`, "success");
        setSelectedRole("OPS");
        await fetchPermissions();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete role", "error");
      }
    } catch (e) {
      showToast("Error deleting custom role", "error");
    } finally {
      setDeleting(false);
    }
  };

  const activeRolePerms = permissionsMap[selectedRole] || {};
  const activeRoleFeaturePerms = featurePermissionsMap[selectedRole] || {};

  const filteredFeatures = FEATURE_ACTIONS.filter(
    (f) =>
      !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleCategories = FEATURE_CATEGORIES.filter((cat) =>
    filteredFeatures.some((f) => f.category === cat)
  );

  const defaultRoleConfig: Record<string, { label: string; color: string; activeBg: string; activeBorder: string; icon: string; isBuiltIn: boolean }> = {
    OPS:      { label: "OPS (SubAdmin)", color: "text-emerald-500", activeBg: "bg-emerald-500/10", activeBorder: "border-emerald-500/30", icon: "fa-solid fa-user-ninja", isBuiltIn: true },
    Manager:  { label: "Manager",        color: "text-purple-500",  activeBg: "bg-purple-500/10",  activeBorder: "border-purple-500/30",  icon: "fa-solid fa-user-gear", isBuiltIn: true },
    HR:       { label: "HR Specialist",  color: "text-pink-500",    activeBg: "bg-pink-500/10",    activeBorder: "border-pink-500/30",    icon: "fa-solid fa-user-group", isBuiltIn: true },
    Employee: { label: "Employee",       color: "text-blue-500",    activeBg: "bg-blue-500/10",    activeBorder: "border-blue-500/30",    icon: "fa-solid fa-user", isBuiltIn: true },
  };

  const customColorStyles = [
    { color: "text-amber-500",   activeBg: "bg-amber-500/10",   activeBorder: "border-amber-500/30",   icon: "fa-solid fa-user-astronaut" },
    { color: "text-indigo-500",  activeBg: "bg-indigo-500/10",  activeBorder: "border-indigo-500/30",  icon: "fa-solid fa-user-tag" },
    { color: "text-teal-500",    activeBg: "bg-teal-500/10",    activeBorder: "border-teal-500/30",    icon: "fa-solid fa-headset" },
    { color: "text-rose-500",    activeBg: "bg-rose-500/10",    activeBorder: "border-rose-500/30",    icon: "fa-solid fa-user-check" },
    { color: "text-cyan-500",    activeBg: "bg-cyan-500/10",    activeBorder: "border-cyan-500/30",    icon: "fa-solid fa-laptop-code" },
  ];

  const roleConfig: Record<string, { label: string; color: string; activeBg: string; activeBorder: string; icon: string; isBuiltIn: boolean }> = {
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
      };
    }
  });

  const totalFeatures = FEATURE_ACTIONS.length;
  const enabledFeatures = FEATURE_ACTIONS.filter((f) => activeRoleFeaturePerms[f.key] ?? false).length;
  const totalModules = MODULES.length;
  const enabledModules = MODULES.filter((m) => activeRolePerms[m.key] ?? true).length;

  const currentRoleCfg = roleConfig[selectedRole] || {
    label: selectedRole,
    color: "text-primary",
    activeBg: "bg-primary/10",
    activeBorder: "border-primary/30",
    icon: "fa-solid fa-user-tag",
    isBuiltIn: false,
  };

  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    FEATURE_CATEGORIES.forEach((cat) => {
      next[cat] = expand;
    });
    setExpandedCategories(next);
  };

  return (
    <div className="space-y-5">
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-sliders text-sky-500 text-lg" /> Granular Role &amp; Feature Permission Control
              </CardTitle>
              <CardDescription className="mt-1">
                Precisely control what each role can see and do â€” from individual UI modules to specific CRUD action capabilities.
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                {!currentRoleCfg.isBuiltIn && (
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteCustomRole(selectedRole)}
                    disabled={deleting || saving}
                    className="gap-1.5 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10 cursor-pointer"
                  >
                    <i className="fa-solid fa-trash-can text-xs" /> Delete Role
                  </Button>
                )}
                <Button
                  color="primary"
                  onClick={handleSavePermissions}
                  disabled={saving || loading}
                  className="gap-2 font-semibold shrink-0 cursor-pointer text-xs"
                >
                  <i className="fa-solid fa-floppy-disk text-xs" />
                  {saving ? "Saving Policy..." : `Save ${currentRoleCfg.label} Policy`}
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <i className="fa-solid fa-layer-group text-xs" />
              <span><strong className="text-foreground">{enabledModules}</strong>/{totalModules} modules accessible</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <i className="fa-solid fa-key text-xs" />
              <span><strong className="text-foreground">{enabledFeatures}</strong>/{totalFeatures} feature actions permitted</span>
            </div>
            {!isAdmin && (
              <>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <i className="fa-solid fa-lock text-xs" /> Read-only view
                </div>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Role Selector + Sub-tab Switch */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/60 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {Object.keys(roleConfig).map((role) => {
                const cfg = roleConfig[role];
                const isSelected = selectedRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border",
                      isSelected
                        ? `${cfg.activeBg} ${cfg.color} ${cfg.activeBorder} shadow-xs`
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    )}
                  >
                    <i className={cn(cfg.icon, isSelected ? cfg.color : "")} />
                    {cfg.label}
                    {role === "OPS" && (
                      <Badge variant="soft" color="success" className="text-[9px] px-1.5 py-0 uppercase">SubAdmin</Badge>
                    )}
                    {!cfg.isBuiltIn && (
                      <span className="text-[9px] px-1.5 py-0 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20 font-semibold">Custom</span>
                    )}
                  </button>
                );
              })}

              {isAdmin && (
                <button
                  onClick={() => setShowAddRoleModal(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                >
                  <i className="fa-solid fa-plus text-xs" /> Add Custom Role
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 text-xs">
              <button
                onClick={() => setActiveSubTab("modules")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeSubTab === "modules" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-layer-group text-xs" /> Module Access
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeSubTab === "modules" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                  {enabledModules}/{totalModules}
                </span>
              </button>
              <button
                onClick={() => setActiveSubTab("features")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                  activeSubTab === "features" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-key text-xs" /> Feature Actions
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold", activeSubTab === "features" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                  {enabledFeatures}/{totalFeatures}
                </span>
              </button>
            </div>
          </div>

          {!isAdmin && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <i className="fa-solid fa-lock text-sm" />
              <span>You are viewing the workspace RBAC access policy in read-only mode. Only System Admins can modify role data controls.</span>
            </div>
          )}

          {/* MODULE ACCESS TAB */}
          {activeSubTab === "modules" && (
            <div className="space-y-3">
              {isAdmin && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Toggle module-level page access for <strong className={roleConfig[selectedRole].color}>{roleConfig[selectedRole].label}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSetAllModules(true)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer font-semibold"
                    >
                      <i className="fa-solid fa-check-double mr-1" />Enable All
                    </button>
                    <button
                      onClick={() => handleSetAllModules(false)}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border hover:bg-accent/40 transition-colors cursor-pointer font-semibold"
                    >
                      <i className="fa-solid fa-xmark mr-1" />Disable All
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MODULES.map((mod) => {
                  const isAllowed = activeRolePerms[mod.key] ?? true;
                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggleModule(mod.key)}
                      className={cn(
                        "p-4 rounded-xl border transition-all flex items-start justify-between gap-3",
                        isAdmin ? "cursor-pointer" : "cursor-default",
                        isAllowed
                          ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                          : "border-border bg-card/60 hover:bg-accent/30 opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={cn("w-10 h-10 flex items-center justify-center rounded-lg shrink-0", isAllowed ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
                          <i className={cn(mod.icon, "text-base")} />
                        </div>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="font-bold text-xs text-foreground flex items-center gap-2 flex-wrap">
                            {mod.name}
                            {isAllowed ? (
                              <Badge variant="soft" color="success" className="text-[9px] px-1.5 py-0">Visible</Badge>
                            ) : (
                              <Badge variant="soft" color="destructive" className="text-[9px] px-1.5 py-0">Hidden</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed truncate sm:whitespace-normal">{mod.description}</p>
                        </div>
                      </div>
                      <div className="shrink-0 pt-1">
                        <div className={cn("w-9 h-5 flex items-center rounded-full p-1 transition-colors dark:ring-1 dark:ring-white/10", isAllowed ? "bg-emerald-500 justify-end" : "bg-muted justify-start border border-border/60")}>
                          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FEATURE ACTIONS TAB */}
          {activeSubTab === "features" && (
            <div className="space-y-4">
              {/* Category Quick Navigation Scroll Bar */}
              <div className="space-y-2 bg-muted/30 p-3 rounded-xl border border-border/60">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1">
                  <span className="flex items-center gap-1.5 text-foreground font-bold">
                    <i className="fa-solid fa-compass text-primary text-xs" /> Filter & Quick Jump by Module:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExpandAll(true)}
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:underline font-semibold cursor-pointer"
                    >
                      <i className="fa-solid fa-angles-down mr-1" /> Expand All
                    </button>
                    <span className="text-border">•</span>
                    <button
                      type="button"
                      onClick={() => handleExpandAll(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground hover:underline font-semibold cursor-pointer"
                    >
                      <i className="fa-solid fa-angles-up mr-1" /> Collapse All
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter("ALL")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border shrink-0",
                      selectedCategoryFilter === "ALL"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <i className="fa-solid fa-layer-group text-xs" /> All Modules ({FEATURE_ACTIONS.length})
                  </button>

                  {FEATURE_CATEGORIES.map((cat) => {
                    const catCount = FEATURE_ACTIONS.filter((f) => f.category === cat).length;
                    const catPermitted = FEATURE_ACTIONS.filter((f) => f.category === cat && (activeRoleFeaturePerms[f.key] ?? false)).length;
                    const colors = CATEGORY_COLORS[cat];
                    const isSelected = selectedCategoryFilter === cat;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border shrink-0",
                          isSelected
                            ? `${colors.bg} ${colors.text} ${colors.border} shadow-xs font-extrabold ring-1 ring-primary/20`
                            : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <i className={cn(CATEGORY_ICONS[cat], "text-xs", isSelected ? colors.text : "text-muted-foreground")} />
                        {cat}
                        <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-extrabold", isSelected ? colors.badge : "bg-muted text-muted-foreground")}>
                          {catPermitted}/{catCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar + Status Filter Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search feature actions (e.g. WhatsApp, Gantt, Leave, Salary, Shift)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-xs"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                      statusFilter === "ALL" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All Statuses
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("PERMITTED")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1",
                      statusFilter === "PERMITTED" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-circle-check text-[10px] text-emerald-500" /> Permitted
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("DENIED")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1",
                      statusFilter === "DENIED" ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-circle-xmark text-[10px] text-rose-500" /> Denied
                  </button>
                </div>
              </div>

              {(searchQuery || selectedCategoryFilter !== "ALL" || statusFilter !== "ALL") && (
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-border/40">
                  <span>
                    Showing <strong>{filteredFeatures.length}</strong> feature action{filteredFeatures.length !== 1 ? "s" : ""}
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
                    className="text-primary hover:underline font-semibold cursor-pointer text-[11px]"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {visibleCategories.map((category) => {
                  const catFeatures = filteredFeatures.filter((f) => f.category === category);
                  const colors = CATEGORY_COLORS[category];
                  const catIcon = CATEGORY_ICONS[category];
                  const isExpanded = expandedCategories[category] ?? true;
                  const enabledInCat = catFeatures.filter((f) => activeRoleFeaturePerms[f.key] ?? false).length;
                  const allEnabled = catFeatures.every((f) => activeRoleFeaturePerms[f.key] ?? false);
                  const noneEnabled = catFeatures.every((f) => !(activeRoleFeaturePerms[f.key] ?? false));

                  return (
                    <div key={category} className={cn("rounded-xl border overflow-hidden", colors.border)}>
                      <div className={cn("px-4 py-3 flex items-center justify-between gap-3", colors.bg)}>
                        <button
                          onClick={() => setExpandedCategories((prev) => ({ ...prev, [category]: !isExpanded }))}
                          className="flex items-center gap-2.5 flex-1 text-left cursor-pointer min-w-0"
                        >
                          <div className={cn("w-8 h-8 flex items-center justify-center rounded-lg shrink-0 border", colors.bg, colors.border)}>
                            <i className={cn(catIcon, "text-xs", colors.text)} />
                          </div>
                          <div className="min-w-0">
                            <div className={cn("text-xs font-bold", colors.text)}>{category}</div>
                            <div className="text-[10px] text-muted-foreground">{catFeatures.length} feature{catFeatures.length !== 1 ? "s" : ""}</div>
                          </div>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0", colors.badge)}>
                            {enabledInCat}/{catFeatures.length}
                          </span>
                          <i className={cn("fa-solid text-xs text-muted-foreground ml-auto shrink-0 transition-transform", isExpanded ? "fa-chevron-up" : "fa-chevron-down")} />
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleSetAllInCategory(category, true)}
                              disabled={allEnabled}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-md border font-semibold transition-colors cursor-pointer",
                                allEnabled
                                  ? "bg-muted/50 text-muted-foreground border-border opacity-50 cursor-not-allowed"
                                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                              )}
                            >
                              <i className="fa-solid fa-check-double mr-1" />All
                            </button>
                            <button
                              onClick={() => handleSetAllInCategory(category, false)}
                              disabled={noneEnabled}
                              className={cn(
                                "text-[10px] px-2 py-1 rounded-md border font-semibold transition-colors cursor-pointer",
                                noneEnabled
                                  ? "bg-muted/50 text-muted-foreground border-border opacity-50 cursor-not-allowed"
                                  : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                              )}
                            >
                              <i className="fa-solid fa-ban mr-1" />None
                            </button>
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border/40 divide-y divide-border/40">
                          {(() => {
                            // Extract unique sub-groups in this category
                            const subGroups = Array.from(new Set(catFeatures.map((f) => f.subGroup || "General Features")));

                            return subGroups.map((subGroupName) => {
                              const subGroupFeats = catFeatures.filter((f) => (f.subGroup || "General Features") === subGroupName);
                              const subGroupPermitted = subGroupFeats.filter((f) => activeRoleFeaturePerms[f.key] ?? false).length;

                              return (
                                <div key={subGroupName} className="space-y-0">
                                  {/* Sub-Group Section Header */}
                                  <div className="px-4 py-2 bg-muted/40 dark:bg-slate-900/40 border-b border-border/40 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                      <i className="fa-solid fa-folder-tree text-[10px] text-primary" />
                                      <span>{subGroupName}</span>
                                    </div>
                                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold", colors.badge)}>
                                      {subGroupPermitted}/{subGroupFeats.length} Enabled
                                    </span>
                                  </div>

                                  {/* Features Grid inside Sub-Group */}
                                  <div className="grid grid-cols-1 md:grid-cols-2">
                                    {subGroupFeats.map((feat, idx) => {
                                      const isAllowed = activeRoleFeaturePerms[feat.key] ?? false;
                                      const isLeftCol = idx % 2 === 0;

                                      return (
                                        <div
                                          key={feat.key}
                                          onClick={() => handleToggleFeature(feat.key)}
                                          className={cn(
                                            "p-3 flex items-center justify-between gap-3 transition-all border-b border-border/30 last:border-b-0",
                                            isLeftCol ? "md:border-r md:border-border/30" : "",
                                            isAdmin ? "cursor-pointer" : "cursor-default",
                                            isAllowed ? "bg-card hover:bg-accent/20" : "bg-muted/20 hover:bg-accent/10 opacity-65"
                                          )}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className={cn("w-8 h-8 flex items-center justify-center rounded-lg shrink-0", isAllowed ? `${colors.bg} ${colors.text}` : "bg-muted text-muted-foreground")}>
                                              <i className={cn(feat.icon, "text-xs")} />
                                            </div>
                                            <div className="space-y-0.5 min-w-0">
                                              <div className="font-semibold text-[11px] text-foreground flex items-center gap-1.5 flex-wrap">
                                                {feat.name}
                                                {isAllowed ? (
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">Permitted</span>
                                                ) : (
                                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 font-bold shrink-0">Denied</span>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-muted-foreground leading-relaxed">{feat.description}</p>
                                            </div>
                                          </div>
                                          <div className="shrink-0">
                                            <div className={cn("w-8 h-[18px] rounded-full relative transition-colors dark:ring-1 dark:ring-white/10", isAllowed ? "bg-emerald-500" : "bg-muted border border-border/60")}>
                                              <div className={cn("absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200", isAllowed ? "left-[18px]" : "left-0.5")} />
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
          )}
        </CardContent>
      </Card>

      {/* CREATE CUSTOM ROLE MODAL */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <i className="fa-solid fa-user-plus text-primary text-sm" /> Create Custom Role
              </h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. QA Specialist, Support Lead, Sales..."
                  value={newRoleName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoleName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Clone Base Permissions From</label>
                <select
                  value={cloneFromRole}
                  onChange={(e) => setCloneFromRole(e.target.value)}
                  className="w-full h-9 text-xs bg-background border border-border rounded-md px-3 text-foreground outline-none cursor-pointer"
                >
                  <option value="Employee">Employee (Basic permissions)</option>
                  <option value="Manager">Manager (Team leadership permissions)</option>
                  <option value="HR">HR Specialist (HR &amp; Leave permissions)</option>
                  <option value="OPS">OPS SubAdmin (Broad workspace access)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddRoleModal(false)}
                className="text-xs"
              >
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
    </div>
  );
}
