"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { isSubAdminRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  icon: string;
  highlights: string[];
}

const adminTourSteps: TourStep[] = [
  {
    id: "overview_admin",
    title: "1. Dashboard Overview",
    subtitle: "Enterprise Command Center & Live Operations",
    description:
      "Monitor real-time company revenue analytics, pending approval counters, shift attendance trackers, and pinned workspace announcements.",
    route: "/dashboard",
    icon: "fa-solid fa-gauge-high text-emerald-400",
    highlights: [
      "Revenue trends with weekly/monthly toggles",
      "Live check-in & shift attendance tracking",
      "Interactive KPI summary cards with direct shortcuts",
    ],
  },
  {
    id: "team_admin",
    title: "2. My Team & Organization",
    subtitle: "Directory, Visual Org Hierarchy & Departments",
    description:
      "Manage staff profiles, drag-and-drop visual reporting hierarchy trees, 1-click new employee onboarding, and department roster assignments.",
    route: "/dashboard/team",
    icon: "fa-solid fa-users text-cyan-400",
    highlights: [
      "Interactive drag-and-drop org hierarchy chart",
      "Single & bulk employee onboarding with temporary credentials",
      "Department head designations & skill tag searching",
    ],
  },
  {
    id: "calendar_admin",
    title: "3. Calendar, Timesheets & Sprints",
    subtitle: "Event Scheduling, Agile Iterations & Hours Approval",
    description:
      "Schedule workspace events across departments, track agile sprint iterations, and approve employee weekly billable timesheets with 12-hour AM/PM timestamps.",
    route: "/dashboard/calendar",
    icon: "fa-solid fa-calendar-days text-emerald-400",
    highlights: [
      "Multi-department shared calendar event scheduling",
      "Weekly billable timesheet review & manager approval",
      "Full attendance logs export (CSV)",
    ],
  },
  {
    id: "projects_admin",
    title: "4. Projects, Tasks, Wiki & Drive",
    subtitle: "Kanban Delivery, Gantt Timeline & Cloud Storage",
    description:
      "Manage client deliverables on drag-and-drop Kanban boards, coordinate sprint milestones, author SOPs in Markdown Wiki, and organize assets in Drive.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-amber-400",
    highlights: [
      "Visual Kanban boards with subtasks & team comments",
      "Gantt project timelines & employee workload heatmaps",
      "Cloud Drive file repository & collaborative Wiki docs",
    ],
  },
  {
    id: "chat_admin",
    title: "5. Chat, Channels & Mail",
    subtitle: "Real-time Messaging, Channels & Mail Center",
    description:
      "Real-time team chat with public channels, private 1-on-1 Direct Messages with read receipts, integrated client Mail Center, and WhatsApp Business updates.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-pink-400",
    highlights: [
      "Real-time channels & 1:1 DMs with image attachments",
      "Integrated client Mail center & WhatsApp API broadcasts",
      "WebRTC video meeting rooms for standups",
    ],
  },
  {
    id: "notifications_admin",
    title: "6. Notification Center",
    subtitle: "Real-time Alerts, Mentions & Global Broadcasts",
    description:
      "Review all workspace updates, task assignments, leave alerts, and broadcast urgent company-wide announcements instantly to all active members.",
    route: "/dashboard/notifications",
    icon: "fa-solid fa-bell text-rose-400",
    highlights: [
      "Real-time activity feed with category filters",
      "Broadcast instant popup announcements to all staff",
      "One-click 'Mark all as read' and direct navigation links",
    ],
  },
  {
    id: "clients_admin",
    title: "7. OPS Portal & Retainers",
    subtitle: "Client Delivery Accounts & Resource Bench",
    description:
      "Manage client delivery accounts, active monthly retainer budgets, staff bench allocations, and external contractor resources.",
    route: "/dashboard/clients",
    icon: "fa-solid fa-list-check text-teal-400",
    highlights: [
      "Client retainer tracking with burn-rate visibility",
      "Staff deployment utilization & contractor management",
      "Bulk Data Importer for clients, accounts, and teams",
    ],
  },
  {
    id: "sales_admin",
    title: "8. Sales Workdesk & Deals",
    subtitle: "Deal Pipeline, Forecasts & Win/Loss Tracking",
    description:
      "Track multi-stage sales deals, win probabilities, expected close timelines, and sales representative quota attainment in real time.",
    route: "/dashboard/sales",
    icon: "fa-solid fa-handshake text-indigo-400",
    highlights: [
      "Interactive sales deal pipeline stages (Prospecting to Won)",
      "Weighted revenue forecast & deal value analytics",
      "Account executive deal ownership & historical notes",
    ],
  },
  {
    id: "bd_admin",
    title: "9. BD Portal & Proposals",
    subtitle: "Lead Lifecycle, Proposals & Executive Dashboard",
    description:
      "Capture inbound business development leads, manage sales qualification stages, generate professional client proposals, and review proposal previews.",
    route: "/dashboard/bd",
    icon: "fa-solid fa-briefcase text-blue-400",
    highlights: [
      "Complete lead tracking from Inquiry to Qualified Proposal",
      "Automated proposal generator with PDF preview",
      "Multi-currency deal values (USD, INR, EUR, GBP)",
    ],
  },
  {
    id: "finance_admin",
    title: "10. Finance Portal & Invoicing",
    subtitle: "Invoices, PDF Generator & Expense Tracking",
    description:
      "Generate itemized client billing invoices, download PDF invoices, record operational expenses by department, and track payment receipts.",
    route: "/dashboard/finance",
    icon: "fa-solid fa-coins text-yellow-400",
    highlights: [
      "Itemized client invoice creation with PDF export",
      "Departmental operational expense logging & approvals",
      "Real-time accounts receivable cash-flow summaries",
    ],
  },
  {
    id: "referrals_admin",
    title: "11. Candidate Referral Pipeline",
    subtitle: "Talent Sourcing, Pipeline & Bounty Approvals",
    description:
      "Review employee candidate referrals, track recruitment pipeline stages, and approve referral cash bonus disbursements upon successful hiring.",
    route: "/dashboard/referrals",
    icon: "fa-solid fa-link text-sky-400",
    highlights: [
      "Recruitment pipeline tracking from Submitted to Hired",
      "Referral bounty reward disbursements review",
      "One-click candidate submission form for staff",
    ],
  },
  {
    id: "goals_admin",
    title: "12. Goals, OKRs & Culture",
    subtitle: "Strategic Objectives, Kudos Wall & Check-ins",
    description:
      "Define company OKRs, track measurable Key Results progress, celebrate peer contributions on the social Kudos wall, and run structured 1:1 check-in meetings.",
    route: "/dashboard/goals",
    icon: "fa-solid fa-bullseye text-violet-400",
    highlights: [
      "Quarterly OKR target tracking & numeric sliders",
      "Social peer Kudos recognition wall with reactions",
      "Structured 1:1 check-in meetings with rollover tasks",
    ],
  },
  {
    id: "hr_portal_admin",
    title: "13. HR Portal & Leave Approvals",
    subtitle: "Staff Directory, Leave Queue & Document Vault",
    description:
      "Manage employee records, onboarding checklists, approve leave requests with 12-hour AM/PM audit timestamps, and secure confidential contracts in Vault.",
    route: "/dashboard/hr",
    icon: "fa-solid fa-user-tie text-purple-400",
    highlights: [
      "Approve/Reject leaves with 12-hour AM/PM timestamps",
      "Confidential Document Vault with role-gated access",
      "Performance appraisal review cycles & probation alerts",
    ],
  },
  {
    id: "it_portal_admin",
    title: "14. IT Portal, Assets & Licenses",
    subtitle: "Tool Provisioning, Hardware & SaaS Renewals",
    description:
      "Provision software licenses with 1-click status toggles, track company hardware device tags, and monitor upcoming SaaS renewals.",
    route: "/dashboard/it",
    icon: "fa-solid fa-terminal text-rose-400",
    highlights: [
      "Software access matrix with 1-click Suspend/Revoke",
      "Hardware asset tag tracking & warranty tracking",
      "SaaS renewal alerts & subscription cost control",
    ],
  },
  {
    id: "analytics_admin",
    title: "15. Analytics & Security Audit Trail",
    subtitle: "Workforce Ratios & Enterprise Audit Logs",
    description:
      "Evaluate project billable ratios, department productivity metrics, and conduct security audits across all workspace CREATE, UPDATE, and DELETE activities.",
    route: "/dashboard/analytics",
    icon: "fa-solid fa-chart-line text-emerald-400",
    highlights: [
      "Billable vs. non-billable workforce effort metrics",
      "Manager compliance & department attendance charts",
      "Searchable system-wide security audit trail",
    ],
  },
  {
    id: "settings_admin",
    title: "16. Settings, RBAC & Security Control",
    subtitle: "Granular RBAC, Org Details & Policy Rules",
    description:
      "Manage organization details, configure granular role-based permissions per module, define custom roles, and configure security policies.",
    route: "/dashboard/settings",
    icon: "fa-solid fa-gear text-slate-400",
    highlights: [
      "Granular Role & Module Permission matrix (70+ capabilities)",
      "Company branding & organization profile details",
      "Work shift configuration & self-service invoice generator",
    ],
  },
];

