# 🏖️ Implementation Plan: Company Holidays Integration with Dynamic RBAC Permissions & Excel Import

## 🎯 Goal
Integrate an end-to-end **Company Holidays & Public Holidays system** into NexAce CRM that combines:
1. **Auto-Holiday Detection** (country & regional calendar detection based on company location/timezone).
2. **Dynamic Permissions in Settings > Permissions** (`RoleDataControlTab`): Admin and OPS can dynamically toggle, assign, or revoke Holiday Management & Excel Import permissions for ANY role (HR, Manager, Employee, custom roles).
3. **Bulk Excel (`.xlsx` / `.xls` / `.csv`) Import & Template Download**.
4. **Universal Visibility**: Main Dashboard Widget, Calendar "Company Holidays" Tab, and Leave Application auto-exclusion.

---

## 🔐 1. Dynamic RBAC Permissions (Configurable in Settings > Permissions)

We will register two new granular feature permissions in `src/components/settings/RoleDataControlTab.tsx` and `src/hooks/usePermissions.ts`:

### A. New Feature Permissions
1. **`manageHolidays`**:
   * **Name**: *Manage Company Holidays & Time Off*
   * **Category**: `Calendar & Time`
   * **SubGroup**: `Holiday Calendar & Time Off`
   * **Description**: *"Create, edit, delete, auto-sync, and manage company official holidays"*
   * **Icon**: `fa-solid fa-umbrella-beach`
   * **Default Settings**: Granted to `Admin`, `OPS`, and `HR`; revocable/assignable to any role dynamically.
2. **`importHolidayExcel`**:
   * **Name**: *Import Holidays from Excel / CSV*
   * **Category**: `Calendar & Time`
   * **SubGroup**: `Holiday Calendar & Time Off`
   * **Description**: *"Allow users with this role to bulk-upload `.xlsx` or `.xls` spreadsheets to populate company holidays"*
   * **Icon**: `fa-solid fa-file-excel`
   * **Default Settings**: Granted to `Admin`, `OPS`, and `HR`; revocable/assignable to any role dynamically.

### B. Dynamic Permission Evaluation (`usePermissions.ts`)
```typescript
const canManageHolidays = can("manageHolidays") || isAdmin;
const canImportExcel = can("importHolidayExcel") || isAdmin;
```
* **Dynamic Persistence:** Toggling the switch in **Settings > Permissions** saves to MongoDB (`RolePermission.featurePermissions`) per tenant.
* If an Admin enables `manageHolidays` for "Manager" or "Employee", they immediately get the Edit/Add controls without code changes. If revoked from HR, HR loses the edit controls.

---

## 🏗️ 2. Database Schema: `src/models/Holiday.ts`

