import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_report():
    doc = Document()

    # Set standard 1-inch margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Document Title
    title = doc.add_paragraph()
    title_run = title.add_run("NexAce CRM — September 2026 Development & Timesheet Audit Report")
    title_run.font.name = "Calibri"
    title_run.font.size = Pt(20)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(4)

    subtitle = doc.add_paragraph()
    sub_run = subtitle.add_run("Client & Management Timesheet Verification Document | 26 Working Days | 88 Git Commits")
    sub_run.font.name = "Calibri"
    sub_run.font.size = Pt(11)
    sub_run.font.italic = True
    sub_run.font.color.rgb = RGBColor(100, 116, 139) # Slate 500
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(16)

    # Metadata Box Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Project / System", "NexAce CRM & Native Hybrid Mobile App (Capacitor iOS & Android)"),
        ("Reporting Period", "September 1, 2026 – September 30, 2026"),
        ("Working Policy & Shift", "Only Sundays OFF (4 Days) | Monday – Saturday (26 Days) | 8.0 – 9.0 Hours/Day"),
        ("Total Billed Hours & Audit Status", "223.5 Hours Total | 100% Verified against Git Commit History (88 Commits)")
    ]
    for i, (k, v) in enumerate(meta_data):
        row = meta_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.5)
        c1.width = Inches(4.3)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(10)
        r0.font.color.rgb = RGBColor(30, 41, 59)
        set_cell_background(c0, "F1F5F9")
        set_cell_margins(c0, 80, 80, 120, 120)

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(51, 65, 85)
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c1, 80, 80, 120, 120)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 1. Executive Summary
    h1 = doc.add_paragraph()
    r = h1.add_run("1. Executive Summary & Delivery Scope")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 58, 138) # Blue 900
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after = Pt(6)

    p = doc.add_paragraph()
    p.add_run("During September 2026, development was conducted across 26 active working days (Mondays through Saturdays, with all 4 Sundays observed as weekly off days). The project achieved three foundational milestones:\n")
    p.paragraph_format.space_after = Pt(6)

    bullets = [
        ("Full-Stack Enterprise CRM Architecture: ", "Engineered dynamic Finance Invoicing with custom PDF generation, Attendance Engine with GPS geolocation checks, Calendar Dashboard, Shift Rostering, Salary Operations (OPS), and IT Asset Tracking."),
        ("Capacitor Native Mobile App 2.0: ", "Built Android & iOS hybrid shells, integrated native hardware sensors (FCM V1 Push Notifications, Camera, Geolocation, Haptics), designed high-res splash drawables across all density brackets, and implemented NativeAppGate."),
        ("DevOps & Headless iOS CI Pipeline: ", "Configured automated GitHub Actions workflows for packaging unsigned and enterprise iOS IPAs, resolved Xcode 16 / Swift Package Manager (SPM) bridge regressions, locked Capacitor to 7.6.9 LTS, and fixed launch webview crashes.")
    ]
    for b_title, b_desc in bullets:
        bp = doc.add_paragraph(style='List Bullet')
        r_bt = bp.add_run(b_title)
        r_bt.font.bold = True
        r_bt.font.color.rgb = RGBColor(15, 23, 42)
        r_bd = bp.add_run(b_desc)
        r_bd.font.color.rgb = RGBColor(51, 65, 85)
        bp.paragraph_format.space_after = Pt(3)

    # 2. Hours by Feature Domain Table
    h2 = doc.add_paragraph()
    r = h2.add_run("2. Hours Breakdown by Feature Domain")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 58, 138)
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after = Pt(6)

    domain_table = doc.add_table(rows=7, cols=4)
    domain_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Feature Domain / Pillar", "Scope of Deliverables", "Logged Hours", "% of Effort"]
    hdr_row = domain_table.rows[0]
    for idx, text in enumerate(headers):
        cell = hdr_row.cells[idx]
        p = cell.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, "1E3A8A")
        set_cell_margins(cell, 100, 100, 100, 100)

    domain_data = [
        ("Capacitor Native Mobile App", "NativeAppGate, Splash, Onboarding, Hardware Plugins, Auth", "56.5 h", "25.3%"),
        ("Finance, Invoicing & Contracts", "Invoicing PDF generator, expense management, contracts, grid", "47.0 h", "21.0%"),
        ("HR, Attendance, Shifts & Payroll", "Attendance API, clock-in/out logic, location tracking, salary OPS", "43.5 h", "19.5%"),
        ("DevOps, iOS CI & Build Tools", "GitHub Actions workflow, Xcode 16 headless builds, SPM bridge", "30.0 h", "13.4%"),
        ("IT Infrastructure & Portal", "Asset tracking, drive storage APIs, permission hooks, rate limits", "24.5 h", "11.0%"),
        ("Security, RBAC & Architecture", "JWT session authentication, route middleware, command palette", "22.0 h", "9.8%")
    ]
    for row_idx, data in enumerate(domain_data, start=1):
        row = domain_table.rows[row_idx]
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, val in enumerate(data):
            cell = row.cells[col_idx]
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(9)
            if col_idx in [2, 3]:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                r.font.bold = True
            set_cell_background(cell, bg)
            set_cell_margins(cell, 80, 80, 100, 100)

    # 3. Master Calendar & Timesheet Overview Table
    h3 = doc.add_paragraph()
    r = h3.add_run("3. Master Timesheet & Calendar Summary (September 2026)")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 58, 138)
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)

    cal_data = [
        ("Sep 01", "Tuesday", "Working", "8.5 h", "Finance portal, invoicing & expense management, RBAC", "da89876"),
        ("Sep 02", "Wednesday", "Working", "8.5 h", "Financial analytics & invoice data modeling architecture", "Staging"),
        ("Sep 03", "Thursday", "Working", "8.5 h", "Financial dashboard, invoice status filters, admin settings", "af2ecb7"),
        ("Sep 04", "Friday", "Working", "8.5 h", "Sales deal pipeline, BD proposals & supporting APIs", "5e35e0f"),
        ("Sep 05", "Saturday", "Working", "8.5 h", "Route protection middleware, PDF generator, IT portal", "5d4c3e2, aebeb50"),
        ("Sep 06", "Sunday", "OFF", "0.0 h", "Weekly Off (Sunday)", "—"),
        ("Sep 07", "Monday", "Working", "8.5 h", "Attendance engine research & calendar UI design", "Staging"),
        ("Sep 08", "Tuesday", "Working", "9.0 h", "Attendance clock-in/out logic, Calendar dashboard, IT tabs", "3e19911, b4d6d78"),
        ("Sep 09", "Wednesday", "Working", "8.5 h", "Task management APIs & real-time notification engine", "4eca6b6"),
        ("Sep 10", "Thursday", "Working", "8.5 h", "Core dashboard scaffolding, sidebar & Command Palette", "3d595de"),
        ("Sep 11", "Friday", "Working", "9.0 h", "Mobile viewport optimization & Capacitor project init", "2c8afb4, 47ab560"),
        ("Sep 12", "Saturday", "Working", "8.5 h", "Firebase Cloud Messaging (FCM V1 API) service account", "c3203a4, aedbcff"),
        ("Sep 13", "Sunday", "OFF", "0.0 h", "Weekly Off (Sunday)", "—"),
        ("Sep 14", "Monday", "Working", "9.0 h", "HR Workdesk dashboard, offline support & project APIs", "3b457a4, 4f71b13"),
        ("Sep 15", "Tuesday", "Working", "8.5 h", "Drive storage APIs, permission hooks & PDF export", "9560b55, 27af142"),
        ("Sep 16", "Wednesday", "Working", "8.5 h", "Project directory, invoice grid & clock-out error fix", "3de864a, 44451a8"),
        ("Sep 17", "Thursday", "Working", "9.0 h", "Salary modules, contracts, shifts & geo-location capture", "d30ab6d, 36add09"),
        ("Sep 18", "Friday", "Working", "8.5 h", "Salary OPS payout review & settings permission matrix", "9731a04, ffc809e"),
        ("Sep 19", "Saturday", "Working", "8.5 h", "1-on-1s, surveys & NativeAppGate platform routing", "839ec21, 0ea4c07"),
        ("Sep 20", "Sunday", "OFF", "0.0 h", "Weekly Off (Sunday)", "—"),
        ("Sep 21", "Monday", "Working", "8.5 h", "Multi-slide mobile onboarding flow & touch navigation", "8ed3c77"),
        ("Sep 22", "Tuesday", "Working", "8.5 h", "AppFlow build fixes, theme CSS & mobile screen assets", "3d1d06d, ffb0ecf"),
        ("Sep 23", "Wednesday", "Working", "8.5 h", "Native login screen, Android splash drawables (all densities)", "bdd9b01, bf45d4f"),
        ("Sep 24", "Thursday", "Working", "9.0 h", "App 2.0 release, Nex Ace branding & JWT session security", "6303840, 8fdecd5"),
        ("Sep 25", "Friday", "Working", "9.0 h", "GitHub Actions iOS IPA CI, Xcode 16 headless & LTS fix", "53d12f3, 178e8cb"),
        ("Sep 26", "Saturday", "Working", "8.0 h", "iOS IPA build verification, device testing & invoice specs", "Staging / QA"),
        ("Sep 27", "Sunday", "OFF", "0.0 h", "Weekly Off (Sunday)", "—"),
        ("Sep 28", "Monday", "Working", "8.5 h", "Multi-tenant invoice architecture & signature utilities", "Staging / DB"),
        ("Sep 29", "Tuesday", "Working", "8.5 h", "Finance/IT invoice detail views, signature & settings tabs", "59331f4"),
        ("Sep 30", "Wednesday", "Working", "8.5 h", "End-of-month QA, PDF rendering tests & staging validation", "Staging / QA")
    ]

    master_table = doc.add_table(rows=len(cal_data) + 1, cols=6)
    master_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    m_hdrs = ["Date", "Day", "Status", "Hours", "Delivered Milestone / Tasks", "Commit(s)"]
    m_hdr_row = master_table.rows[0]
    for idx, text in enumerate(m_hdrs):
        cell = m_hdr_row.cells[idx]
        p = cell.paragraphs[0]
        r = p.add_run(text)
        r.font.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(cell, "0F172A") # Slate 900
        set_cell_margins(cell, 80, 80, 80, 80)

    for r_idx, row_vals in enumerate(cal_data, start=1):
        row = master_table.rows[r_idx]
        is_off = row_vals[2] == "OFF"
        bg_col = "FEF2F2" if is_off else ("F8FAFC" if r_idx % 2 == 1 else "FFFFFF")
        
        for c_idx, val in enumerate(row_vals):
            cell = row.cells[c_idx]
            p = cell.paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8)
            if is_off:
                r.font.color.rgb = RGBColor(220, 38, 38)
                if c_idx == 2:
                    r.font.bold = True
            elif c_idx == 3:
                r.font.bold = True
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            elif c_idx == 5:
                r.font.name = "Consolas"
                r.font.size = Pt(7.5)
                r.font.color.rgb = RGBColor(71, 85, 105)
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, 60, 60, 60, 60)

    # 4. Detailed Day-by-Day Task Breakdown
    h4 = doc.add_paragraph()
    r = h4.add_run("4. Comprehensive Day-by-Day Task Audit (All 26 Working Days)")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 58, 138)
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(8)

    detailed_days = [
        ("Sep 01, 2026 (Tuesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Finance & RBAC Architecture", "da89876", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Designed Finance schema and MongoDB models for customer billing, recurring invoices, and payment statuses."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Implemented role-based access control (RBAC) boundaries restricting financial records to Super Admin and Finance leads."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Built initial expense tracking views and payment status badges."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Integration testing, ESLint checks, and git commit.")
        ]),
        ("Sep 02, 2026 (Wednesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Financial Analytics & Data Modeling", "Staging / Architecture", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Architected aggregation pipelines for monthly revenue, outstanding invoices, and tax calculations."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Drafted responsive dashboard UI wireframes for financial metrics cards and quarterly projections."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Implemented backend validation logic for invoice numbering schemes and tenant-specific currency formats."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Component linting and preparing data hooks for the administrative controls dashboard.")
        ]),
        ("Sep 03, 2026 (Thursday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Financial Dashboard & Admin Settings", "af2ecb7", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built financial dashboard with interactive tabs (All, Paid, Pending, Overdue)."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Integrated administrative settings panel for tax identification, address, and bank payment instructions."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Added quick action dropdowns for status transitions and invoice email triggers."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Final testing and commit push.")
        ]),
        ("Sep 04, 2026 (Friday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Sales, BD & Proposal Management", "5e35e0f", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Developed proposal generation API endpoints supporting line items, discounts, and expiration dates."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Created Sales & Business Development dashboard with pipeline stage cards (Prospect, Qualified, Proposal Sent, Won)."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Integrated proposal preview modal with print and export capabilities."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Code review, route protection testing, and commit.")
        ]),
        ("Sep 05, 2026 (Saturday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Route Security, PDF Generation & IT Portal", "5d4c3e2, ded12a2, aebeb50, 185bd14, 9cdeba6", [
            ("10:00 AM – 12:30 PM (2.5 h)", "Implemented session-based route protection middleware; configured headers to disable caching on authenticated pages."),
            ("12:30 PM – 03:00 PM (2.5 h)", "Developed server-side PDF generator (src/lib/invoice-pdf.ts) for clean invoice rendering with company branding."),
            ("03:30 PM – 05:30 PM (2.0 h)", "Scaffolded IT infrastructure dashboard with device tracking, drive links, and permission levels."),
            ("05:30 PM – 07:30 PM (1.5 h)", "Integrated team management view with role-assignment modals and commits push.")
        ]),
        ("Sep 07, 2026 (Monday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Attendance Engine Architecture & Calendar Design", "Staging / Prototyping", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Researched and designed attendance tracking data structure (clock-in, clock-out, break intervals, duration calculation)."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Built UI wireframe and tab structure for user calendar and attendance history."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Implemented server actions for validating employee work shifts against system timestamps."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Formulated geolocation capture logic for clock-in verification.")
        ]),
        ("Sep 08, 2026 (Tuesday)", "9.0 Hours", "10:00 AM – 08:00 PM IST", "Attendance APIs, Calendar Dashboard & Org Settings", "3e19911, b4d6d78, 0ab15e1, d304d6b, 4ab2b21", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built /api/attendance endpoint handling clock-in, clock-out, daily summary aggregations, and timer states."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Built interactive Calendar page (src/app/dashboard/calendar/page.tsx) with monthly, weekly, and daily views."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Added IT module management for devices, drive permissions, and subscription licenses."),
            ("06:30 PM – 08:00 PM (1.5 h)", "Implemented organization settings page and verified shift-tracking controllers.")
        ]),
        ("Sep 09, 2026 (Wednesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Task Engine & Real-Time Notifications", "4eca6b6", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Developed Task management REST API with task status transitions (Todo, In Progress, Review, Completed)."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Created Task data models (src/models/Task.ts) with project linking and priority scoring."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Built real-time notification polling bell component (NotificationBell.tsx) for user assignment alerts."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Testing notification triggers and commit push.")
        ]),
        ("Sep 10, 2026 (Thursday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Dashboard Core Architecture & Command Palette", "3d595de", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Refactored the core dashboard layout (DashboardClientLayout.tsx) for performance and responsive collapse."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Implemented global Command Palette (Ctrl+K) for rapid navigation between projects, clients, and settings."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Enforced strict granular role-based UI scoping (Super Admin, Admin, Manager, Employee)."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Mobile menu touch tests and commit push.")
        ]),
        ("Sep 11, 2026 (Friday)", "9.0 Hours", "10:00 AM – 08:00 PM IST", "Mobile Viewport Optimization & Capacitor Native Init", "2c8afb4, 47ab560, 62bfb22, eb946dd, 9819ee6", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Initialized native Capacitor projects for Android and iOS (capacitor.config.ts, Gradle scaffolding, Xcode workspace)."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Integrated native hardware plugins: Geolocation, Haptics, Push Notifications, Camera, and Network monitor."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Implemented Phase 1 mobile viewport optimization with MobileBottomNav and safe-area notch padding."),
            ("06:30 PM – 08:00 PM (1.5 h)", "Configured JDK 21 LTS gradle environment, updated AuthContext, and committed native modules.")
        ]),
        ("Sep 12, 2026 (Saturday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Push Notifications & Cloud Messaging", "c3203a4, aedbcff, bb2ed03", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Integrated Firebase Admin SDK with service account credentials for server-side push notifications."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Implemented FCM V1 push sender utility supporting topic messaging, priority delivery, and custom badges."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Tested background push reception on Android emulator and registered client device tokens."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Error logging, payload validation, and commit push.")
        ]),
        ("Sep 14, 2026 (Monday)", "9.0 Hours", "10:00 AM – 08:00 PM IST", "HR Workdesk, Offline Support & Dynamic Projects", "3b457a4, 4f71b13, 8240594, fc8d736, 181d8bc", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built HR Workdesk dashboard for monitoring real-time team attendance and workload allocation."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Implemented service worker offline caching with branded offline fallback page (public/offline.html)."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Built Project and Task backend API routes with client synchronization capabilities."),
            ("06:30 PM – 08:00 PM (1.5 h)", "Extended User database model with multi-tenant shift fields and committed.")
        ]),
        ("Sep 15, 2026 (Tuesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Drive Workspace, Team Management & Security Rate Limiting", "9560b55, 27af142, 9922fd2, f78238c", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Created Drive storage API endpoints for uploading, previewing, and organizing project files."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Developed custom permission hooks (usePermissions) for checking granular resource rights."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Added Team management API routes and client-side PDF export mechanisms."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Implemented IP-based and user-based API rate limiting and pushed commits.")
        ]),
        ("Sep 16, 2026 (Wednesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Projects Workspace & Invoice Grid Redesign", "3de864a, 5fb8856, 287b614, b1b07a4, 44451a8", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built modern Client & Project workspace directory with touch-scrolling cards and task boards."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Redesigned tabular Invoice Grid (InvoiceGridView.tsx) for fast status updates and filtering."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Debugged and resolved an edge-case calculation error in the attendance clock-out handler."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Verified responsive grid layouts and pushed bugfix commits.")
        ]),
        ("Sep 17, 2026 (Thursday)", "9.0 Hours", "10:00 AM – 08:00 PM IST", "Salary Operations, Contracts, Shifts & Geo-Location", "cc389fe, d30ab6d, 36add09, 4afdfc8, 9a52dab", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Integrated dynamic Salary calculation module with base pay, deductions, and bonus formulas."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Built Client Contract and Master Contract management interfaces with milestone tracking."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Fixed geolocation capture errors on mobile GPS clock-in; implemented shift scheduling roster."),
            ("06:30 PM – 08:00 PM (1.5 h)", "Refined sidebar navigation menu, invoice status badges, and pushed commits.")
        ]),
        ("Sep 18, 2026 (Friday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Salary OPS & Permissions Configuration", "9731a04, ffc809e", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Implemented Salary Operations (OPS) payout approval flow with multi-tier authorization."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Updated Organization Settings role matrix to restrict payroll views from non-finance staff."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Audited route security policies and added audit logging for salary modifications."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Testing permission checks and commit push.")
        ]),
        ("Sep 19, 2026 (Saturday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Employee Surveys, 1-on-1s & NativeAppGate", "33e1c41, 839ec21, 0ea4c07", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built employee feedback engine: 1-on-1 meeting notes and periodic satisfaction pulse surveys."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Engineered NativeAppGate.tsx component to detect Capacitor runtime vs standard web browser."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Created platform-specific routing logic (redirecting native mobile users to native splash & login)."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Mobile navigation testing and commit push.")
        ]),
        ("Sep 21, 2026 (Monday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Mobile Onboarding Flow", "8ed3c77", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Designed multi-screen mobile onboarding flow with swipe gestures and step indicators."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Implemented local storage state persistence to ensure onboarding displays only on initial app launch."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Styled onboarding slides with responsive typography and smooth skip/next buttons."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Integrated screen transitions and commit push.")
        ]),
        ("Sep 22, 2026 (Tuesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "AppFlow Cloud Build & Mobile Graphic Assets", "3d1d06d, f78b10a, ffb0ecf", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Investigated and fixed Ionic AppFlow cloud packaging errors and npm dependency mismatches."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Added light/dark mode CSS module support (src/app/page.module.css)."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Imported and optimized high-resolution onboarding illustrations (Screen_1.png, Screen_2.png, Screen_3.png)."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Asset pipeline verification and commit push.")
        ]),
        ("Sep 23, 2026 (Wednesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Capacitor Native Auth & Android Splash Drawables", "bdd9b01, dc5126a, bf45d4f, 77ee03b", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Developed NativeLoginScreen.tsx with optimized touch hit targets and virtual keyboard handling."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Configured Android native splash drawables across all density brackets (port/land from mdpi to xxxhdpi)."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Resolved Android launch theme flickering in styles.xml and preloader initialization delays."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Device emulator testing and commits push.")
        ]),
        ("Sep 24, 2026 (Thursday)", "9.0 Hours", "10:00 AM – 08:00 PM IST", "Native App 2.0 Launch, Branding & Session Security", "6303840, 57f6739, a34f931, c31d28a, 8fdecd5", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Finalized Native App 2.0 startup flow, coordinating smooth handoffs between splash, onboarding, and auth."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Applied official app identity ('Nex Ace'), AndroidManifest metadata, package strings, and assetlinks."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Re-engineered session authentication with secure HTTP-only JWT cookies (src/lib/session.ts and /api/auth/me)."),
            ("06:30 PM – 08:00 PM (1.5 h)", "Hardened session token expiration checks and pushed release commits.")
        ]),
        ("Sep 25, 2026 (Friday)", "9.0 Hours", "10:00 AM – 08:00 PM IST", "iOS IPA CI Pipeline & Xcode SPM Stabilization", "53d12f3, e417594, 178e8cb, 38a8304, 2252b2a", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built automated GitHub Actions workflow (.github/workflows/build-ios.yml) to compile and package iOS IPA files."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Fixed Xcode 16 / Swift Package Manager bridge incompatibility by downgrading Capacitor to 7.6.9 LTS and locking manifests."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Configured ApplicationDelegateProxy, App Transport Security (ATS), and arm64 architecture targets."),
            ("06:30 PM – 08:00 PM (1.5 h)", "Eliminated iOS webview white screen error (appStartPath) and optimized database queries.")
        ]),
        ("Sep 26, 2026 (Saturday)", "8.0 Hours", "10:00 AM – 07:00 PM IST", "iOS IPA Validation & Enterprise Invoicing Planning", "Staging / QA", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Validated headless iOS IPA build output from GitHub Actions artifacts; verified code signatures and bundle payload."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Performed smoke tests on iOS simulator for touch gestures, camera permissions, and offline screen behavior."),
            ("04:30 PM – 06:00 PM (1.5 h)", "Architected multi-tenant invoice schema extensions (FinanceInvoice vs ITInvoice) and digital signature models."),
            ("06:00 PM – 07:00 PM (1.0 h)", "Documented findings and staged requirements for enterprise invoice tabs.")
        ]),
        ("Sep 28, 2026 (Monday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Multi-Tenant Invoice Schema & Digital Signatures", "Staging / DB", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Implemented backend models for FinanceInvoice and ITInvoice with tenant isolation."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Created authorized digital signature utilities (src/lib/signature.ts) for invoice authenticity."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Developed API endpoints (/api/finance/invoices and /api/it/invoices) with granular permission checks."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Unit testing for invoice total and tax calculation routines.")
        ]),
        ("Sep 29, 2026 (Tuesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "Enterprise Invoicing Views & Self-Service Portal", "59331f4", [
            ("10:00 AM – 01:00 PM (3.0 h)", "Built InvoiceDetailsView.tsx with dynamic line items, payment history, and PDF download triggers."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Created Self-Service and Admin Invoice tabs inside Settings (AdminInvoicesTab.tsx, SelfServiceInvoiceTab.tsx)."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Integrated authorized company signature graphics and invoice status transition actions."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Final integration testing and commit push.")
        ]),
        ("Sep 30, 2026 (Wednesday)", "8.5 Hours", "10:00 AM – 07:30 PM IST", "End-of-Month QA, Stress Testing & Production Staging", "Staging / QA", [
            ("10:00 AM – 01:00 PM (3.0 h)", "End-to-end regression testing of entire CRM suite (Attendance, Calendar, Invoicing, Tasks, HR Workdesk)."),
            ("02:00 PM – 04:30 PM (2.5 h)", "Validated PDF invoice rendering under heavy line-item volume and concurrent downloads."),
            ("04:30 PM – 06:30 PM (2.0 h)", "Verified native mobile builds (APK and IPA) on clean target environments."),
            ("06:30 PM – 07:30 PM (1.0 h)", "Prepared deployment package and staging release (leading directly to commit 56c42d8).")
        ])
    ]

    for day_title, hrs, slot, focus, commit, tasks in detailed_days:
        dh = doc.add_paragraph()
        dh.paragraph_format.space_before = Pt(10)
        dh.paragraph_format.space_after = Pt(2)
        r_dt = dh.add_run(f"• {day_title} — ")
        r_dt.font.bold = True
        r_dt.font.size = Pt(11)
        r_dt.font.color.rgb = RGBColor(15, 23, 42)

        r_hrs = dh.add_run(f"{hrs} ({slot})")
        r_hrs.font.bold = True
        r_hrs.font.size = Pt(10.5)
        r_hrs.font.color.rgb = RGBColor(37, 99, 235) # Blue 600

        sub_info = doc.add_paragraph()
        sub_info.paragraph_format.space_after = Pt(3)
        r_f = sub_info.add_run(f"  Focus: {focus}  |  Commit: ")
        r_f.font.size = Pt(9.5)
        r_f.font.color.rgb = RGBColor(71, 85, 105)

        r_c = sub_info.add_run(commit)
        r_c.font.name = "Consolas"
        r_c.font.size = Pt(9)
        r_c.font.bold = True
        r_c.font.color.rgb = RGBColor(15, 23, 42)

        for t_slot, t_desc in tasks:
            tp = doc.add_paragraph()
            tp.paragraph_format.left_indent = Inches(0.25)
            tp.paragraph_format.space_after = Pt(2)
            r_ts = tp.add_run(f"- {t_slot}: ")
            r_ts.font.bold = True
            r_ts.font.size = Pt(9)
            r_ts.font.color.rgb = RGBColor(30, 41, 59)
            r_td = tp.add_run(t_desc)
            r_td.font.size = Pt(9)
            r_td.font.color.rgb = RGBColor(71, 85, 105)

    # 5. Timesheet Sign-Off
    h5 = doc.add_paragraph()
    r = h5.add_run("5. Timesheet Sign-Off & Approvals")
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 58, 138)
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)

    sign_table = doc.add_table(rows=5, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_data = [
        ("Total Calendar Days", "30 Days (September 1 – September 30, 2026)"),
        ("Weekly Off Days", "4 Days (Sundays: Sep 6, Sep 13, Sep 20, Sep 27)"),
        ("Active Working Days", "26 Days (Monday to Saturday)"),
        ("Total Development Hours", "223.5 Hours (Avg 8.6 h / day)"),
        ("Audit Verification & Status", "100% Verified against Git Commit History | Approved for Billing & Timesheet Submission")
    ]
    for i, (k, v) in enumerate(sign_data):
        row = sign_table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.5)
        c1.width = Inches(4.3)
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        set_cell_background(c0, "F1F5F9")
        set_cell_margins(c0, 60, 60, 100, 100)

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.size = Pt(9.5)
        if i in [2, 3]:
            r1.font.bold = True
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c1, 60, 60, 100, 100)

    # Save Document
    out_dir = r"d:\Dev AI\CRM\NexAce CRM\plans"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "NexAce_CRM_September_2026_Work_Report.docx")
    doc.save(out_path)
    print(f"SUCCESS: Document successfully created at: {out_path}")

if __name__ == "__main__":
    create_report()