const subadminTourSteps: TourStep[] = [
  {
    id: "overview_ops",
    title: "1. Operations Command Center",
    subtitle: "Live Shift Tracking, Attendance & KPIs",
    description:
      "As SubAdmin / OPS Lead, oversee daily shifts, monitor live attendance timers, review pending operational queues, and read executive announcements.",
    route: "/dashboard",
    icon: "fa-solid fa-gauge-high text-emerald-400",
    highlights: [
      "Live team shift status & clock-in tracking",
      "Operational KPI widgets (Revenue, Headcount, Leave)",
      "Instant action shortcuts for pending approvals",
    ],
  },
  {
    id: "team_ops",
    title: "2. Team Roster & Structure",
    subtitle: "Directory, Hierarchy Tree & Shift Allocations",
    description:
      "Inspect employee profiles, review the organization hierarchy tree, onboard staff, and assign shifts across departments.",
    route: "/dashboard/team",
    icon: "fa-solid fa-users text-cyan-400",
    highlights: [
      "Visual org tree hierarchy & reporting managers",
      "Onboard single or bulk staff with credentials",
      "Department rosters & skill capability matching",
    ],
  },
  {
    id: "calendar_ops",
    title: "3. Shift Calendar & Timesheets",
    subtitle: "Shift Schedules, Agile Sprints & Hours Approval",
    description:
      "Coordinate company schedules, plan agile sprints, monitor clock-in/out records, and approve submitted billable timesheets.",
    route: "/dashboard/calendar",
    icon: "fa-solid fa-calendar-days text-emerald-400",
    highlights: [
      "Schedule team events & department deadlines",
      "Weekly timesheet approvals with 12-hour AM/PM stamps",
      "Export timesheet reports for payroll verification",
    ],
  },
  {
    id: "projects_ops",
    title: "4. Projects, Kanban & Drive",
    subtitle: "Sprint Execution, Milestone Delivery & Files",
    description:
      "Oversee project task boards, balance team workloads with heatmaps, maintain standard operating procedures in Wiki, and manage Drive assets.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-amber-400",
    highlights: [
      "Manage project Kanban boards & task statuses",
      "Workload capacity & Gantt schedule planning",
      "Secure Drive storage & department Wiki documentation",
    ],
  },
  {
    id: "chat_ops",
    title: "5. Chat & Operational Mail",
    subtitle: "Real-time Channels, DMs & Client Mail",
    description:
      "Coordinate rapid operational communication in channels and direct messages, share screenshots, and access the integrated Mail Center.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-pink-400",
    highlights: [
      "Direct messaging with read receipts & image uploads",
      "Public & private operational coordination channels",
      "Integrated Mail center & WhatsApp API broadcasts",
    ],
  },
  {
    id: "notifications_ops",
    title: "6. Notification Center",
    subtitle: "Real-time Feeds & Team Broadcasts",
    description:
      "Stay alerted on milestone completions, shift irregularities, and dispatch real-time broadcast banners across the team.",
    route: "/dashboard/notifications",
    icon: "fa-solid fa-bell text-rose-400",
    highlights: [
      "Real-time event feed with granular category filtering",
      "Dispatch global broadcast popups for operational notices",
      "Instant links to unresolved tasks and approvals",
    ],
  },
  {
    id: "clients_ops",
    title: "7. OPS Portal & Retainers",
    subtitle: "Client Delivery Accounts & Bench Staffing",
    description:
      "Track client retainers, monitor bench staff availability, assign team members to active deliveries, and manage vendor contractors.",
    route: "/dashboard/clients",
    icon: "fa-solid fa-list-check text-teal-400",
    highlights: [
      "Active retainer tracking & utilization burn rates",
      "Bench resource pool & contractor utilization",
      "Bulk data importer for clients, accounts, and tasks",
    ],
  },
  {
    id: "sales_ops",
    title: "8. Sales Workdesk & Pipeline",
    subtitle: "Deal Stages, Forecasts & Account Growth",
    description:
      "Review active sales deals, monitor deal probabilities, track expected close dates, and ensure seamless handoffs from Sales to Operations.",
    route: "/dashboard/sales",
    icon: "fa-solid fa-handshake text-indigo-400",
    highlights: [
      "Deal progression tracking from Prospecting to Won",
      "Sales revenue forecast & deal value analytics",
      "Handoff coordination between sales and delivery teams",
    ],
  },
  {
    id: "bd_ops",
    title: "9. BD Portal & Proposals",
    subtitle: "Lead Qualification & Custom Proposals",
    description:
      "Monitor new business inquiries, review client proposals, check PDF previews, and align operational feasibility with new lead requests.",
    route: "/dashboard/bd",
    icon: "fa-solid fa-briefcase text-blue-400",
    highlights: [
      "Lead status tracking & sales representative assignments",
      "Review generated proposals & currency terms",
      "Feasibility and scope validation for new client deals",
    ],
  },
  {
    id: "finance_ops",
    title: "10. Finance Portal & Invoices",
    subtitle: "Client Invoicing & Operational Expenses",
    description:
      "Create client billing invoices, download PDF invoices, submit operational expenditures, and track payment receipt timelines.",
    route: "/dashboard/finance",
    icon: "fa-solid fa-coins text-yellow-400",
    highlights: [
      "Create itemized client invoices with PDF export",
      "Submit and audit department operational expenses",
      "Review payment statuses (Draft, Sent, Paid, Overdue)",
    ],
  },
  {
    id: "referrals_ops",
    title: "11. Referral Pipeline",
    subtitle: "Talent Submissions & Bounty Approvals",
    description:
      "Review candidate talent referrals, track candidate hiring status through interview stages, and coordinate bounty bonus disbursements.",
    route: "/dashboard/referrals",
    icon: "fa-solid fa-link text-sky-400",
    highlights: [
      "Track referral candidates from screening to hired",
      "Coordinate bonus payout milestones with HR",
      "Fast 1-click candidate submission form",
    ],
  },
  {
    id: "goals_ops",
    title: "12. Goals, OKRs & Standups",
    subtitle: "Strategic Alignment, Kudos & 1:1 Check-ins",
    description:
      "Align team quarterly Key Results with company targets, celebrate achievements on the Kudos wall, and run structured check-ins.",
    route: "/dashboard/goals",
    icon: "fa-solid fa-bullseye text-violet-400",
    highlights: [
      "Quarterly operational OKRs & progress sliders",
      "Peer recognition Kudos wall with reactions",
      "Structured 1:1 check-ins with action items",
    ],
  },
  {
    id: "hr_portal_ops",
    title: "13. HR Portal & Staff Leaves",
    subtitle: "Attendance Overview & Leave Approvals",
    description:
      "Review employee records, approve/reject staff leave requests with audit timestamps, and track onboarding checklists.",
    route: "/dashboard/hr",
    icon: "fa-solid fa-user-tie text-purple-400",
    highlights: [
      "Approve leave requests with 12-hour AM/PM timestamps",
      "View employee profiles & onboarding progress",
      "Export leave and attendance logs to CSV",
    ],
  },
  {
    id: "it_portal_ops",
    title: "14. IT Portal & Tool Access",
    subtitle: "Asset Allocations & License Provisioning",
    description:
      "Manage hardware asset distributions, monitor software tool access statuses, and track SaaS renewal schedules.",
    route: "/dashboard/it",
    icon: "fa-solid fa-terminal text-rose-400",
    highlights: [
      "Hardware asset tagging & user allocation",
      "Software tool licenses with instant toggle control",
      "SaaS tool renewal calendar & expense monitoring",
    ],
  },
  {
    id: "analytics_ops",
    title: "15. Analytics & Audit Logs",
    subtitle: "Billability Ratios & System Audit Trail",
    description:
      "Audit project billable hours vs non-billable efforts, review manager timesheet compliance, and inspect security audit trails.",
    route: "/dashboard/analytics",
    icon: "fa-solid fa-chart-line text-emerald-400",
    highlights: [
      "Workforce billability ratio charts & productivity trends",
      "Attendance compliance & shift hour analysis",
      "Full searchable security audit log across all actions",
    ],
  },
  {
    id: "settings_ops",
    title: "16. Settings & Security Control",
    subtitle: "Role Policies, Shifts & Organization",
    description:
      "Configure company operational details, manage granular role permissions, adjust working shifts, and configure invoice defaults.",
    route: "/dashboard/settings",
    icon: "fa-solid fa-gear text-slate-400",
    highlights: [
      "Granular Role & Feature Permissions configuration",
      "Organization details & allowed file upload rules",
      "Work shift scheduling & self-service invoice generator",
    ],
  },
];

