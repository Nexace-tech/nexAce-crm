"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import styles from "./guide.module.css";

interface StepItem {
  title: string;
  purpose?: string;
  instructions: string[];
  tip?: string;
  hotkey?: string;
}

interface ModuleItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  color: string;
  tag: string;
  category: "Core" | "Agile & Projects" | "HR & Culture" | "Operations & IT";
  screenshot: string;
  screenshotCaption: string;
  description: string;
  quickStats?: Array<{ label: string; value: string }>;
  steps: StepItem[];
}

const MODULES: ModuleItem[] = [
  {
    id: "overview",
    name: "Dashboard Overview",
    path: "/dashboard",
    icon: "fa-chart-pie",
    color: "#6366f1",
    tag: "Central Command",
    category: "Core",
    screenshot: "/screenshots/dashboard_overview.png",
    screenshotCaption: "Live Clock-In Widget, Pending Approvals Counter, and Shift Schedule Overview",
    quickStats: [
      { label: "Check-in Mode", value: "Geo-aware IST" },
      { label: "Approval Sync", value: "Real-time" },
      { label: "Notification Delay", value: "< 1s" },
    ],
    description: "Personalized command center with live status metrics, quick actions, shift schedule, and instant check-in/out timer.",
    steps: [
      {
        title: "How to Clock In & Out Daily (Attendance Tracker)",
        purpose: "Accurately log your working hours, breaks, and shift attendance in real time.",
        instructions: [
          "Locate the Attendance Widget in the top-left section of the dashboard.",
          "Click the green 'Check In' button when your workday begins. The digital live timer immediately starts counting hours:minutes:seconds (00:00:00) in IST.",
          "Taking a Break: When taking lunch or a break, click the amber 'Take Break' button. The timer pauses and marks your break status.",
          "Resume Work: Click 'Resume Work' upon returning. The timer resumes active duration tracking.",
          "Ending Workday: At shift completion, click the red 'Check Out' button. The exact login time, logout time, break duration, and net hours are committed to the database.",
        ],
        tip: "Pausing your shift for lunch ensures billable and shift compliance records remain 100% accurate for payroll.",
      },
      {
        title: "How to Review KPI Cards and Pending Approvals",
        purpose: "Quickly identify pending approvals and items requiring immediate attention.",
        instructions: [
          "Check the top summary cards: Active Projects, Pending Timesheets/Leave Approvals, and Unread Messages.",
          "Click directly on any metric card to jump straight into the corresponding module with pre-filtered items.",
        ],
      },
      {
        title: "How to Read & Acknowledge Pinned Announcements",
        purpose: "Stay updated on critical company-wide updates, policy releases, and urgent broadcasts.",
        instructions: [
          "Scroll to the Announcements widget on the right side of the dashboard.",
          "Urgent alerts and executive memos appear pinned at the top. Click on any announcement title to expand the full memo drawer.",
        ],
      },
    ],
  },
  {
    id: "team",
    name: "My Team & Organization",
    path: "/dashboard/team",
    icon: "fa-users",
    color: "#06b6d4",
    tag: "Directory & Structure",
    category: "Core",
    screenshot: "/screenshots/team_directory.png",
    screenshotCaption: "Team Directory Grid with Search, Department Filter, and Quick Profile Inspection",
    quickStats: [
      { label: "Views", value: "Grid & Table" },
      { label: "Onboarding", value: "Single & Bulk" },
      { label: "Hierarchy", value: "Interactive Tree" },
    ],
    description: "Manage employees, dynamic organizational hierarchy charts, manager views, and departmental rosters.",
    steps: [
      {
        title: "How to Search, Filter & Switch Views",
        purpose: "Quickly locate team members and inspect their profiles across departments.",
        instructions: [
          "Navigate to /dashboard/team and click the 'Team Directory' tab.",
          "Type in the search bar to instantly find colleagues by name, email, or skill keywords.",
          "Use the Department Filter dropdown to filter by Engineering, Marketing, Operations, Sales, or HR.",
          "In the top right, click the Grid Icon for visual cards or the List Icon for a compact data table.",
        ],
      },
      {
        title: "How to Add a Single Employee",
        purpose: "Onboard a new team member and generate their temporary login credentials.",
        instructions: [
          "In the top right of the Team page, click '+ Add Employee'.",
          "Fill out the modal fields: Full Name, Work Email, Role (Employee, Manager, HR, OPS, Admin), Department, Reporting Manager, and comma-separated Skill tags (e.g. React, TypeScript, Node.js).",
          "Click 'Create Employee'.",
          "A dialog displays the new profile and an auto-generated temporary password. Click 'Copy Credentials' to share with the new hire.",
        ],
        tip: "Employees are automatically prompted to set a secure personal password on their first login.",
      },
      {
        title: "How to Bulk Import Multiple Team Members",
        purpose: "Provision entire departments or batch invite staff in a single operation.",
        instructions: [
          "Click the 'Bulk Add' button on the Team page.",
          "In the spreadsheet-style modal, fill out the rows: Name, Email, Role, Department, and Manager. Click '+ Add Another Row' if needed.",
          "Click 'Submit Bulk Employees' to create all accounts in a single transaction.",
        ],
      },
      {
        title: "How to Use the Interactive Visual Org Chart",
        purpose: "Visualize company reporting structures and reassign managers seamlessly.",
        instructions: [
          "Switch to the 'Org Chart' tab to view the live hierarchy tree.",
          "Click and drag across the canvas to pan; use the '+' and '-' controls or mouse scroll wheel to zoom.",
          "Click any employee card node to view their contact details, direct reports count, and assigned department.",
          "Admins and OPS leads can click and drag an employee card and drop it onto a new manager card to reassign reporting hierarchy.",
        ],
        hotkey: "Mouse Drag / Scroll Wheel",
      },
      {
        title: "How to Create & Manage Departments",
        purpose: "Organize teams into structured operational units with dedicated department heads.",
        instructions: [
          "Click the 'Departments' tab and select '+ Add Department'.",
          "Enter Department Name (e.g. 'Quality Assurance') — the system auto-generates the standardized code (e.g. 'QA').",
          "Select the Department Head / Manager and click 'Save Department'.",
          "Click 'View Members' on any department card to inspect all assigned personnel.",
        ],
      },
    ],
  },
  {
    id: "calendar",
    name: "Calendar, Sprints & Attendance",
    path: "/dashboard/calendar",
    icon: "fa-calendar-days",
    color: "#10b981",
    tag: "Time & Agile Sprints",
    category: "Agile & Projects",
    screenshot: "/screenshots/calendar_sprints.png",
    screenshotCaption: "Unified Team Calendar with Multi-Category Events, Sprints, and Timesheets",
    quickStats: [
      { label: "Categories", value: "5 Event Types" },
      { label: "Timesheet Cycle", value: "Weekly" },
      { label: "Audit Export", value: "CSV & JSON" },
    ],
    description: "Unified company calendar, sprint tracking, weekly billable timesheets, and attendance audit logs.",
    steps: [
      {
        title: "How to Schedule Team Calendar Events",
        purpose: "Coordinate meetings, deadlines, holidays, and milestones with department filtering.",
        instructions: [
          "Go to /dashboard/calendar and click the 'Calendar' tab.",
          "Click '+ New Event' (or click directly on any calendar cell date).",
          "Fill in: Event Title (e.g. 'Q3 Roadmap Planning'), Event Type (Meeting, Holiday, Birthday, Deadline, Personal), Department visibility, Start/End timestamps, and description.",
          "Click 'Create Event'. The event appears color-coded across all invited department calendars.",
        ],
      },
      {
        title: "How to Create & Monitor Agile Sprints",
        purpose: "Run structured sprint iterations and track completion progress.",
        instructions: [
          "Switch to the 'Sprints' tab and click '+ New Sprint'.",
          "Enter Sprint Name (e.g. 'Sprint 24 - Checkout Revamp'), Sprint Goal, Start Date, and End Date, then click 'Start Sprint'.",
          "Link tasks to this sprint from the Project board to watch the burndown percentage and task completion rate update live.",
        ],
      },
      {
        title: "How to Fill Out & Submit Weekly Timesheets",
        purpose: "Log daily project effort and distinguish billable vs. non-billable client hours.",
        instructions: [
          "Click the 'Timesheets' tab and select the work week using navigation arrows (< Prev Week / Next Week >).",
          "Click '+ Add Task Row', select your project, and type the task description.",
          "Enter hours worked for each day (Mon, Tue, Wed, Thu, Fri, Sat, Sun).",
          "Check the 'Billable' checkbox if hours should be billed to a client retainer.",
          "Click 'Save Draft' to persist or 'Submit for Approval' to route to your manager.",
        ],
        tip: "Marking billable hours accurately allows the CRM to compute client retainer burn rates automatically.",
      },
      {
        title: "How Managers Approve Timesheets & Admins Export CSV",
        purpose: "Review team submissions and download comprehensive attendance audit sheets.",
        instructions: [
          "Managers scroll to 'Pending Team Submissions' and click 'Approve' to lock the timesheet or 'Reject' with feedback.",
          "Admins click 'Attendance', set a Date Range under 'Admin Hours Summary', and click 'Export CSV' for full payroll audits.",
        ],
      },
    ],
  },
  {
    id: "projects",
    name: "Projects, Tasks, Wiki & Drive",
    path: "/dashboard/projects",
    icon: "fa-folder-tree",
    color: "#f59e0b",
    tag: "Delivery & Storage",
    category: "Agile & Projects",
    screenshot: "/screenshots/projects_kanban.png",
    screenshotCaption: "Interactive Kanban Project Board with Drag-and-Drop Task Status Columns",
    quickStats: [
      { label: "Views", value: "Kanban & Gantt" },
      { label: "Storage", value: "Multi-folder Drive" },
      { label: "Docs", value: "Markdown Wiki" },
    ],
    description: "Agile Kanban boards, Gantt timelines, collaborative SOP Wiki, cloud Drive file storage, and team workload heatmaps.",
    steps: [
      {
        title: "How to Create Projects & Kanban Tasks",
        purpose: "Organize deliverable workflows and track task execution across lifecycle stages.",
        instructions: [
          "Click '+ New Project', enter Project Name, Budget, Assignee Type (Member or Department), Start Date, and Due Date. Click 'Create Project'.",
          "Select the active project from the top project selector dropdown.",
          "In the Kanban tab, click '+ Add Task' under any column (Planning, In Progress, Under Review, Completed).",
          "Fill in Task Title, Description, Assignee, Priority (Low, Medium, High, Critical), Due Date, and linked Sprint.",
          "Drag and drop task cards between columns as work evolves.",
        ],
      },
      {
        title: "How to Use the Task Detail Drawer (Subtasks & Comments)",
        purpose: "Collaborate on individual tasks with checklists and threaded team discussions.",
        instructions: [
          "Click on any task card in the Kanban board to open the slide-out detail drawer.",
          "Add Subtasks: Type subtask titles under 'Subtasks Checklist' and check them off when finished.",
          "Add Comments: Type updates in the comments box and press 'Post Comment' to collaborate with assignees.",
        ],
      },
      {
        title: "How to View Gantt Timelines & Team Workload",
        purpose: "Track deliverable dependencies and balance employee workload capacity.",
        instructions: [
          "Switch to the 'Gantt' tab to inspect project milestones and deadlines horizontally across calendar days.",
          "Switch to the 'Workload' tab to review capacity meters and detect overallocated team members (> 40 hrs/week).",
        ],
      },
      {
        title: "How to Author SOPs in Wiki & Manage Files in Drive",
        purpose: "Centralize documentation and secure asset storage in customizable folders.",
        instructions: [
          "In 'Wiki', browse SOPs by department or click '+ New Article' to write rich markdown playbooks.",
          "In 'Drive', create folders, upload assets (PNG, PDF, DOCX, ZIP), click any file to open preview lightbox, or select multiple files for batch download.",
        ],
      },
    ],
  },
  {
    id: "chat",
    name: "Communication Hub",
    path: "/dashboard/chat",
    icon: "fa-comments",
    color: "#ec4899",
    tag: "Real-Time Collaboration",
    category: "Core",
    screenshot: "/screenshots/guide_overview.png",
    screenshotCaption: "Omnichannel Communications: Team Channels, DMs, Mail Center, and WhatsApp Panel",
    quickStats: [
      { label: "Channels", value: "Public & Private" },
      { label: "Integrations", value: "Mail & WhatsApp" },
      { label: "Calls", value: "WebRTC Video" },
    ],
    description: "Omnichannel communication with team channels, 1:1 direct messages, Mail Center, WhatsApp API, and video rooms.",
    steps: [
      {
        title: "How to Chat in Channels & Send 1:1 Direct Messages",
        purpose: "Real-time communication across team channels and private peer-to-peer discussions.",
        instructions: [
          "Select a channel (#general, #engineering) or click a teammate's name under 'Direct Messages'.",
          "Type your message in the rich text box, attach files via the paperclip icon, and press Enter.",
          "Hover over messages to add emoji reactions (👍, ❤️, 🔥, 🚀, 👏).",
          "Click the reply icon to start a focused sub-thread, or click the pin icon next to a colleague's name to pin their chat at the top.",
        ],
      },
      {
        title: "How to Use the Integrated Mail Center",
        purpose: "Manage client and system emails without leaving the CRM.",
        instructions: [
          "Click the 'Mail' tab to browse Inbox, Sent, Starred, and Drafts.",
          "Click on any email row to read the body and download attachments.",
          "Click 'Compose Email', fill in recipient, subject, and body, and click 'Send Email'.",
        ],
      },
      {
        title: "How to Manage WhatsApp Business Threads",
        purpose: "Handle client inquiries via the official WhatsApp Business API.",
        instructions: [
          "Click the 'WhatsApp' tab to view incoming client chats in the sidebar.",
          "Filter chats by status: Active, Pending, or Closed.",
          "Type replies directly into the message pane to communicate with external clients.",
        ],
      },
      {
        title: "How to Launch Virtual Video Standups",
        purpose: "Instant standup video calls with camera and screen-sharing.",
        instructions: [
          "Click the 'Video' tab, choose a project video room, and click 'Join Video Room'.",
          "Grant browser camera/microphone permissions to begin the call.",
        ],
      },
    ],
  },
  {
    id: "hr",
    name: "HR Portal & People Operations",
    path: "/dashboard/hr",
    icon: "fa-briefcase",
    color: "#8b5cf6",
    tag: "HRMS & Compliance",
    category: "HR & Culture",
    screenshot: "/screenshots/hr_portal.png",
    screenshotCaption: "HR Portal with Checklists, Leaves, Document Vault, Help Desk, and Appraisal Cycles",
    quickStats: [
      { label: "Leave Types", value: "Casual, Sick, Paid" },
      { label: "Vault Security", value: "Restricted Access" },
      { label: "Reviews", value: "KRA & Probation" },
    ],
    description: "End-to-end human resource management: leaves, onboarding/offboarding, vault, help desk, appraisals, and probation.",
    steps: [
      {
        title: "How to Apply for Leaves & Export Leave Records",
        purpose: "Submit time-off requests, manage approval queues, and download leave reports.",
        instructions: [
          "Go to /dashboard/hr > 'Leaves' and click '+ Apply for Leave'.",
          "Select Leave Type (Casual, Sick, Paid, Unpaid), pick Start Date and End Date, enter your reason, and click 'Submit Request'.",
          "Manager/HR Approval: Supervisors click 'Approve' or 'Reject' on pending requests.",
          "Export Single Leave: Click the Export button on any record to download as CSV, JSON, or formatted Text Report.",
          "Export All Leaves: Click 'Export All (CSV)' to download full company leave history.",
        ],
      },
      {
        title: "How to Manage Onboarding & Offboarding Checklists",
        purpose: "Ensure new hires and departing staff complete required compliance and asset steps.",
        instructions: [
          "In the 'Checklists' tab, click '+ Assign Checklist', select employee, and choose Onboarding or Offboarding.",
          "Check off milestones as completed (e.g. NDA Signed, Laptop Dispatched, Slack Invited, Asset Return). The progress bar tracks completion percentage in real time.",
        ],
      },
      {
        title: "How to Store Confidential Files in Document Vault",
        purpose: "Securely store sensitive personnel documents with restricted visibility.",
        instructions: [
          "In the 'Vault' tab, click '+ Upload Document'.",
          "Input Title (e.g. 'Offer Letter - Alex Vance'), Category (Offer Letter, NDA, KPI Agreement, ID Proof), and upload the file.",
          "Select the Target Employee and toggle Restricted Access (restricts visibility to only the employee and HR/Admins). Click 'Save to Vault'.",
        ],
      },
      {
        title: "How to File & Resolve Help Desk Tickets (HR Cases)",
        purpose: "Internal employee ticketing system for payroll inquiries, IT requests, and workplace support.",
        instructions: [
          "In the 'Cases' tab, click '+ New Ticket', pick Category (Payroll, IT Support, Workplace, Benefits), select Priority (Low, Medium, High, Urgent), type Subject and Details, and submit.",
          "HR Resolution: HR staff click on open tickets to add threaded internal comments, assign ticket owners, and mark status as In Progress or Resolved.",
        ],
      },
      {
        title: "How to Conduct Appraisals & Track Probation Reviews",
        purpose: "Performance appraisal cycles tied to Key Result Areas (KRAs) and probation alerts.",
        instructions: [
          "In the 'Appraisals' tab, select the review cycle and pick an employee.",
          "Score Key Result Areas (KRAs) and competency metrics on a 1–5 scale. Add manager feedback and submit.",
          "In the 'Probation' tab, review automated alerts for employees approaching their 30, 60, or 90-day probation checkpoints.",
        ],
      },
    ],
  },
  {
    id: "goals",
    name: "Goals, OKRs & Culture",
    path: "/dashboard/goals",
    icon: "fa-bullseye",
    color: "#3b82f6",
    tag: "Performance & Culture",
    category: "HR & Culture",
    screenshot: "/screenshots/goals_okrs.png",
    screenshotCaption: "Company to Individual OKR Tracker with Numeric Progress Sliders and Peer Kudos",
    quickStats: [
      { label: "OKR Tiers", value: "4 Hierarchy Levels" },
      { label: "Surveys", value: "Anonymous Sentiment" },
      { label: "1:1 Meetings", value: "Rollover Actions" },
    ],
    description: "Align company strategy with measurable OKRs, social Kudos wall, pulse surveys, and structured 1:1 meetings.",
    steps: [
      {
        title: "How to Create & Update OKRs",
        purpose: "Set and measure strategic targets with numeric progress indicators.",
        instructions: [
          "Go to /dashboard/goals > 'OKRs' and click '+ New OKR'.",
          "Set Objective Title (e.g. 'Scale Infrastructure for 100k Users'), Level (Company, Department, Team, Individual), Deadline, and add measurable Key Results (Target Value, Current Value, Unit). Click 'Save OKR'.",
          "Updating Progress: Click on an existing OKR, drag the current value slider for any Key Result, and the status updates automatically (On Track, At Risk, Behind, Completed).",
        ],
      },
      {
        title: "How to Post Kudos on the Recognition Wall",
        purpose: "Celebrate peer contributions and promote core company values.",
        instructions: [
          "In the 'Kudos' tab, click 'Give Kudos'.",
          "Select the colleague you want to appreciate, tag a matching Company Value (Innovation, Speed, Customer First, Teamwork), write your message, and click 'Post Kudos'.",
        ],
      },
      {
        title: "How to Submit Weekly Anonymous Pulse Surveys",
        purpose: "Provide anonymous feedback on morale, support, and company culture.",
        instructions: [
          "In the 'Surveys' tab, answer the weekly check-in question by clicking 1 to 5 stars.",
          "Enter optional anonymous feedback and click 'Submit Response'. Executive leadership views aggregate score trend charts without exposing individual identities.",
        ],
      },
      {
        title: "How to Conduct 1:1 Check-In Meetings",
        purpose: "Structured manager-employee recurring check-ins with carryover action items.",
        instructions: [
          "In the '1:1 Meetings' tab, click '+ Schedule 1:1', pick your manager/report, set the date/time, and define the shared agenda.",
          "During the meeting, record meeting minutes in the notes box and add Action Items. Unchecked action items automatically roll over into your next scheduled 1:1 meeting.",
        ],
      },
    ],
  },
  {
    id: "clients",
    name: "Operation Portal, Sales & Clients",
    path: "/dashboard/clients",
    icon: "fa-list-check",
    color: "#14b8a6",
    tag: "Clients & Pipelines",
    category: "Operations & IT",
    screenshot: "/screenshots/operations_portal.png",
    screenshotCaption: "Sales Deal Pipeline Workbench with Deal Value Probability and Close Dates",
    quickStats: [
      { label: "Health Indicators", value: "Green / Amber / Red" },
      { label: "Deal Stages", value: "6 Stage Pipeline" },
      { label: "Staffing", value: "Bench & Deployed" },
    ],
    description: "Client delivery accounts, sales deals pipeline, staffing utilization grid, and external contractor directory.",
    steps: [
      {
        title: "How to Track Client Accounts & Retainer Health",
        purpose: "Monitor retainer hour burn rates, delivery health flags, and client communication histories.",
        instructions: [
          "In the 'Operations' tab, click '+ New Client Project', input Client Name, Project Name, Delivery Lead, Billing Type (e.g. 'Monthly Retainer'), and Budget Hours.",
          "Set Delivery Health: Green (On track, healthy burn rate), Amber (Approaching retainer ceiling), or Red (Over budget or critical blocker).",
          "Open any client account to log contact history entries (Calls, Emails, Meetings).",
        ],
      },
      {
        title: "How to Manage the Sales Deal Pipeline",
        purpose: "Track sales opportunities across stages with deal valuations and probability weighting.",
        instructions: [
          "In the 'Sales' tab, toggle between Kanban Board and Table View.",
          "Click '+ New Deal', enter Client Account, Deal Title, Deal Value ($/₹), Probability (%), Expected Close Date, and Deal Owner.",
          "Drag deal cards across stages: Prospecting -> Discovery -> Proposal Sent -> Negotiation -> Closed Won / Closed Lost.",
        ],
      },
      {
        title: "How to Manage Staff Resource Allocation & Bench",
        purpose: "Optimize workforce utilization and prevent employee burnout.",
        instructions: [
          "In 'HR Allocations', review staff deployment: Deployed (Fully booked), Partially Allocated (Available for tasks), Bench (Ready for new deployments), or On Leave.",
          "Click 'Edit Allocation' to adjust weekly allocated hours.",
        ],
      },
      {
        title: "How to Track External Contractors & Freelancers",
        purpose: "Manage third-party vendor relationships, contracts, and hourly spend.",
        instructions: [
          "In 'External Teams', click '+ Add Contractor', enter Name, Agency, Service Category, Assigned Project, Hourly Rate, and Currency (USD/INR).",
          "Monitor active contract durations and spend.",
        ],
      },
    ],
  },
  {
    id: "it",
    name: "IT Portal, Assets & Invoicing",
    path: "/dashboard/it",
    icon: "fa-terminal",
    color: "#f43f5e",
    tag: "Assets & Tooling",
    category: "Operations & IT",
    screenshot: "/screenshots/it_portal.png",
    screenshotCaption: "Software Access Provisioning Matrix with One-Click Suspend/Revoke Status Controls",
    quickStats: [
      { label: "Access Control", value: "1-Click Toggle" },
      { label: "Hardware Assets", value: "Asset Tag Tracking" },
      { label: "Invoicing", value: "USD & INR PDF" },
    ],
    description: "Centralized IT infrastructure: cloud storage links, software tool provisioning, SaaS costs, hardware assets, and invoices.",
    steps: [
      {
        title: "How to Register Cloud Drive & Knowledge Links",
        purpose: "Maintain a centralized catalog of all company cloud storage and tool repositories.",
        instructions: [
          "In the 'Drive Links' tab, click '+ Add Link', input Link Name (e.g. 'Figma UI Kit', 'AWS S3 Assets'), Platform, URL, Access Level, and Owner. Click 'Save Link'.",
        ],
      },
      {
        title: "How to Provision Software Licenses & Access Matrix",
        purpose: "Grant, track, and audit software tool licenses with instant status toggling.",
        instructions: [
          "In the 'Access Matrix' tab, click '+ Grant Access', choose Employee, Software Tool (GitHub, AWS, Slack, Figma), Category, Access Level (Admin, Member, Read-Only), and Date Granted. Click 'Save Access Record'.",
          "One-Click Status Toggle: Click on an employee's status badge in the table to cycle through Active -> Suspended -> Revoked.",
          "Search & Audit: Filter by category or status to audit software permissions.",
        ],
      },
      {
        title: "How to Track SaaS Subscriptions & Spending",
        purpose: "Monitor recurring software costs and receive 14-day renewal alerts.",
        instructions: [
          "In the 'Subscriptions' tab, click '+ New Subscription', enter Tool Name, Plan Tier, Monthly Cost, Seats Purchased, and Renewal Date.",
          "The system alerts you 14 days before any upcoming renewal.",
        ],
      },
      {
        title: "How to Track Hardware & Device Inventory",
        purpose: "Maintain an asset inventory of physical laptops, monitors, and devices.",
        instructions: [
          "In the 'Devices' tab, click '+ Register Device', enter Asset Tag (e.g. 'MAC-2026-084'), Device Type, Brand, Model, OS, Condition (Excellent, Good, Fair, Poor), and Assigned Employee. Click 'Save Device'.",
        ],
      },
      {
        title: "How to Generate & Export Client Invoices (PDF/Print)",
        purpose: "Create itemized invoices with tax calculations in USD/INR and export client-ready PDFs.",
        instructions: [
          "In the 'Invoices' tab, click '+ Create Invoice'.",
          "Enter Invoice Number, Due Date, Billed-To Client Name, Address, and Email.",
          "Add itemized service lines (Description, Quantity, Unit Price).",
          "Select Tax Rate (%) and Currency (USD or INR).",
          "Click 'Generate Invoice', then click 'Print / Download PDF' to export a clean invoice.",
        ],
      },
    ],
  },
  {
    id: "analytics",
    name: "Analytics & Security Audit Logs",
    path: "/dashboard/analytics",
    icon: "fa-chart-line",
    color: "#a855f7",
    tag: "Intelligence & Auditing",
    category: "Operations & IT",
    screenshot: "/screenshots/analytics_logs.png",
    screenshotCaption: "Executive Analytics Overview: Total Logged Hours, Billable Ratio, and Project Breakdown",
    quickStats: [
      { label: "Metrics", value: "Billable % & Effort" },
      { label: "Audit Verbs", value: "CREATE, UPDATE, DELETE" },
      { label: "Retention", value: "Workspace History" },
    ],
    description: "Billability ratios, manager productivity dashboards, and enterprise-grade audit trail.",
    steps: [
      {
        title: "How to Analyze Billable vs. Non-Billable Effort",
        purpose: "Examine workforce productivity and project profit margins.",
        instructions: [
          "In the 'Overview' tab, inspect the Billable Ratio Meter and Project Hours Distribution Bar Chart to evaluate profit margins.",
        ],
      },
      {
        title: "How to View Manager & Department Insights",
        purpose: "Check timesheet submission compliance rates and average hours logged across departments.",
        instructions: [
          "In the 'Manager' tab, check team-by-team timesheet submission compliance rates and average hours logged.",
        ],
      },
      {
        title: "How to Filter & Audit System Activity Logs",
        purpose: "Conduct security and compliance audits across all workspace changes.",
        instructions: [
          "In the 'Audit Trail' tab, type keywords into the search box to locate specific events.",
          "Filter by Action Type (Role changes, user creation, leave approvals, document updates, invoice generations), Verb (CREATE, UPDATE, DELETE), Timeframe (Today, Last 7 Days, Last 30 Days), or target User.",
        ],
      },
    ],
  },
  {
    id: "referrals",
    name: "Candidate Referral Pipeline",
    path: "/dashboard/referrals",
    icon: "fa-link",
    color: "#0ea5e9",
    tag: "Talent Acquisition",
    category: "HR & Culture",
    screenshot: "/screenshots/referral_pipeline.png",
    screenshotCaption: "Candidate Referral Pipeline Kanban Board with Reward Bounty Tracking",
    quickStats: [
      { label: "Stages", value: "Submitted to Paid" },
      { label: "Bounties", value: "Custom Reward Value" },
      { label: "Payout Sync", value: "Approval Workflow" },
    ],
    description: "Employee candidate referral engine with reward tracking and interview pipeline stages.",
    steps: [
      {
        title: "How to Submit a Candidate Referral",
        purpose: "Refer candidates with resume links and earn reward bounties upon hiring.",
        instructions: [
          "Navigate to /dashboard/referrals and click '+ Refer Candidate'.",
          "Enter Candidate Name, Email, Phone Number, Target Job Role, Department, Experience, Resume URL, and eligible Reward Bounty (e.g. $500).",
          "Click 'Submit Referral'. The card appears in the 'Submitted' column.",
        ],
      },
      {
        title: "How to Track Interview Stages & Reward Payouts",
        purpose: "Recruiters manage candidate hiring pipelines and trigger referral bonus disbursements.",
        instructions: [
          "Recruiters drag candidate cards through stages: Submitted -> Interviewing -> Hired -> Paid (or Rejected).",
          "When marked Hired, the payout status becomes Approved. Upon payout disbursement, HR updates payout status to Paid with payment timestamp.",
        ],
      },
    ],
  },
  {
    id: "settings",
    name: "Settings, RBAC & Work Shifts",
    path: "/dashboard/settings",
    icon: "fa-gear",
    color: "#64748b",
    tag: "Administration & RBAC",
    category: "Core",
    screenshot: "/screenshots/settings_security.png",
    screenshotCaption: "Granular Role & Module Permission Matrix with Custom Security Policies",
    quickStats: [
      { label: "Security", value: "Session & Password" },
      { label: "RBAC Matrix", value: "Per Module Custom" },
      { label: "Shifts", value: "Custom Timings" },
    ],
    description: "Personal preferences, security controls, granular role permission matrix, work shifts, and billing tier.",
    steps: [
      {
        title: "How to Update Your Profile & Socials",
        purpose: "Keep your personal information, skills, and contact links up to date.",
        instructions: [
          "In the 'Profile' tab, update your Name, Phone, Bio, and Skills.",
          "Add your social profiles (LinkedIn, Twitter, GitHub, Website).",
          "Click 'Upload Photo' to update your avatar and click 'Save Changes'.",
        ],
      },
      {
        title: "How to Change Account Password",
        purpose: "Update your authentication credentials securely.",
        instructions: [
          "In the 'Security' tab, enter Current Password, New Password, and Confirm New Password. Click 'Update Password'.",
        ],
      },
      {
        title: "How Admins Manage Users (Invite / Change Roles / Deactivate)",
        purpose: "Manage workspace user accounts and active/deactivated statuses.",
        instructions: [
          "In the 'Users' tab (Admin Only), click '+ Invite User', enter email, name, and role.",
          "Change Role: Click the role dropdown on any user row to switch between Employee, Manager, HR, OPS, or Admin.",
          "Deactivate User: Click the status toggle button to deactivate or reactivate accounts.",
        ],
      },
      {
        title: "How Admins Customize Role-Based Module Permissions",
        purpose: "Configure granular permissions per role for every module in the CRM.",
        instructions: [
          "In the 'Permissions' tab (Admin Only), review the matrix grid: Roles on one axis and Modules on the other.",
          "Toggle checkboxes on/off to grant or restrict access to any module.",
          "Click 'Save Permission Matrix'.",
        ],
      },
      {
        title: "How to Configure Shift Timings & Grace Periods",
        purpose: "Define default working shift hours and attendance rules.",
        instructions: [
          "In the 'Shifts' tab, set Standard Shift Start Time (e.g. 09:00 AM), Shift End Time (e.g. 06:00 PM), and Grace Period (e.g. 15 mins).",
          "Click 'Save Shift Rules'.",
        ],
      },
      {
        title: "How to Manage Company SaaS Billing & Subscriptions",
        purpose: "Manage company workspace subscription tiers and user seat capacity.",
        instructions: [
          "In the 'Subscription' tab, review your current plan tier (Starter, Growth, Enterprise), allocated user seats, and renewal date.",
          "Click 'Upgrade Plan' to adjust seat capacities or unlock enterprise tools.",
        ],
      },
    ],
  },
];