```typescript
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoliday extends Document {
  title: string;                               // e.g. "Diwali", "Independence Day", "Christmas"
  description?: string;                        // Optional notes / office closure details
  date: Date;                                  // Normalized to midnight UTC
  year: number;                                // Indexed for quick annual filtering (e.g. 2025, 2026)
  month: number;                               // 1-12 for monthly grouping
  dayOfWeek?: string;                          // "Monday", "Friday", etc.
  type: "Mandatory" | "Restricted" | "Company";// Mandatory/Gazetted vs Restricted/Floating
  category?: "National" | "Religious" | "Cultural" | "Corporate";
  applicableDepartments?: string[];            // ["All"] or specific departments
  locations?: string[];                        // Multi-office support (e.g. ["HQ", "Remote", "Bangalore"])
  isHalfDay?: boolean;                         // Optional half-day holiday
  tenantId: mongoose.Types.ObjectId;           // Multi-tenant isolation
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

* **Compound Indexes**:
  * `{ tenantId: 1, year: 1, date: 1 }` (fast query by year and date range)
  * `{ tenantId: 1, date: 1 }` (for upcoming holidays countdown)

---

## 🤖 3. Auto-Detection System

1. **Country & Location Auto-Detection**:
   * Reads `Tenant.country` (or `Tenant.timezone`) from company settings.
   * Auto-selects between **India** (`Asia/Kolkata`), **United States**, or custom regional calendars.
2. **1-Click Auto-Populate for Any Year**:
   * One click on **"Auto-Detect & Sync"** instantly generates the complete list of national and gazetted holidays for the selected year (2025, 2026, 2027) without typing dates.
3. **Smart Long Weekend Detection**:
   * When a holiday falls on **Friday** or **Monday**, the system automatically flags it as a **"Long Weekend Alert!"** on the dashboard.
4. **Leave Application Auto-Detection**:
   * When an employee applies for leave on `/dashboard/hr?tab=leaves`, any official holiday falling inside their requested date range is **automatically detected and excluded** from their leave deduction.

---

## 📊 4. Excel Import & Management Feature

Using the existing `"xlsx": "^0.18.5"` library already integrated in the project:

### A. Excel Import Modal (`<ImportHolidayExcelModal />`):
1. **Drag-and-Drop or File Picker**: Supports `.xlsx`, `.xls`, and `.csv`.
2. **Download Sample Template**: Generates an formatted `.xlsx` sample file with headers:
   * `Title *` (e.g. "Diwali")
   * `Date *` (e.g. "2026-10-31" or "31/10/2026")
   * `Type` ("Mandatory", "Restricted", or "Company")
   * `Category` ("National", "Religious", "Cultural", "Corporate")
   * `Half Day` ("Yes" / "No")
   * `Description` (optional notes)
3. **Client-Side Live Preview & Validation**:
   * Parses rows in real-time before saving to DB.
   * Highlights duplicate dates or malformed date rows.
   * Shows summary: *"12 valid holidays ready to import (0 errors)"*.
4. **Batch Upsert API**: Saves validated rows to MongoDB with tenant isolation.

### B. Inline Edit & Delete Modal:
* Users with `manageHolidays` permission can click the **Edit icon** on any holiday card or table row:
  * Modify Title, Date, Type (Mandatory/Restricted), Half-day status, or Description.
  * Instant update with feedback toast.

---

## 🖥️ 5. UI/UX Surface Areas

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              NexAce CRM Holiday Ecosystem                              │
├──────────────────────┬─────────────────────────────┬───────────────────────────────────┤
│ 1. OVERVIEW WIDGET   │ 2. CALENDAR TAB             │ 3. SETTINGS & HR MANAGEMENT       │
│ (/dashboard)         │ (/dashboard/calendar)       │ (/dashboard/settings, /hr)        │
├──────────────────────┼─────────────────────────────┼───────────────────────────────────┤
│ • "Upcoming Holidays │ • "Company Holidays" tab    │ • Settings > Permissions:         │
│   & Long Weekends"   │ • Year Filter (2025-2027)   │   Dynamic RBAC Toggles            │
│ • Countdown pills    │ • Grid & Table Views        │ • HR / Calendar Management:       │
│ • Long weekend flags │ • iCal (.ics) Sync Export   │   - "Auto-Detect & Sync" Button   │
│ • "View All" link    │ • Dynamic Edit/Delete based │   - "Import Excel" (.xlsx) Modal  │
│                      │   on `manageHolidays`       │   - "Download Sample Template"    │
└──────────────────────┴─────────────────────────────┴───────────────────────────────────┘
```

---

## 📱 6. Mobile & Design System Rules

* **FontAwesome 6 Icons Only:**
  * `<i className="fa-solid fa-umbrella-beach" />` (Holidays)
  * `<i className="fa-solid fa-file-excel" />` (Excel Import & Download)
  * `<i className="fa-solid fa-wand-magic-sparkles" />` (Auto-Detect)
  * `<i className="fa-solid fa-calendar-check" />` (Calendar Sync)
  * `<i className="fa-solid fa-pen-to-square" />` (Edit Holiday)
  * `<i className="fa-solid fa-trash-can" />` (Delete Holiday)
* **Mobile-First & Touch Targets:**
  * Minimum 40px hit areas (`.touch-target`).
  * Horizontal tab scrolling with `.touch-scroll-x`.
  * Safe modal insets (`inset-x-3.5`) for Excel Import and Edit modals on phones.

---

## 🚀 7. Step-by-Step Implementation Steps

1. **Step 1:** Create `src/models/Holiday.ts` schema with compound indexes and tenant isolation.
2. **Step 2:** Register dynamic feature permissions (`manageHolidays`, `importHolidayExcel`) in `src/components/settings/RoleDataControlTab.tsx` and wire into `src/hooks/usePermissions.ts`.
3. **Step 3:** Build API routes:
   * `GET/POST /api/holidays`
   * `PUT/DELETE /api/holidays/[id]`
   * `POST /api/holidays/seed` (Auto-detection engine with India & US packs)
   * `POST /api/holidays/import` (Excel batch upload handler)
4. **Step 4:** Update `src/app/api/calendar/route.ts` to stream `Holiday` records directly into the shared calendar grid.
5. **Step 5:** Build `<ImportHolidayExcelModal />` with live preview, error checking, and sample template download.
6. **Step 6:** Build `<UpcomingHolidaysWidget />` and embed in `EmployeeDashboard.tsx`, `HRDashboard.tsx`, and `AdminDashboard.tsx`.
7. **Step 7:** Build the **"Company Holidays"** tab in `src/app/dashboard/calendar/page.tsx` with Year filter, view toggle, and dynamic action controls governed by `can("manageHolidays")`.
8. **Step 8:** Connect holiday management to `src/app/dashboard/hr/page.tsx`.
9. **Step 9:** Sync Capacitor (`npm run cap:sync`) and verify on desktop and mobile.