const hrTourSteps: TourStep[] = [
  {
    id: "overview_hr",
    title: "1. HR Command Center",
    subtitle: "People Operations Hub & Daily Pulse",
    description:
      "Track live employee shift attendance, pending leave approval queues, new hire onboarding requests, and company announcements.",
    route: "/dashboard",
    icon: "fa-solid fa-gauge-high text-purple-400",
    highlights: [
      "Real-time attendance pulse & shift check-in tracker",
      "Pending leave requests counter with instant action links",
      "Company announcements & executive broadcast feed",
    ],
  },
  {
    id: "team_hr",
    title: "2. Employee Directory & Org Chart",
    subtitle: "Staff Profiles, Hierarchy Tree & Onboarding",
    description:
      "Browse the employee roster, manage reporting manager relationships in the interactive org chart, and onboard new hires with single/bulk tools.",
    route: "/dashboard/team",
    icon: "fa-solid fa-users text-cyan-400",
    highlights: [
      "Interactive visual org chart & reporting managers",
      "1-Click employee onboarding & credential exports",
      "Department rosters & searchable skill profiles",
    ],
  },
  {
    id: "calendar_hr",
    title: "3. Shift Calendar & Attendance",
    subtitle: "Schedules, Public Holidays & Timesheets",
    description:
      "Maintain company holidays, coordinate shift schedules, monitor employee working hours, and review attendance logs.",
    route: "/dashboard/calendar",
    icon: "fa-solid fa-calendar-days text-emerald-400",
    highlights: [
      "Company-wide holiday & shift calendar coordination",
      "Weekly timesheets and shift attendance records",
      "Attendance report exports for payroll compliance",
    ],
  },
  {
    id: "projects_hr",
    title: "4. Projects, SOP Wiki & Drive",
    subtitle: "HR Initiatives & Policy Documentation",
    description:
      "Coordinate internal HR initiatives, author employee handbooks and SOPs in the Markdown Wiki, and organize shared HR assets in Drive.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-amber-400",
    highlights: [
      "Track internal HR initiatives on Kanban boards",
      "Author company policies & employee SOPs in Wiki",
      "Store shared onboarding materials & templates in Drive",
    ],
  },
  {
    id: "chat_hr",
    title: "5. Chat & Confidential Inquiries",
    subtitle: "Team Communication & Direct Messaging",
    description:
      "Handle confidential employee inquiries in private 1:1 chats with read receipts, coordinate in team channels, and use the integrated Mail Center.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-pink-400",
    highlights: [
      "Confidential 1:1 direct messages with read receipts",
      "Company-wide discussion channels & announcements",
      "Integrated Mail center for external candidate emails",
    ],
  },
  {
    id: "notifications_hr",
    title: "6. Notification Center",
    subtitle: "Leave Requests, Alerts & HR Broadcasts",
    description:
      "Receive real-time alerts for incoming leave requests, milestone achievements, and dispatch company-wide HR memos.",
    route: "/dashboard/notifications",
    icon: "fa-solid fa-bell text-rose-400",
    highlights: [
      "Instant alerts for submitted leave and timesheet requests",
      "Dispatch global broadcast banners to all staff",
      "Category filters for unread messages and system notices",
    ],
  },
  {
    id: "referrals_hr",
    title: "7. Candidate Referral Pipeline",
    subtitle: "Talent Acquisition & Bonus Disbursements",
    description:
      "Manage employee-submitted candidate resumes, move applicants through hiring stages, and approve referral cash bonus disbursements.",
    route: "/dashboard/referrals",
    icon: "fa-solid fa-link text-sky-400",
    highlights: [
      "Candidate pipeline tracker from screening to offer",
      "Review resume links and candidate skill matches",
      "Authorize referral bounty bonuses upon successful hiring",
    ],
  },
  {
    id: "goals_hr",
    title: "8. Performance, Reviews & Kudos",
    subtitle: "Appraisals, OKRs & Workplace Culture",
    description:
      "Oversee performance appraisal review cycles, monitor department OKRs, celebrate culture on the Kudos wall, and facilitate 1:1 check-ins.",
    route: "/dashboard/goals",
    icon: "fa-solid fa-bullseye text-violet-400",
    highlights: [
      "Appraisal review tracking & individual goal alignment",
      "Social peer recognition Kudos wall with emoji reactions",
      "Structured 1:1 meeting templates with rollover notes",
    ],
  },
  {
    id: "hr_portal_hr",
    title: "9. HR Portal & Leave Approvals",
    subtitle: "Leave Management, Vault & Case Desk",
    description:
      "Core HR management hub: approve/reject leave requests with 12-hour AM/PM timestamps, store confidential contracts in the Vault, and track employee cases.",
    route: "/dashboard/hr",
    icon: "fa-solid fa-user-tie text-purple-400",
    highlights: [
      "Approve/Reject leaves with 12-hour AM/PM audit stamps",
      "Confidential Document Vault with role-gated access",
      "Employee help desk cases & onboarding checklist tracking",
    ],
  },
  {
    id: "it_portal_hr",
    title: "10. IT Assets & Tool Matrix",
    subtitle: "New Hire Asset Allocation & Software Access",
    description:
      "Coordinate new hire hardware asset allocations (laptops, peripherals) and check employee software licensing access.",
    route: "/dashboard/it",
    icon: "fa-solid fa-terminal text-rose-400",
    highlights: [
      "Track assigned hardware assets per employee",
      "Review software tool provisioning for new hires",
      "Asset return checklists for employee departures",
    ],
  },
  {
    id: "analytics_hr",
    title: "11. Analytics & Attendance Reports",
    subtitle: "Attendance Trends, Leave Ratios & Audits",
    description:
      "Analyze employee attendance trends, leave utilization by department, and review security audit logs for compliance.",
    route: "/dashboard/analytics",
    icon: "fa-solid fa-chart-line text-emerald-400",
    highlights: [
      "Leave utilization & absenteeism trend charts",
      "Department attendance compliance metrics",
      "Security audit logs for employee profile changes",
    ],
  },
  {
    id: "settings_hr",
    title: "12. Settings & Self-Service",
    subtitle: "Profile, Security & Self-Service Invoicing",
    description:
      "Manage personal profile details, update password security, review organization settings, and generate self-service invoices.",
    route: "/dashboard/settings",
    icon: "fa-solid fa-gear text-slate-400",
    highlights: [
      "Personal profile, contact details & bio management",
      "Two-factor authentication & password security",
      "Self-service contractor/salary invoice generator",
    ],
  },
];