/* ── New data additions ── */

const FAQ_ITEMS = [
  {
    q: "How do I reset my password?",
    a: "Navigate to /dashboard/settings → Security tab. Enter your current password, then your new password twice, and click 'Update Password'. If you've forgotten your password entirely, contact your Admin to deactivate and re-invite your account from Settings → Users.",
  },
  {
    q: "How do I invite a team member?",
    a: "Go to /dashboard/team and click '+ Add Employee'. Fill in their name, work email, role, and department, then click 'Create Employee'. An auto-generated temporary password appears — click 'Copy Credentials' to share it. They'll be prompted to set their own password on first login.",
  },
  {
    q: "What roles are available and what can each one do?",
    a: "NexAce CRM has 5 roles: Admin (full workspace control), OPS / Sub Admin (client delivery & IT assets), Manager (team oversight & approvals), HR (people operations & onboarding), and Employee (daily tasks, timesheets, referrals). Admins can customize exactly which modules each role can access via Settings → Permissions.",
  },
  {
    q: "How do timesheets get approved?",
    a: "Employees submit timesheets via Calendar → Timesheets → 'Submit for Approval'. Their manager sees the pending submission under 'Pending Team Submissions' and clicks Approve or Reject with optional feedback. Approved timesheets are locked and feed into payroll & billing calculations.",
  },
  {
    q: "Can I export data from NexAce CRM?",
    a: "Yes — multiple modules support data export. Attendance logs export as CSV from Calendar → Attendance. Leave records support CSV, JSON, and formatted Text export. Invoices can be printed or downloaded as PDF from the IT Portal. Analytics data is also downloadable.",
  },
  {
    q: "Is my company's data isolated from other organizations?",
    a: "Absolutely. NexAce CRM uses enterprise-grade multi-tenant architecture where each company workspace has its own isolated database partition. Your employees, projects, messages, files, and configurations are never visible to any other tenant organization.",
  },
  {
    q: "How do I give an employee access to a tool (GitHub, AWS, etc.)?",
    a: "Go to /dashboard/it → Access Matrix tab → click '+ Grant Access'. Select the employee, choose the software tool, set the access level (Admin, Member, or Read-Only), and save. You can one-click toggle their status between Active, Suspended, and Revoked at any time from the same table.",
  },
];

