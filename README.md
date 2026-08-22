# NexAce CRM — Complete User & Feature Guide

NexAce CRM is an enterprise-grade, multi-tenant workspace management platform combining **HRMS, Operations & Client Delivery, IT Asset Management, Project Management, Real-Time Communications, Analytics, Goals/OKRs, and Referral Tracking** into a unified dashboard.

---

## 📑 Table of Contents
1. [Platform Architecture & Roles](#1-platform-architecture--roles)
2. [Authentication & Workspace Access](#2-authentication--workspace-access)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Team & Organization (`/dashboard/team`)](#4-team--organization)
5. [Calendar, Sprints & Time (`/dashboard/calendar`)](#5-calendar-sprints--time)
6. [Projects, Wiki & Drive (`/dashboard/projects`)](#6-projects-wiki--drive)
7. [Communication Hub (`/dashboard/chat`)](#7-communication-hub)
8. [HR Portal (`/dashboard/hr`)](#8-hr-portal)
9. [Goals, OKRs & Culture (`/dashboard/goals`)](#9-goals-okrs--culture)
10. [Operation Portal (`/dashboard/clients`)](#10-operation-portal)
11. [IT Portal & Assets (`/dashboard/it`)](#11-it-portal--assets)
12. [Analytics & Audit Logs (`/dashboard/analytics`)](#12-analytics--audit-logs)
13. [Referral Pipeline (`/dashboard/referrals`)](#13-referral-pipeline)
14. [Settings & Security (`/dashboard/settings`)](#14-settings--security)
15. [API Reference & Integrations](#15-api-reference--integrations)

---

## 1. Platform Architecture & Roles

NexAce CRM implements multi-tenant data isolation. Each company workspace operates independently with dedicated datasets, employees, departments, and custom permission policies.

### User Roles
- **Admin**: Full workspace authority (Billing, System Settings, Permissions, Audits, Deletions, User Provisioning).
- **Sub Admin / OPS**: Full operational management (Projects, Clients, Invoices, IT Resources, Shifts, Team Overviews).
- **Manager**: Team oversight, project approvals, timesheet sign-offs, 1:1 meeting tracking, and appraisals.
- **HR**: Employee lifecycle, onboarding/offboarding, leave requests, document vault, case management, and pulse surveys.
- **Employee**: Self-service portal (Check-in/out, Timesheets, Assigned Tasks, Wiki, Leaves, Kudos, Referrals, Profile).

---

## 2. Authentication & Workspace Access

### Login & Registration
1. Navigate to `/login` or `/register`.
2. **Registration**: Create a new tenant workspace or join an existing company using an invite link or admin invitation.
3. **Session Management**: Secure cookie-based session with automatic timeout and refresh protection.
4. **Email Verification & Password Security**: Verification OTP for email modifications and strong password enforcement (or automated secure password generator).

---

## 3. Dashboard Overview (`/dashboard`)

The main dashboard provides high-level executive cards and widgets tailored to the logged-in user:
- **Key Metrics**: Active projects, direct team members, pending leave requests, unread chats, and open tasks.
- **Live Clock-In Widget**: Quick one-click check-in/out with a live timer showing daily logged time.
- **Shift & Attendance Card**: Shows current assigned shift hours and status.
- **Recent Announcements**: Pinned company-wide updates.
- **Quick Links**: Fast navigation to projects, help desk tickets, or timesheet logging.

---

## 4. Team & Organization (`/dashboard/team`)

Manage your workspace directory, organizational structure, departments, and employee profiles.

### 4.1 Team Directory
- **Grid & List Views**: Switch between responsive card tiles and detailed data tables.
- **Filters & Search**: Instant real-time search by name/email, and filter by Department or Role.
- **Add Employee**:
  - **Single Employee**: Click **"Add Employee"**, fill in name, email, department, role, manager, and skills. Generates a temporary password.
  - **Bulk Import**: Click **"Bulk Add"** to input multiple employees at once with assigned roles and departments.
- **Bulk Actions**: Select multiple members using checkboxes to bulk-assign departments or delete accounts.

### 4.2 Org Chart
- **Visual Hierarchy**: Dynamic organizational tree rendering reporting lines from top executives down to direct reports.
- **Interactive Navigation**: Zoom in/out, pan, and expand/collapse branches.
- **Direct Reassignment**: Reassign managers directly within the chart hierarchy.

### 4.3 Manager Dashboard
- Quick view of direct reports, attendance status, open tasks, pending timesheet reviews, and KPI scores.

### 4.4 Department Management
- Create, edit, and delete departments.
- Assign Department Heads / Managers and generate standardized department codes (e.g., `ENG`, `OPS`, `MKT`).
- View all members currently assigned to a department.

---

## 5. Calendar, Sprints & Time (`/dashboard/calendar`)

### 5.1 Team Calendar
- **Event Types**: Meetings, Company Holidays, Birthdays, Project Deadlines, and Personal Reminders.
- **Filtering**: View events by department or event category.
- **Schedule Event**: Click any date cell or click **"+ New Event"** to set title, type, start/end timestamps, and target departments.

### 5.2 Sprints
- **Sprint Management**: Create active/upcoming development sprints with custom start/end dates and sprint goals.
- **Task Linkage**: Track task completion percentages and burndown progress within each sprint cycle.

### 5.3 Timesheets
- **Weekly Timesheet Grid**: Enter daily hours (Monday–Friday/Sunday) categorized by Project and Task.
- **Billable vs. Non-Billable**: Tag hours as billable for client invoice calculation.
- **Submit for Approval**: Submit timesheets to managers. Managers can **Approve** or **Reject** with comments.

### 5.4 Shift Planning & Live Attendance
- **Clock-In / Clock-Out**: Real-time attendance timer with geo-aware IST date stamps.
- **Break Tracking**: Log break intervals and calculate net productive hours.
- **Attendance History**: View past attendance records with export to CSV/JSON.
- **Admin Hours Summary**: Filter by date range or department to audit overtime, total hours, and late logins across the organization.

---

## 6. Projects, Wiki & Drive (`/dashboard/projects`)

### 6.1 Project Management & Kanban
- **Board Columns**: `Planning`, `In Progress`, `Under Review`, `Completed`, and `On Hold`.
- **Drag & Drop Tasks**: Move task cards seamlessly across stages.
- **Task Details**: Set assignees, priority (`Low`, `Medium`, `High`, `Critical`), due date, sprint linkage, subtasks, and attachments.
- **Filter by Project**: Switch between workspace projects or view a consolidated multi-project task feed.

### 6.2 Gantt / Timeline View
- Visual horizontal timeline tracking project milestones, phase dependencies, and deliverable dates.

### 6.3 Collaborative Wiki & SOPs
- **Knowledge Base**: Store company policies, Standard Operating Procedures (SOPs), brand assets, and API specs.
- **Categories**: Filter articles by `Engineering`, `Operations`, `HR`, `Support`, or `General`.
- **Article Creation**: Rich text markdown editor with author attribution and last-edited timestamps.

### 6.4 Workspace Drive (File Storage)
- **Folder Navigation**: Create folders, organize documents, and manage path structures.
- **File Upload & Preview**: Upload images, PDFs, spreadsheets, and zip archives with built-in preview modal.
- **Batch Operations**: Multi-select files for batch download or deletion.

### 6.5 Workload & Resource Allocation
- Visual heatmap showing team member capacity, allocated hours, and overload warnings.

---

## 7. Communication Hub (`/dashboard/chat`)

### 7.1 Direct Messages & Channels
- **Public & Private Channels**: Join `#general`, `#engineering`, `#marketing`, etc., or create custom project channels.
- **Direct Messages (1:1)**: Instant messaging with team members with unread counters and presence status.
- **Chat Features**:
  - Threaded replies.
  - Emoji reactions (`👍`, `❤️`, `🔥`, `🚀`, `😊`, `👏`).
  - File attachments (images, PDFs, documents).
  - Pin important direct messages to the top.
  - Message deletion ("Delete for me" or "Delete for everyone").

### 7.2 Mail Center
- Integrated webmail interface with `Inbox`, `Sent`, `Starred`, and `Drafts`.
- Read client emails, compose responses, and link client inquiries directly to CRM tickets.

### 7.3 WhatsApp Business Panel
- Manage client communication threads through the WhatsApp Business API interface.
- Filter conversations by status: `Active`, `Pending`, or `Closed`.

### 7.4 Virtual Video Rooms
- Start or join virtual video conferencing meetings linked directly to projects or departments.

### 7.5 Company Announcements
- Post pinned announcements with categories: `Company News`, `Policy Update`, `Event`, or `Urgent`.

---

## 8. HR Portal (`/dashboard/hr`)

### 8.1 Employee Directory
- Search and filter all company personnel by department, status, and role.

### 8.2 HR Tasks
- Dedicated HR workflow task board to manage internal HR operations and administrative deliverables.

### 8.3 Onboarding & Offboarding Checklists
- Standardized step-by-step checklists for incoming hires and departing staff (equipment handover, access revocation, NDA signing).

### 8.4 Leave Management
- **Request Leave**: Employees apply for `Casual`, `Sick`, `Paid`, or `Unpaid` leave with date ranges and reasons.
- **Manager/HR Approval**: Approve or reject requests with one click.
- **Export Records**: Download leave reports in CSV, JSON, or formatted Text summary formats.

### 8.5 Document Vault
- Secure storage for sensitive personnel files: Offer Letters, NDAs, KPI Agreements, and Identity Documents.
- Configurable per-employee restricted visibility.

### 8.6 Help Desk (HR Cases)
- Ticketing system for internal queries (Payroll issues, IT access, Workplace policies).
- Ticket severity tagging (`Low`, `Medium`, `High`, `Urgent`) and threaded internal resolution notes.

### 8.7 Appraisals & KRAs
- Comprehensive performance appraisal cycles tied to Key Result Areas (KRAs) and competency scoring.

### 8.8 Probation & Review Tracker
- Automated alerts for employees approaching their 30/60/90-day probation review checkpoints.

### 8.9 HR Workflow Sandbox
- Test environment to stage and preview HR policy changes and form templates before publishing company-wide.

---

## 9. Goals, OKRs & Culture (`/dashboard/goals`)

### 9.1 Objectives & Key Results (OKRs)
- **Hierarchy Levels**: `Company`, `Department`, `Team`, and `Individual`.
- **Target Tracking**: Track numeric target values, current progress, unit measurement (`%`, `$`, count), and status indicators (`On Track`, `At Risk`, `Behind`, `Completed`).

### 9.2 Kudos & Recognition Wall
- Public feed for team shoutouts tagged by company values (e.g., *Innovation*, *Customer First*, *Integrity*, *Speed*).

### 9.3 Pulse Surveys
- Weekly anonymous employee check-in surveys with rating scores (1–5 stars) and trend analytics for leadership.

### 9.4 1:1 Meeting Tracker
- Schedule recurring manager-employee 1:1 check-ins.
- Set meeting agendas, capture meeting notes, and manage carried-over action items with completion checkboxes.

---

## 10. Operation Portal (`/dashboard/clients`)

### 10.1 Client Account & Project Delivery Tracker
- **Project Phase Tracking**: `In Delivery`, `On Hold`, `Closed - Follow up`, `Closed`.
- **Delivery Health**: Color-coded project health badges (`Green`, `Amber`, `Red`).
- **Retainer Tracking**: Estimated hours vs. actual logged hours and billable burn rates.
- **Contact History Log**: Record emails, calls, client meetings, and summary notes per client.

### 10.2 Sales Workdesk
- **Pipeline Stages**: `Prospecting` → `Discovery` → `Proposal Sent` → `Negotiation` → `Closed Won` / `Closed Lost`.
- **Switchable Views**: Interactive Kanban deal board or detailed sortable table view.
- **Deal Metrics**: Deal value, closing probability %, expected close date, and account owner.

### 10.3 Resource Allocation Grid
- Overview of staff utilization: `Deployed`, `Partially Allocated`, `Bench`, or `On Leave`.
- Track weekly hour allocations per project to prevent employee burnout and identify bench talent.

### 10.4 External Teams & Contractors
- Track third-party vendors, external freelancers, and agencies.
- Monitor hourly contractor rates, currencies, assigned projects, and contract statuses.

---

## 11. IT Portal & Assets (`/dashboard/it`)

### 11.1 Drive & Knowledge Links
- Central registry of all cloud storage folders (Google Drive, OneDrive, Notion, Figma) categorized by venture and access level.

### 11.2 Access Matrix & Tool Provisioning
- Audit log of software licenses and tools assigned to employees (e.g., GitHub, AWS, Slack, Jira).
- Grant, suspend, or revoke access credentials.

### 11.3 SaaS Subscriptions & Cost Tracking
- Inventory of active workspace software subscriptions, monthly/annual costs, seat counts, and upcoming renewal alerts.

### 11.4 Hardware & Device Inventory
- Track physical laptops, monitors, smartphones, and peripherals.
- Asset tagging, condition monitoring (`Excellent`, `Good`, `Fair`, `Poor`), OS version, and assignment history.

### 11.5 Invoice Generator & Management
- Generate professional PDF/print-ready invoices for clients with customizable line items, tax rates, currencies (`INR`, `USD`), and payment terms.
- Status management: `Draft`, `Sent`, `Paid`, `Overdue`, `Cancelled`.

---

## 12. Analytics & Audit Logs (`/dashboard/analytics`)

### 12.1 Time & Billability Analytics
- Visual charts of total hours logged, billable ratios, and project-by-project breakdown.

### 12.2 Manager Performance Insights
- Department-level productivity tracking, timesheet compliance, and goal achievement metrics.

### 12.3 System Audit Trail
- Enterprise security log recording every critical action within the workspace:
  - Role modifications and permission changes.
  - Leave approvals and document uploads.
  - Task deletions and user status updates.
- Filter by User, Action Type, Verb (`CREATE`, `UPDATE`, `DELETE`), and Timeframe (`Today`, `Last 7 Days`, `Last 30 Days`).

---

## 13. Referral Pipeline (`/dashboard/referrals`)

### 13.1 Referral Workflow
1. **Submit Candidate**: Click **"+ Refer Candidate"**, enter candidate details, experience, resume link, target position, and eligible reward amount.
2. **Pipeline Progression**:
   - `Submitted` → `Interviewing` → `Hired` → `Paid` (or `Rejected`).
3. **Reward Payout Tracking**: Track bonus payout status (`Pending`, `Approved`, `Paid`) with payout timestamps.
4. **Kanban & Grid Views**: Manage candidate pipelines via drag-and-drop or compact table.

---

## 14. Settings & Security (`/dashboard/settings`)

### 14.1 Personal Profile
- Update full name, avatar photo, phone number, bio, skills tags, and social profiles (LinkedIn, GitHub, Twitter, Portfolio).

### 14.2 Security & Password Management
- Change account password with current password verification and instant validation.

### 14.3 User Management (Admin Only)
- Manage all workspace user accounts, invite new members, change roles, or deactivate/reactivate users.

### 14.4 Role & Module Permission Matrix (Admin Only)
- Granular permission control: toggle access per role for every individual module (`team`, `calendar`, `projects`, `chat`, `hr`, `goals`, `analytics`, `clients`, `it`, `referrals`, `settings`).

### 14.5 Shifts & Status Configuration
- Configure standard company shift timings, grace periods, and attendance rules.

### 14.6 Workspace Invoices & Billing Subscription
- View your SaaS plan tier, seat allocation, invoice receipts, and upgrade subscriptions.

---

## 15. API Reference & Integrations

The platform exposes RESTful endpoints under `/api/` protected by session cookies and role checks:

| Module | Route | Methods | Description |
|---|---|---|---|
| **Auth** | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | `POST` | User authentication & session handling |
| **Team** | `/api/team`, `/api/departments` | `GET`, `POST`, `PUT`, `DELETE` | Member profiles & department structures |
| **Calendar** | `/api/calendar/events`, `/api/attendance` | `GET`, `POST`, `PUT`, `DELETE` | Events, live check-ins, attendance logs |
| **Projects** | `/api/projects`, `/api/tasks`, `/api/sprints` | `GET`, `POST`, `PUT`, `DELETE` | Projects, tasks, sprint management |
| **Drive** | `/api/drive`, `/api/wiki` | `GET`, `POST`, `DELETE` | File uploads, folders, SOP documents |
| **Chat** | `/api/chat/channels`, `/api/chat/messages` | `GET`, `POST`, `PUT`, `DELETE` | Real-time channels, direct messages |
| **HR** | `/api/hr/leaves`, `/api/hr/documents`, `/api/hr/cases`, `/api/hr/appraisals` | `GET`, `POST`, `PUT`, `DELETE` | Leave approvals, document vault, tickets |
| **Goals** | `/api/okrs`, `/api/kudos`, `/api/surveys`, `/api/one-on-ones` | `GET`, `POST`, `PUT`, `DELETE` | OKRs, peer kudos, 1:1 agendas |
| **Operations**| `/api/clients`, `/api/operations/sales`, `/api/operations/hr-allocations`, `/api/operations/external` | `GET`, `POST`, `PUT`, `DELETE` | Client delivery, sales deals, staffing |
| **IT** | `/api/it/drive-links`, `/api/it/access`, `/api/it/subscriptions`, `/api/it/devices`, `/api/it/invoices` | `GET`, `POST`, `PUT`, `DELETE` | IT asset tracking, software, billing |
| **Analytics** | `/api/activity-logs`, `/api/analytics/performance` | `GET` | Audit trail and metric summaries |
| **Referrals** | `/api/referrals` | `GET`, `POST`, `PUT`, `DELETE` | Candidate referral submissions & rewards |