const employeeTourSteps: TourStep[] = [
  {
    id: "welcome_employee",
    title: "1. My Workspace & Check-In",
    subtitle: "Daily Shift Clock-In & Attendance Tracker",
    description:
      "Start and end your workday with 1-click! Track active shift hours in real time, monitor upcoming shifts, and view pinned company announcements.",
    route: "/dashboard",
    icon: "fa-solid fa-gauge-high text-emerald-400",
    highlights: [
      "1-Click live Check-In, Break, and Check-Out timer in IST",
      "My daily shift hours & attendance compliance status",
      "Personal task shortcuts & company announcements",
    ],
  },
  {
    id: "team_employee",
    title: "2. My Team & Directory",
    subtitle: "Colleague Directory & Reporting Structure",
    description:
      "Search for teammates by name or skills, discover reporting managers, and explore the interactive visual organization chart.",
    route: "/dashboard/team",
    icon: "fa-solid fa-users text-cyan-400",
    highlights: [
      "Search colleagues by department, name, or skill tags",
      "Explore the interactive visual org hierarchy chart",
      "View teammate contact details and assigned roles",
    ],
  },
  {
    id: "calendar_employee",
    title: "3. Calendar & Timesheets",
    subtitle: "Log Daily Hours, Sprints & Team Events",
    description:
      "Log your daily work hours on projects, mark billable time, submit weekly timesheets for approval, and track company holidays.",
    route: "/dashboard/calendar",
    icon: "fa-solid fa-calendar-days text-indigo-400",
    highlights: [
      "Fill out daily project timesheet rows with task notes",
      "Submit weekly timesheets with approval status tracking",
      "Shared company calendar with holidays and meeting deadlines",
    ],
  },
  {
    id: "projects_employee",
    title: "4. Projects, Kanban & Drive",
    subtitle: "Assigned Tasks, Milestones & Team Files",
    description:
      "Manage assigned tasks on drag-and-drop Kanban boards, check off subtask items, access department Wiki SOPs, and view shared Drive files.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-amber-400",
    highlights: [
      "Interactive Kanban boards with drag-and-drop status columns",
      "Task detail drawer with subtasks checklist and comments",
      "Browse department Wiki guides and shared Drive assets",
    ],
  },
  {
    id: "chat_employee",
    title: "5. Chat & Direct Messaging",
    subtitle: "Team Communication & File Sharing",
    description:
      "Message colleagues in department channels and private 1:1 Direct Messages. Share image attachments with read receipt checkmarks.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-blue-400",
    highlights: [
      "Collaborate in public channels & private 1:1 direct messages",
      "Upload image attachments with fast preview support",
      "Read receipts with blue double-check delivery indicators",
    ],
  },
  {
    id: "notifications_employee",
    title: "6. Notification Center",
    subtitle: "Personal Alerts, Mentions & Broadcasts",
    description:
      "Stay updated on task assignments, timesheet approvals, chat mentions, and broadcast announcements with zero noise.",
    route: "/dashboard/notifications",
    icon: "fa-solid fa-bell text-rose-400",
    highlights: [
      "Instant alerts for task assignments and leave responses",
      "Filter notifications by Unread, Tasks, Chat, or System",
      "Click any notification to navigate directly to the item",
    ],
  },
  {
    id: "referrals_employee",
    title: "7. Referrals & Rewards",
    subtitle: "Refer Colleagues & Earn Cash Bonuses",
    description:
      "Refer talented friends for open workspace roles, follow candidate interview progress, and earn cash bounty rewards upon hiring.",
    route: "/dashboard/referrals",
    icon: "fa-solid fa-link text-yellow-400",
    highlights: [
      "1-Click candidate referral submission form",
      "Live recruitment pipeline tracker from Applied to Hired",
      "Earn cash referral bonuses tracked directly to your profile",
    ],
  },
  {
    id: "goals_employee",
    title: "8. My Goals, OKRs & Kudos",
    subtitle: "Individual Targets & Social Kudos Wall",
    description:
      "Track your quarterly Key Results, review performance appraisal feedback, give peer Kudos shout-outs, and participate in 1:1 check-ins.",
    route: "/dashboard/goals",
    icon: "fa-solid fa-bullseye text-rose-400",
    highlights: [
      "Track individual Key Results and update progress sliders",
      "Post peer appreciation shout-outs on the Kudos wall",
      "Review 1:1 meeting discussion points and action items",
    ],
  },
  {
    id: "leaves_employee",
    title: "9. Time-Off & Leave Balances",
    subtitle: "Request Leaves & View Balances",
    description:
      "Check your leave balances (Casual, Sick, Earned), submit time-off requests with instant notifications, and view 12-hour AM/PM approval status.",
    route: "/dashboard/hr",
    icon: "fa-solid fa-plane-departure text-sky-400",
    highlights: [
      "Submit leave requests with duration and reason notes",
      "Live tracking of manager approvals with 12-hour AM/PM stamps",
      "Download your personal leave history report (CSV/TXT)",
    ],
  },
  {
    id: "settings_employee",
    title: "10. Settings & Self-Service",
    subtitle: "Profile, Password & Generate Invoice",
    description:
      "Update your profile photo, skills, and contact details, configure password security, and generate self-service invoices.",
    route: "/dashboard/settings",
    icon: "fa-solid fa-gear text-slate-400",
    highlights: [
      "Manage personal profile, bio, and social portfolio links",
      "Update password and account security settings",
      "Generate and print self-service salary/contractor invoices",
    ],
  },
];