const QUICK_START_STEPS = [
  {
    number: "01",
    icon: "fa-building",
    color: "#6366f1",
    title: "Register Your Workspace",
    desc: "Create your isolated company workspace with your company name, admin email, and a secure password.",
    anchor: null as string | null,
    link: "/register" as string | null,
    cta: "Go to Register",
  },
  {
    number: "02",
    icon: "fa-users",
    color: "#06b6d4",
    title: "Add Your Team",
    desc: "Onboard employees individually or bulk-import entire departments with roles & reporting lines.",
    anchor: "team" as string | null,
    link: null as string | null,
    cta: "View Team Module",
  },
  {
    number: "03",
    icon: "fa-shield-halved",
    color: "#10b981",
    title: "Set Roles & Permissions",
    desc: "Configure the granular role-based permission matrix so each role only sees what they need.",
    anchor: "settings" as string | null,
    link: null as string | null,
    cta: "View Settings",
  },
  {
    number: "04",
    icon: "fa-rocket",
    color: "#f59e0b",
    title: "Launch Your First Project",
    desc: "Create a Kanban project, assign tasks to your team, and link them to an agile sprint.",
    anchor: "projects" as string | null,
    link: null as string | null,
    cta: "View Projects",
  },
];

const CATEGORY_SUMMARIES = [
  {
    name: "Core" as const,
    icon: "fa-gauge-high",
    color: "#6366f1",
    desc: "Dashboard, Team, Chat, Settings",
    moduleIds: ["overview", "team", "chat", "settings"],
  },
  {
    name: "Agile & Projects" as const,
    icon: "fa-diagram-project",
    color: "#10b981",
    desc: "Calendar, Sprints, Kanban, Gantt",
    moduleIds: ["calendar", "projects"],
  },
  {
    name: "HR & Culture" as const,
    icon: "fa-heart-pulse",
    color: "#8b5cf6",
    desc: "HR Portal, Goals, Referrals",
    moduleIds: ["hr", "goals", "referrals"],
  },
  {
    name: "Operations & IT" as const,
    icon: "fa-server",
    color: "#f43f5e",
    desc: "Clients, IT Assets, Analytics",
    moduleIds: ["clients", "it", "analytics"],
  },
];

