# Implementation Plan: Salary Disbursement & Bank Details Enhancement

## Objective
Resolve the issues preventing users and admins from reliably updating and viewing **Salary Disbursement & Bank Details**, auto-sync bank details between self-service salary claims and user profiles, remove dangerous company-account fallbacks, and display **`N/A`** across all viewers, modals, and PDF exports whenever bank details are not provided.

---

## Identified Issues & Solutions Summary

| # | Issue Identified | Solution |
|---|---|---|
| 1 | **Unconditional DOB validation blocks Profile & Bank Details update** in Settings (`settings/page.tsx`) | Ensure existing users with legacy records are guided cleanly without silent blocking; validate DOB smoothly so saving Bank Details, phone, and bio never fails unexpectedly. |
| 2 | **Bank details on self-service salary slips are never saved to profile** (`SelfServiceInvoiceTab.tsx`) | Automatically sync bank details entered during salary claim submission with the user's permanent profile (`User` document), so they only enter them once. |
| 3 | **`bankDetails` is dropped by `/api/it/invoices` and missing from `ITInvoice` schema** | Add `bankDetails` to `ITInvoice` interface & Mongoose schema, extract and save it in `POST /api/it/invoices` and `PATCH /api/it/invoices/[id]`. |
| 4 | **Accidental fallback to Company Bank Details on salary slips** | Remove `companyBankDetails` fallbacks for employee salary claims so employee payouts never display company accounts. |
| 5 | **Missing Bank Details showing fake dummy accounts** (`Axis Bank`, `782459739212`, `NEXA0004128`) | Replace all dummy fallbacks across Invoice Detail Viewers, Admin Disbursement Modals, and PDF generators with **`N/A`** and an amber *"Bank Details: Not Provided"* status badge. |

---

## Proposed Changes

### Phase 1: Database Model & Schema Updates
#### 1. [`src/models/ITInvoice.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/models/ITInvoice.ts)
- Add `bankDetails` to `IITInvoice` interface:
  ```ts
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    upiId?: string;
  };
  ```
- Add `bankDetails` sub-schema to `ITInvoiceSchema`:
  ```ts
  bankDetails: {
    bankName: { type: String, default: "", trim: true },
    accountNo: { type: String, default: "", trim: true },
    ifscCode: { type: String, default: "", trim: true },
    upiId: { type: String, default: "", trim: true },
  },
  ```
- Add Mongoose model cache invalidation check for `bankDetails`.

#### 2. [`src/models/FinanceInvoice.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/models/FinanceInvoice.ts)
- Add `bankDetails` to `IFinanceInvoice` interface and schema to ensure consistency across both IT and Finance invoice collections.

---

### Phase 2: API Route Fixes & Profile Auto-Sync
#### 1. [`src/app/api/it/invoices/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/it/invoices/route.ts)
- In `POST`:
  - Destructure `bankDetails` from `request.json()`.
  - Pass sanitized `bankDetails` into `ITInvoice.create(...)`.
  - **Auto-Sync to User Profile**: If the submitter has provided valid bank details and their user profile is currently missing them (or updating them), update `User.updateOne({ _id: userObjectId }, { $set: { bankDetails: ... } })`.

#### 2. [`src/app/api/it/invoices/[id]/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/it/invoices/%5Bid%5D/route.ts)
- In `PATCH`:
  - If `body.bankDetails` is provided, persist it to `updateBody.bankDetails`.

---

### Phase 3: Self-Service Salary Slip & Settings Profile
#### 1. [`src/components/settings/SelfServiceInvoiceTab.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/settings/SelfServiceInvoiceTab.tsx)
- Remove `companyBankDetails` fallbacks from employee salary claims (lines 1934-1939 and lines 2101-2104).
- When bank details are empty, default to empty strings, which display as **`N/A`** on the invoice.
- Add immediate visual feedback in the *Salary Disbursement & Bank Details* card:
  - If bank details are populated from user profile: show a green *"Synced with Profile"* badge.
  - If empty: show an amber *"Not Provided — will show as N/A on salary slip"* notice.

#### 2. [`src/app/dashboard/settings/page.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/dashboard/settings/page.tsx)
- In `handleUpdateProfile`:
  - Allow existing users with empty DOB to update their Bank Details and other fields without being hard-blocked by an uncaught validation exception.
  - If DOB is entered or modified, validate that it meets the 18+ requirement.
  - If DOB is missing, gracefully notify or guide the user without blocking their bank details from persisting.

---

### Phase 4: Display "N/A" Across Invoices, Modals & PDF Exports
#### 1. [`src/components/finance/InvoiceDetailsView.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/finance/InvoiceDetailsView.tsx)
- Replace dummy strings (`"Corporate Banking Partner"`, `"782459739212"`, `"NEXA0004128"`, `"nexace@okaxis"`) with **`"N/A"`**:
  - `Bank Name: invoice.bankDetails?.bankName || "N/A"`
  - `Account No: invoice.bankDetails?.accountNo || "N/A"`
  - `IFSC / Swift: invoice.bankDetails?.ifscCode || "N/A"`
  - `UPI ID: invoice.bankDetails?.upiId || "N/A"`

#### 2. [`src/components/settings/AdminInvoicesTab.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/settings/AdminInvoicesTab.tsx)
- In the payment disbursement modal & details drawer:
  - Display the payee's actual bank details from `invoice.bankDetails`.
  - If missing, display **`N/A`** for all banking fields.
  - Show a clear warning badge in the disbursement modal: *"No Payee Bank Details Provided (N/A)"* so Admin/Finance knows to request bank info from the employee before processing bank transfer.

#### 3. [`src/components/finance/InvoiceGridView.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/finance/InvoiceGridView.tsx)
- In the disbursement popup, display payee bank details or **`N/A`**.

#### 4. [`src/lib/invoice-pdf.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/lib/invoice-pdf.ts)
- Update PDF generation:
  - Replace `"Axis Bank"` & `"48571847770003"` fallbacks with **`"N/A"`** so generated invoice PDFs never contain fake corporate bank data for employees.

---

## Verification Plan

### Automated Type Checks
- Run `npx tsc --noEmit` to verify type safety across all modified models, API routes, and components.

### Manual / Browser Verification
1. **User Profile Settings (`/dashboard/settings`)**:
   - Enter Bank Name, Account Number, IFSC, and UPI ID.
   - Click *Save Profile Details*.
   - Refresh page to verify bank details persist.
2. **Self-Service Salary Invoice (`/dashboard/settings` -> Invoices tab)**:
   - Check that the bank details auto-fill from the profile.
   - Test submitting with bank details: verify they are saved to the invoice document.
   - Test submitting with empty bank details: verify invoice shows **`N/A`** instead of company bank account or dummy accounts.
3. **Admin Disbursement Modal (`/dashboard/settings` -> Admin Invoices)**:
   - Click *Process Payment* on an approved invoice:
     - When employee provided bank details: verify they display accurately.
     - When employee did NOT provide bank details: verify all fields show **`N/A`**.
4. **PDF Generation**:
   - Download invoice PDF: verify bank details show either the employee's details or **`N/A`** (no fake `Axis Bank` dummy data).