const clientTourSteps: TourStep[] = [
  {
    id: "welcome_client",
    title: "1. Client Workspace Overview",
    subtitle: "Deliverables, Retainers & Status",
    description:
      "Welcome to your client workspace! Monitor project progress, review active retainers, and chat directly with your dedicated account team.",
    route: "/dashboard",
    icon: "fa-solid fa-handshake text-indigo-400",
    highlights: [
      "Real-time project milestone tracking",
      "Retainer hours visibility and progress summaries",
      "Direct communication channel with account leads",
    ],
  },
  {
    id: "projects_client",
    title: "2. Active Projects & Deliverables",
    subtitle: "Kanban Progress & Milestone Completion",
    description:
      "Inspect real-time task deliverable statuses on the Kanban board and verify sprint milestones as they are completed.",
    route: "/dashboard/projects",
    icon: "fa-solid fa-folder-tree text-purple-400",
    highlights: [
      "Transparent delivery progress on Kanban board",
      "Sprint completion percentages and release dates",
      "Inspect milestone deliverable attachments",
    ],
  },
  {
    id: "chat_client",
    title: "3. Direct Account Team Chat",
    subtitle: "Instant Communication & File Sharing",
    description:
      "Message your dedicated project managers and technical leads in real time. Share requirements, feedback, and document attachments.",
    route: "/dashboard/chat",
    icon: "fa-solid fa-comments text-sky-400",
    highlights: [
      "Dedicated client support and communication channel",
      "Share document and image attachments in real time",
      "Direct access to your assigned account managers",
    ],
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  role?: string;
}

export function GuidedTour({ isOpen, onClose, role }: GuidedTourProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Compute canonical initial role from session/user/props
  const initialRoleKey = React.useMemo(() => {
    const r = user?.role || role || "Employee";
    if (isSubAdminRole(r)) return "OPS";
    const up = r.toUpperCase();
    if (up === "ADMIN" || up === "CEO") return "ADMIN";
    if (up === "HR" || up.includes("HR")) return "HR";
    if (up === "MANAGER") return "MANAGER";
    if (up === "CLIENT") return "CLIENT";
    return "EMPLOYEE";
  }, [user?.role, role]);

  const [activeRole, setActiveRole] = useState<string>(initialRoleKey);

  useEffect(() => {
    setActiveRole(initialRoleKey);
  }, [initialRoleKey]);

  const { tourSteps, roleLabel } = React.useMemo(() => {
    if (activeRole === "ADMIN" || activeRole === "CEO") {
      return { tourSteps: adminTourSteps, roleLabel: "Admin" };
    }
    if (activeRole === "OPS" || isSubAdminRole(activeRole)) {
      return { tourSteps: subadminTourSteps, roleLabel: "SubAdmin (OPS)" };
    }
    if (activeRole === "HR" || activeRole.includes("HR")) {
      return { tourSteps: hrTourSteps, roleLabel: "HR Specialist" };
    }
    if (activeRole === "MANAGER") {
      return { tourSteps: adminTourSteps, roleLabel: "Manager" };
    }
    if (activeRole === "CLIENT") {
      return { tourSteps: clientTourSteps, roleLabel: "Client" };
    }
    return { tourSteps: employeeTourSteps, roleLabel: "Employee" };
  }, [activeRole]);

  const [isMinimized, setIsMinimized] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isStepMenuOpen, setIsStepMenuOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsCompleted(false);
      setIsMinimized(false);
      setIsStepMenuOpen(false);
    }
  }, [isOpen]);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexace_tour_sound") !== "false";
    }
    return true;
  });

  // Synthesize pleasant tactile audio chimes using HTML5 Web Audio API
  const playSound = useCallback(
    (type: "step" | "finish" | "toggle") => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        if (type === "step") {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(540, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        } else if (type === "finish") {
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 chord
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.08);
            osc.stop(ctx.currentTime + idx * 0.08 + 0.36);
          });
        }
      } catch {
        // AudioContext silent fallback
      }
    },
    [soundEnabled]
  );

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("nexace_tour_sound", String(next));
      }
      return next;
    });
  };

  const handleRoleChange = (newRole: string) => {
    setActiveRole(newRole);
    setCurrentStepIndex(0);
    setIsCompleted(false);
    playSound("step");
  };

  const userName = user?.name || "User";

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (currentStepIndex < tourSteps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
          playSound("step");
        } else {
          handleFinish();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
          playSound("step");
        }
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsAutoPlay((prev) => !prev);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleSound();
      } else if (e.key === "_" || e.key === "-") {
        e.preventDefault();
        setIsMinimized((prev) => !prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, tourSteps.length, isCompleted, playSound]);

  // Automatically navigate to feature route when step changes
  useEffect(() => {
    if (isOpen && !isCompleted && tourSteps[currentStepIndex]?.route) {
      router.push(tourSteps[currentStepIndex].route);
    }
  }, [currentStepIndex, isOpen, isCompleted, router, tourSteps]);

  // Auto-play timer (5 seconds per slide)
  useEffect(() => {
    if (!isOpen || !isAutoPlay || isCompleted || isMinimized) return;

    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < tourSteps.length - 1) {
          playSound("step");
          return prev + 1;
        } else {
          setIsAutoPlay(false);
          handleFinish();
          return prev;
        }
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [isOpen, isAutoPlay, isCompleted, isMinimized, tourSteps.length, playSound]);

  if (!isOpen) return null;

  const currentStep = tourSteps[currentStepIndex] || tourSteps[0];
  const progressPct = Math.round(((currentStepIndex + 1) / tourSteps.length) * 100);

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      playSound("step");
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      playSound("step");
    }
  };

  const handleGoToPage = () => {
    if (currentStep.route) {
      router.push(currentStep.route);
    }
  };

  const handleFinish = () => {
    setIsAutoPlay(false);
    setIsCompleted(true);
    playSound("finish");
    if (typeof window !== "undefined") {
      localStorage.setItem("nexace_tour_completed", "true");
    }
  };

  const handleClose = () => {
    setIsAutoPlay(false);
    setIsCompleted(false);
    setIsMinimized(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("nexace_tour_completed", "true");
    }
    onClose();
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setIsCompleted(false);
    setIsAutoPlay(false);
    playSound("step");
  };

  // ── Minimized Floating Pill View ───────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-auto animate-in fade-in slide-in-from-bottom-3">
        <div
          onClick={() => setIsMinimized(false)}
          className="bg-card/95 backdrop-blur-2xl border-2 border-primary/50 text-foreground px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer hover:border-primary transition-all hover:scale-105 ring-4 ring-primary/10 group"
        >
          <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xs shadow-xs">
            <i className="fa-solid fa-compass text-sm" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <span>Tour Active ({roleLabel})</span>
              <span className="text-muted-foreground">• Step {currentStepIndex + 1}/{tourSteps.length}</span>
            </div>
            <div className="text-xs font-bold text-foreground truncate max-w-[200px]">
              {currentStep.title}
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-border/80 pl-2 ml-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="text-xs text-primary hover:text-primary/80 font-bold p-1 rounded-lg hover:bg-primary/10 cursor-pointer"
              title="Expand Tour"
            >
              <i className="fa-solid fa-expand" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="text-xs text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted cursor-pointer"
              title="Close Tour"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Completion Celebration Modal ─────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={handleClose} />
        <div
          className="pointer-events-auto w-full max-w-md bg-card/95 backdrop-blur-2xl border-2 border-primary/50 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden text-center ring-4 ring-primary/15"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Gradient Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary via-emerald-500 to-indigo-500" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base" />
          </button>

          {/* Badge Icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400/20 to-primary/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-400/10">
            <i className="fa-solid fa-award text-3xl" />
          </div>

          <div className="space-y-1.5">
            <Badge color="primary" variant="soft" className="text-xs font-mono font-bold uppercase tracking-wider">
              {roleLabel} Certified
            </Badge>
            <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Onboarding Completed!
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Congratulations, {userName}! You have reviewed all {tourSteps.length} functional modules tailored for the {roleLabel} workflow.
            </p>
          </div>

          {/* Exploration Metric Chips */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80">
              <div className="text-lg font-black text-primary">{tourSteps.length}</div>
              <div className="text-[10px] text-muted-foreground font-semibold">Features</div>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80">
              <div className="text-lg font-black text-emerald-500">100%</div>
              <div className="text-[10px] text-muted-foreground font-semibold">Verified</div>
            </div>
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80">
              <div className="text-lg font-black text-indigo-500">v2.0</div>
              <div className="text-[10px] text-muted-foreground font-semibold">Platform</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              color="primary"
              size="sm"
              onClick={handleClose}
              className="w-full h-9 font-bold text-xs gap-1.5 cursor-pointer shadow-md"
            >
              <i className="fa-solid fa-gauge-high text-xs" /> Go to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRestart}
                className="flex-1 h-8 font-semibold text-xs gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-rotate-left text-xs" /> Replay Tour
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleClose();
                  router.push("/guide");
                }}
                className="flex-1 h-8 font-semibold text-xs gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-book-open text-xs text-primary" /> Full Manual
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard Full Tour Card ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center sm:justify-end p-4 sm:p-6 animate-in fade-in">
      <div
        className="pointer-events-auto w-full max-w-lg bg-card/95 backdrop-blur-2xl border-2 border-primary/40 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden transition-all duration-300 ring-4 ring-primary/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="space-y-2.5 border-b border-border pb-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
                <i className={cn(currentStep.icon, "text-xl")} />
              </div>
              <div>
                <div className="flex items-center gap-2 relative">
                  {/* Step Selector Dropdown Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsStepMenuOpen(!isStepMenuOpen)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-colors cursor-pointer"
                    title="Click to jump to any step"
                  >
                    <span>Step {currentStepIndex + 1} of {tourSteps.length}</span>
                    <i className={cn("fa-solid fa-chevron-down text-[8px] transition-transform", isStepMenuOpen ? "rotate-180" : "")} />
                  </button>

                  <span className="text-[10px] text-muted-foreground font-semibold">{progressPct}%</span>

                  {/* Step Quick Jump Popover Menu */}
                  {isStepMenuOpen && (
                    <div className="absolute top-6 left-0 z-50 w-72 max-h-60 overflow-y-auto bg-card border border-border rounded-xl shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 mb-1">
                        Jump to Feature ({tourSteps.length} Steps)
                      </div>
                      {tourSteps.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setCurrentStepIndex(idx);
                            setIsStepMenuOpen(false);
                            playSound("step");
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer",
                            idx === currentStepIndex
                              ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <span className="truncate">{s.title}</span>
                          {idx < currentStepIndex && (
                            <i className="fa-solid fa-check text-emerald-500 text-[10px]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-primary/80 font-bold ml-auto truncate max-w-[120px]">
                    • {userName} ({roleLabel.toUpperCase()})
                  </span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-foreground mt-0.5">{currentStep.title}</h3>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer text-xs",
                  soundEnabled
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:bg-muted opacity-50"
                )}
                title={soundEnabled ? "Mute Sound (M)" : "Enable Sound (M)"}
              >
                <i className={cn("fa-solid", soundEnabled ? "fa-volume-high" : "fa-volume-xmark")} />
              </button>

              {/* Minimize Card */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer text-xs"
                title="Minimize Tour (_)"
              >
                <i className="fa-solid fa-window-minimize -translate-y-1" />
              </button>

              {/* Close Tour */}
              <button
                type="button"
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer text-xs"
                title="Close Tour (Esc)"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
          </div>

          {/* Role Tour Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
              Tour For:
            </span>
            {[
              { id: "ADMIN", label: "Admin (16)", icon: "fa-solid fa-crown" },
              { id: "OPS", label: "SubAdmin / OPS (16)", icon: "fa-solid fa-user-tie" },
              { id: "HR", label: "HR Specialist (12)", icon: "fa-solid fa-briefcase" },
              { id: "EMPLOYEE", label: "Employee (10)", icon: "fa-solid fa-user" },
            ].map((r) => {
              const isCurrent = activeRole === r.id || (r.id === "OPS" && isSubAdminRole(activeRole));
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border",
                    isCurrent
                      ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  <i className={cn(r.icon, "text-[10px]")} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-emerald-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Content Body */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">{currentStep.subtitle}</p>
            {isAutoPlay && (
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
                <i className="fa-solid fa-play text-[8px]" /> Auto-Advancing (5s)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-foreground leading-relaxed">{currentStep.description}</p>

          {/* Key Capabilities List */}
          <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <i className="fa-solid fa-star text-amber-400 text-xs" /> Key Capabilities:
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground pl-0.5">
              {currentStep.highlights.map((h, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-[11px] shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Step Carousel Navigation Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {tourSteps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCurrentStepIndex(idx);
                  playSound("step");
                }}
                title={`Jump to ${s.title}`}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  idx === currentStepIndex
                    ? "w-6 bg-primary shadow-xs"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                )}
              />
            ))}
          </div>
        </div>

        {/* Navigation Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-3.5">
          <div className="flex items-center gap-2">
            {/* Auto-Play Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border",
                isAutoPlay
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  : "bg-muted text-muted-foreground hover:text-foreground border-border/60"
              )}
              title="Toggle Hands-Free Presentation (Space)"
            >
              <i className={cn("fa-solid text-[10px]", isAutoPlay ? "fa-pause" : "fa-play")} />
              <span>{isAutoPlay ? "Pause" : "Auto-Play"}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="text-xs text-muted-foreground hover:text-foreground underline font-medium cursor-pointer ml-1"
            >
              Skip
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoToPage}
              className="text-xs font-semibold gap-1.5 cursor-pointer h-8"
            >
              <i className="fa-solid fa-location-arrow text-xs text-primary" /> Open Page
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentStepIndex === 0}
              onClick={handlePrev}
              className="text-xs font-semibold gap-1 cursor-pointer h-8"
            >
              <i className="fa-solid fa-chevron-left text-[10px]" /> Back
            </Button>

            <Button
              type="button"
              color="primary"
              size="sm"
              onClick={handleNext}
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-sm h-8"
            >
              {currentStepIndex === tourSteps.length - 1 ? (
                <>
                  <i className="fa-solid fa-circle-check text-xs" /> Finish Tour
                </>
              ) : (
                <>
                  Next <i className="fa-solid fa-chevron-right text-[10px]" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