function getReadingTime(steps: StepItem[]): string {
  const totalWords = steps.reduce((acc, s) => {
    return (
      acc +
      s.instructions.join(" ").split(" ").length +
      (s.purpose?.split(" ").length ?? 0) +
      s.title.split(" ").length
    );
  }, 0);
  return `~${Math.max(1, Math.ceil(totalWords / 220))} min read`;
}


export default function GuidePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const [copiedAnchor, setCopiedAnchor] = useState<string | null>(null);

  const categories = ["All", "Core", "Agile & Projects", "HR & Culture", "Operations & IT"];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setScrollProgress(progress);
      setShowScrollTop(scrollTop > 300);

      // Determine active module based on viewport position
      let currentSection = MODULES[0].id;
      for (const m of MODULES) {
        const el = document.getElementById(m.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // When top of the module enters upper viewport (<= 240px from top)
          if (rect.top <= 240) {
            currentSection = m.id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initialize on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleNavClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSidebarOpen(false);
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const copyAnchorLink = useCallback((moduleId: string) => {
    const url = `${window.location.origin}/guide#${moduleId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedAnchor(moduleId);
      setTimeout(() => setCopiedAnchor(null), 2000);
    }).catch(() => {});
  }, []);

  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      const matchesCat = selectedCategory === "All" || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;
      const matchesSearch =
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.steps.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.purpose && s.purpose.toLowerCase().includes(q)) ||
            s.instructions.some((ins) => ins.toLowerCase().includes(q))
        );
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className={styles.container}>
      {/* Scroll Progress Bar */}
      <div className={styles.progressBar} style={{ width: `${scrollProgress}%` }} />

      {/* Ambient background glows */}
      <div className={styles.orb1} aria-hidden />
      <div className={styles.orb2} aria-hidden />

      {/* Header Navigation */}
      <header className={styles.header}>
        <div className={styles.logoSection}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={styles.mobileSidebarToggle}
            aria-label="Toggle Side Menu"
          >
            <i className="fa-solid fa-bars" />
          </button>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logoIcon}>
              <i className="fa-solid fa-gem" />
            </span>
            <span className={styles.logoText}>
              NexAce <span className={styles.logoCRM}>CRM</span>
            </span>
          </Link>
          <span className={styles.guideBadge}>
            <i className="fa-solid fa-book-open" /> Docs v2.0
          </span>
        </div>
        <nav className={styles.nav}>
          <ThemeToggle />
          <Link href="/" className={styles.navLink}>
            <i className="fa-solid fa-house" /> Home
          </Link>
          <Link href="/login" className={styles.navLink}>
            <i className="fa-solid fa-right-to-bracket" /> Sign In
          </Link>
          <Link href="/dashboard" className={styles.btnPrimary}>
            <i className="fa-solid fa-gauge-high" /> Enter Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Full Operational User Manual &amp; Feature Guide
        </div>
        <h1 className={styles.title}>
          Master <span className={styles.titleHighlight}>NexAce CRM</span>
          <br />
          in Minutes
        </h1>
        <p className={styles.subtitle}>
          Step-by-step operational workflows, button-by-button actions, and live UI screenshots
          for every tool and module in NexAce CRM.
        </p>

        {/* Hero Stats Strip */}
        <div className={styles.heroStats}>
          {[
            { icon: "fa-cubes", value: "13", label: "Modules" },
            { icon: "fa-wand-magic-sparkles", value: "50+", label: "Features" },
            { icon: "fa-users-gear", value: "5", label: "User Roles" },
            { icon: "fa-building-columns", value: "\u221e", label: "Workspaces" },
          ].map((stat) => (
            <div key={stat.label} className={styles.heroStat}>
              <i className={`fa-solid ${stat.icon}`} />
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Live Search & Filter Bar */}
        <div className={styles.searchBarWrapper}>
          <div className={styles.searchBox}>
            <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, buttons, or workflows (e.g. 'timesheets', 'clock-in', 'access matrix')..."
              className={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className={styles.clearSearchBtn}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          <div className={styles.categoryPills}>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`${styles.categoryPill} ${selectedCategory === c ? styles.categoryPillActive : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category Overview Cards */}
      <section className={styles.categoryOverview}>
        <div className={styles.categoryOverviewGrid}>
          {CATEGORY_SUMMARIES.map((cat) => {
            const count = MODULES.filter((m) => cat.moduleIds.includes(m.id)).length;
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                className={`${styles.categoryOverviewCard} ${isActive ? styles.categoryOverviewCardActive : ""}`}
                onClick={() => setSelectedCategory(isActive ? "All" : cat.name)}
                style={{ "--cat-color": cat.color } as React.CSSProperties}
              >
                <div
                  className={styles.categoryOverviewIcon}
                  style={{ background: cat.color + "18", color: cat.color }}
                >
                  <i className={`fa-solid ${cat.icon}`} />
                </div>
                <div className={styles.categoryOverviewMeta}>
                  <span className={styles.categoryOverviewName}>{cat.name}</span>
                  <span className={styles.categoryOverviewDesc}>{cat.desc}</span>
                </div>
                <span className={styles.categoryOverviewCount} style={{ color: cat.color }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Content Layout with Left Sidebar Menu */}
      <div className={styles.guideLayout}>
        {/* Left Sticky Sidebar Navigation */}
        <aside className={`${styles.sideMenu} ${sidebarOpen ? styles.sideMenuOpen : ""}`}>
          <div className={styles.sideMenuHeader}>
            <span className={styles.sideMenuTitle}>
              <i className="fa-solid fa-compass" /> Feature Navigation
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className={styles.closeSidebarBtn}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className={styles.sideMenuNav}>
            <div className={styles.sideMenuSectionTitle}>WORKSPACE MODULES</div>
            {MODULES.map((m, idx) => (
              <a
                key={m.id}
                href={`#${m.id}`}
                onClick={(e) => handleNavClick(e, m.id)}
                className={`${styles.sideMenuItem} ${activeSection === m.id ? styles.sideMenuItemActive : ""}`}
                style={{
                  "--active-accent": m.color,
                } as React.CSSProperties}
              >
                <div className={styles.sideMenuIcon} style={{ color: m.color, background: m.color + "18" }}>
                  <i className={`fa-solid ${m.icon}`} />
                </div>
                <div className={styles.sideMenuMeta}>
                  <span className={styles.sideMenuItemName}>{m.name}</span>
                  <span className={styles.sideMenuItemTag}>{m.category}</span>
                </div>
                <span className={styles.sideMenuIndex}>0{idx + 1}</span>
              </a>
            ))}

            <div className={styles.sideMenuDivider} />

            <div className={styles.sideMenuSectionTitle}>QUICK ACTIONS</div>
            <Link href="/dashboard" className={styles.sideMenuQuickLink}>
              <i className="fa-solid fa-gauge-high" /> Open Dashboard
            </Link>
            <Link href="/register" className={styles.sideMenuQuickLink}>
              <i className="fa-solid fa-building" /> Create Workspace
            </Link>
            <button onClick={scrollToTop} className={styles.sideMenuQuickLink}>
              <i className="fa-solid fa-arrow-up" /> Back to Top
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            className={styles.sidebarBackdrop}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Right Main Content Area */}
        <main className={styles.mainContent}>

          {/* ── Quick Start Section ── */}
          <section className={styles.quickStartSection}>
            <div className={styles.quickStartHeader}>
              <span className={styles.quickStartLabel}>
                <i className="fa-solid fa-flag" /> Getting Started
              </span>
              <h2 className={styles.quickStartTitle}>New to NexAce CRM?</h2>
              <p className={styles.quickStartSubtitle}>
                Follow these 4 steps to get your team fully operational in under 10 minutes.
              </p>
            </div>
            <div className={styles.quickStartGrid}>
              {QUICK_START_STEPS.map((step) => (
                <div
                  key={step.number}
                  className={styles.quickStartCard}
                  style={{ "--qs-color": step.color } as React.CSSProperties}
                  onClick={() => {
                    if (step.link) {
                      window.location.href = step.link;
                    } else if (step.anchor) {
                      document.getElementById(step.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (step.link) window.location.href = step.link;
                      else if (step.anchor) document.getElementById(step.anchor)?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                >
                  <div className={styles.quickStartNum} style={{ color: step.color }}>
                    {step.number}
                  </div>
                  <div className={styles.quickStartIcon} style={{ background: step.color + "18", color: step.color }}>
                    <i className={`fa-solid ${step.icon}`} />
                  </div>
                  <h3 className={styles.quickStartCardTitle}>{step.title}</h3>
                  <p className={styles.quickStartCardDesc}>{step.desc}</p>
                  <span className={styles.quickStartArrow} style={{ color: step.color }}>
                    {step.cta} <i className="fa-solid fa-arrow-right" />
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Role Architecture Callout ── */}
          <section className={styles.roleSection}>
            <div className={styles.roleHeader}>
              <i className="fa-solid fa-shield-halved" />
              <h2>Role-Based Capabilities Overview</h2>
            </div>
            <p className={styles.roleDesc}>
              Access permissions and dashboards adapt dynamically based on your assigned workspace role.
            </p>
            <div className={styles.roleGrid}>
              {[
                {
                  role: "Admin",
                  color: "#6366f1",
                  icon: "fa-crown",
                  desc: "Unrestricted workspace control, user invitations, role permission matrix, SaaS billing, and security audit logs.",
                },
                {
                  role: "Sub Admin / OPS",
                  color: "#06b6d4",
                  icon: "fa-user-tie",
                  desc: "Client project delivery, sales pipeline deals, resource staffing bench, IT asset inventory, and shift oversight.",
                },
                {
                  role: "Manager",
                  color: "#10b981",
                  icon: "fa-user-check",
                  desc: "Timesheet review & sign-offs, sprint progress tracking, 1:1 check-in meeting agendas, and team appraisals.",
                },
                {
                  role: "HR",
                  color: "#ec4899",
                  icon: "fa-briefcase",
                  desc: "Onboarding & exit checklists, leave approvals, document vaulting, help desk ticketing, and company pulse surveys.",
                },
                {
                  role: "Employee",
                  color: "#f59e0b",
                  icon: "fa-user",
                  desc: "Daily clock-in/out work timer, task execution, weekly timesheet logging, peer kudos, and candidate referrals.",
                },
              ].map((r) => (
                <div key={r.role} className={styles.roleCard}>
                  <div className={styles.roleIconWrap} style={{ background: r.color + "18", color: r.color }}>
                    <i className={`fa-solid ${r.icon}`} />
                  </div>
                  <h3 className={styles.roleTitle}>{r.role}</h3>
                  <p className={styles.roleCardDesc}>{r.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Modules Detailed Step-by-Step Breakdown */}
          <section className={styles.modulesSection}>
            <div className={styles.sectionHeading}>
              <span className={styles.sectionTag}>
                <i className="fa-solid fa-list-ol" /> Visual Walkthroughs & Action Items
              </span>
              <h2 className={styles.sectionTitle}>Click-by-Click Instructions</h2>
              <p className={styles.sectionSubtitle}>
                Showing {filteredModules.length} of {MODULES.length} modules. Follow the illustrated screenshots and exact instructions.
              </p>
            </div>

            {filteredModules.length === 0 ? (
              <div className={styles.noResultsBox}>
                <i className="fa-solid fa-circle-question text-3xl mb-2 opacity-50" />
                <h3>No matching features found</h3>
                <p>Try searching for a different keyword or reset the category filter.</p>
                <button onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className={styles.resetBtn}>
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className={styles.moduleList}>
                {filteredModules.map((mod, idx) => (
                  <article key={mod.id} id={mod.id} className={styles.moduleCard}>
                    <div className={styles.moduleHeader}>
                      <div className={styles.moduleIconBox} style={{ background: mod.color + "18", color: mod.color }}>
                        <i className={`fa-solid ${mod.icon}`} />
                      </div>
                      <div className={styles.moduleMeta}>
                        <div className={styles.moduleTopRow}>
                          <span className={styles.moduleIndex}>0{idx + 1}</span>
                          <span
                            className={styles.moduleTag}
                            style={{ color: mod.color, borderColor: mod.color + "33", background: mod.color + "11" }}
                          >
                            {mod.tag}
                          </span>
                          <code className={styles.moduleRoute}>{mod.path}</code>
                          <span className={styles.readingTime}>
                            <i className="fa-regular fa-clock" /> {getReadingTime(mod.steps)}
                          </span>
                        </div>
                        <div className={styles.moduleNameRow}>
                          <h3 className={styles.moduleName}>{mod.name}</h3>
                          <button
                            className={`${styles.anchorBtn} ${copiedAnchor === mod.id ? styles.anchorBtnCopied : ""}`}
                            onClick={() => copyAnchorLink(mod.id)}
                            title="Copy link to this section"
                            aria-label="Copy anchor link"
                          >
                            {copiedAnchor === mod.id ? (
                              <><i className="fa-solid fa-check" /> Copied!</>
                            ) : (
                              <><i className="fa-solid fa-link" /> Share</>
                            )}
                          </button>
                        </div>
                        <p className={styles.moduleDescription}>{mod.description}</p>
                      </div>
                    </div>

                    {/* Quick Feature Stats Pills */}
                    {mod.quickStats && (
                      <div className={styles.quickStatsRow}>
                        {mod.quickStats.map((st) => (
                          <div key={st.label} className={styles.quickStatPill}>
                            <span className={styles.quickStatLabel}>{st.label}:</span>
                            <strong className={styles.quickStatVal}>{st.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Screenshot Preview Showcase */}
                    {mod.screenshot && (
                      <div className={styles.screenshotWrapper}>
                        <div className={styles.screenshotFrame}>
                          <div className={styles.screenshotTopBar}>
                            <span className={styles.browserDot} style={{ background: "#ff5f56" }} />
                            <span className={styles.browserDot} style={{ background: "#ffbd2e" }} />
                            <span className={styles.browserDot} style={{ background: "#27c93f" }} />
                            <span className={styles.browserAddress}>localhost:3000{mod.path}</span>
                          </div>
                          <div className={styles.screenshotImageContainer}>
                            <Image
                              src={mod.screenshot}
                              alt={`${mod.name} Screenshot`}
                              width={1200}
                              height={675}
                              className={styles.screenshotImage}
                              unoptimized
                            />
                          </div>
                        </div>
                        {mod.screenshotCaption && (
                          <div className={styles.screenshotCaption}>
                            <i className="fa-solid fa-camera" /> {mod.screenshotCaption}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step-by-Step Action Items */}
                    <div className={styles.stepsContainer}>
                      {mod.steps.map((st, sIdx) => (
                        <div key={st.title} className={styles.stepBlock}>
                          <div className={styles.stepHeader}>
                            <span className={styles.stepNumberBadge} style={{ background: mod.color }}>
                              {sIdx + 1}
                            </span>
                            <div className={styles.stepHeaderMain}>
                              <h4 className={styles.stepHeading}>{st.title}</h4>
                              {st.purpose && <p className={styles.stepPurpose}>{st.purpose}</p>}
                            </div>
                            {st.hotkey && (
                              <span className={styles.hotkeyTag}>
                                <i className="fa-solid fa-keyboard" /> {st.hotkey}
                              </span>
                            )}
                          </div>
                          <ol className={styles.instructionList}>
                            {st.instructions.map((inst, iIdx) => (
                              <li key={iIdx} className={styles.instructionItem}>
                                <span className={styles.instructionBullet} style={{ borderColor: mod.color }} />
                                <span>{inst}</span>
                              </li>
                            ))}
                          </ol>
                          {st.tip && (
                            <div className={styles.tipBox}>
                              <i className="fa-solid fa-lightbulb" />
                              <span><strong>Pro Tip:</strong> {st.tip}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className={styles.moduleFooter}>
                      <Link href={mod.path} className={styles.openModuleBtn} style={{ background: mod.color }}>
                        <span>Launch {mod.name}</span>
                        <i className="fa-solid fa-arrow-right" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ── FAQ Section ── */}
          <section className={styles.faqSection}>
            <div className={styles.faqHeader}>
              <span className={styles.sectionTag}>
                <i className="fa-solid fa-circle-question" /> Frequently Asked Questions
              </span>
              <h2 className={styles.sectionTitle}>Common Questions</h2>
              <p className={styles.sectionSubtitle}>
                Quick answers to the most common questions about using NexAce CRM.
              </p>
            </div>
            <div className={styles.faqList}>
              {FAQ_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className={`${styles.faqItem} ${openFaqIdx === idx ? styles.faqItemOpen : ""}`}
                >
                  <button
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                    aria-expanded={openFaqIdx === idx}
                  >
                    <span>{item.q}</span>
                    <i className={`fa-solid ${openFaqIdx === idx ? "fa-minus" : "fa-plus"}`} />
                  </button>
                  {openFaqIdx === idx && (
                    <div className={styles.faqAnswer}>
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>

      {/* Floating Scroll To Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={styles.scrollTopButton}
          aria-label="Scroll to top"
          title="Back to Top"
        >
          <i className="fa-solid fa-arrow-up" />
        </button>
      )}

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaInner}>
          <span className={styles.ctaBadge}>
            <i className="fa-solid fa-sparkles" /> Ready to Get Started?
          </span>
          <h2 className={styles.ctaTitle}>Experience the Next Generation CRM</h2>
          <p className={styles.ctaSubtitle}>
            Consolidate your operations into one unified, beautifully crafted workspace.
          </p>
          <div className={styles.ctaButtonGroup}>
            <Link href="/dashboard" className={styles.btnHero}>
              <i className="fa-solid fa-bolt" /> Go to Dashboard
            </Link>
            <Link href="/register" className={styles.btnGhost}>
              <i className="fa-solid fa-building" /> Create New Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <i className="fa-solid fa-gem" /> NexAce CRM
        </div>
        <span className={styles.footerCopy}>
          © {new Date().getFullYear()} NexAce CRM · All rights reserved
        </span>
        <div className={styles.footerLinks}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/guide" className={styles.footerLink}>User Guide</Link>
          <Link href="/login" className={styles.footerLink}>Sign In</Link>
          <Link href="/dashboard" className={styles.footerLink}>Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
