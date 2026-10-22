# Implementation Plan: HR Signature, Employee Invoice Visibility, Payout Notifications & Complete Payment Methods

This plan addresses all four interconnected issues identified in the HR-to-Employee invoice workflow:
1. **Auto-Fetch HR Signature**: Auto-load user or company authorized signatures into the invoice canvas and provide `/api/users/signature` to persist signatures.
2. **Employee Invoice History Visibility**: Enable employees to view invoices generated for them by HR or Finance directly inside their self-service invoice history (`/api/it/invoices` + `FinanceInvoice` bridge).
3. **Targeted Employee Notifications**: Notify the actual employee upon invoice issuance, verification, and final disbursement settlement, with direct deep-links to their self-service view.
4. **Complete Payment Methods & Remittance Visibility**: Display full bank details (Bank Name, Account #, IFSC, Holder Name) and UPI in the payment modal; support all 5 payment methods (`Bank Transfer`, `UPI`, `Cash`, `Cheque`, `Card`); and fix the category check so payee details never drop.

---

## Architecture Overview

```mermaid
graph TD
    HR[HR Portal / Finance Portal] -->|Issues Invoice with 1-Click Sync| Gen[invoices/new/page.tsx]
    Gen -->|Auto-fetches Signature| Sig[useAuth + /api/users/signature + Company Sig]
    Gen -->|Saves targetUserId, businessEmail, bankDetails| FinInvAPI[/api/finance/invoices]
    FinInvAPI -->|Stores in MongoDB| DB[(FinanceInvoice Collection)]
    
    FinInvAPI -->|Sends In-App Notification| EmpNotif1[Employee: Invoice Issued by HR]

    Admin[Admin / OPS] -->|Clicks Process Payment| PayModal[Payment Modal: Bank, UPI, Cash, Cheque, Card]
    PayModal -->|Settles Payment| PatchInv[/api/finance/invoices/:id]
    
    PatchInv -->|Notifies Employee Payee| EmpNotif2[Employee: Payout Disbursed & Settled]
    PatchInv -->|Notifies HR Creator| HRNotif[HR: Invoice Settled]

    Emp[Employee Account] -->|Opens Self-Service Invoices| SelfTab[SelfServiceInvoiceTab.tsx]
    SelfTab -->|Fetches /api/it/invoices| ITInvAPI[/api/it/invoices]
    ITInvAPI -->|Queries ITInvoice + FinanceInvoice by targetUserId| DB
    ITInvAPI -->|Returns Combined Invoices| SelfTab
```

---

## Detailed Step-by-Step Plan

### Phase 1: Auto-Fetch HR Signature & `/api/users/signature` API
* **Files:**
  - Create: [`src/app/api/users/signature/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/users/signature/route.ts)
  - Edit: [`src/app/dashboard/finance/invoices/new/page.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/dashboard/finance/invoices/new/page.tsx)
  - Edit: [`src/context/AuthContext.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/context/AuthContext.tsx) (add `signatureUrl?: string` to `UserProfile`)
* **Actions:**
  1. **New Route `src/app/api/users/signature/route.ts`:**
     - `GET`: Returns `{ signatureUrl: user.signatureUrl || tenant.signatureUrl || "" }`.
     - `POST` / `PUT`: Accepts `{ signatureUrl }`, updates `User.findByIdAndUpdate(userObjectId, { signatureUrl })` and returns success.
  2. **Invoice Generator Auto-Population (`invoices/new/page.tsx`):**
     - When page loads, check `user?.signatureUrl` directly from `useAuth()`.
     - If empty, fetch `/api/users/signature` which falls back to the tenant's verified company signature (`Tenant.signatureUrl`).
     - Auto-set `signatureUrl`, `profileSignature`, and `useProfileSig = true` so the signature immediately shows on the canvas and in the live preview.
     - When user draws/types/uploads a new signature and selects *"Save signature to profile"*, `POST` it to `/api/users/signature`.

---

### Phase 2: Schema & Generator Payload Enhancement
* **Files:**
  - Edit: [`src/models/FinanceInvoice.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/models/FinanceInvoice.ts)
  - Edit: [`src/app/dashboard/finance/invoices/new/page.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/dashboard/finance/invoices/new/page.tsx)
  - Edit: [`src/app/api/finance/invoices/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/finance/invoices/route.ts)
* **Actions:**
  1. **Extend `FinanceInvoice` Schema:**
     - Add `targetUserId: { type: Schema.Types.ObjectId, ref: "User", default: null }`
     - Add `businessEmail: { type: String, default: "" }`
     - Add `preferredPaymentMethod: { type: String, enum: ["Bank Transfer", "UPI", "Cash", "Cheque", "Credit Card"], default: "Bank Transfer" }`
     - Ensure `bankDetails` includes `accountName`, `bankName`, `accountNo`, `ifscCode`, `branch`, and `upiId`.
  2. **Update Invoice Submission Payload (`invoices/new/page.tsx`):**
     - When `recipientMode === "internal"`:
       - Set `targetUserId: selectedInternal._id`
       - Set `businessEmail: selectedInternal.email`
       - Set `customerNo: selectedInternal.email`
       - Set `businessName: selectedInternal.name`
       - Set `bankDetails: selectedInternal.bankDetails || { upiId: selectedInternal.upiId }`
     - Add a **Payment Remittance Card** in step 1 of the generator allowing HR to see and confirm the employee's bank account & UPI ID before issuing.

---

### Phase 3: Employee Invoice History Visibility (`/api/it/invoices`)
* **Files:**
  - Edit: [`src/app/api/it/invoices/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/it/invoices/route.ts)
  - Edit: [`src/components/settings/SelfServiceInvoiceTab.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/settings/SelfServiceInvoiceTab.tsx)
* **Actions:**
  1. **Bridge in `/api/it/invoices/route.ts`:**
     - In the `GET` handler, when querying for an employee user (non-admin or scoped):
       - Query `ITInvoice.find(...)`.
       - Query `FinanceInvoice.find(...)` where `targetUserId: userObjectId` OR `businessEmail: userEmail` OR `customerNo: userEmail` OR `client: userName`.
       - Map `FinanceInvoice` records to standard `Invoice` format:
         - `items: inv.lineItems`
         - `total: inv.amount`
         - `category: inv.category || "Employee Payroll"`
         - `businessName: inv.client || inv.businessName`
         - `businessEmail: inv.businessEmail`
         - `shiftAttendance: inv.shiftAttendance`
         - `timesheetEntries: inv.timesheetEntries`
         - `bankDetails: inv.bankDetails`
         - `paymentDetails: inv.paymentDetails`
       - Merge, de-duplicate by `invoiceNo`, and sort by date descending.
  2. **In `SelfServiceInvoiceTab.tsx`:**
     - Update filter logic in `fetchMyInvoiceHistory` so it matches invoices having `targetUserId === user._id` or matching `businessEmail` / `customerNo`, ensuring HR-generated invoices are never filtered out.

---

### Phase 4: Fix Targeted Employee Notifications
* **Files:**
  - Edit: [`src/app/api/finance/invoices/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/finance/invoices/route.ts) (POST)
  - Edit: [`src/app/api/finance/invoices/[id]/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/finance/invoices/%5Bid%5D/route.ts) (PATCH)
* **Actions:**
  1. **On Invoice Creation (`POST /api/finance/invoices`):**
     - If `targetUserId` exists and differs from `userObjectId` (i.e. HR issued for employee):
       - Send in-app notification to `recipientId: targetUserId`:
         - Title: `✨ Monthly Invoice Issued: ${invoiceNo}`
         - Message: `HR (${session.userName}) has generated and verified your invoice for ${formatCurrency(amount)}. It is now queued for payment disbursement.`
         - Link: `/dashboard/settings?tab=invoice&invoiceNo=${invoiceNo}`
  2. **On Settlement / Payout (`PATCH /api/finance/invoices/[id]`):**
     - Resolve the employee payee ID (`invoice.targetUserId` or user matching `invoice.businessEmail` / `client`).
     - If resolved and different from `invoice.createdBy`:
       - Send notification to `recipientId: targetUserId`:
         - Title: `✅ Payout Processed: ${invoice.invoiceNo}`
         - Message: `Your invoice (${invoice.invoiceNo}) for ₹${invoice.amount.toLocaleString("en-IN")} has been settled via ${payMethod} by ${session.userName}.`
         - Link: `/dashboard/settings?tab=invoice&invoiceNo=${invoice.invoiceNo}`
     - Also send notification to `invoice.createdBy` (HR creator) confirming settlement.

---

### Phase 5: Complete Payment Methods & Remittance Details
* **Files:**
  - Edit: [`src/components/settings/AdminInvoicesTab.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/settings/AdminInvoicesTab.tsx)
  - Edit: [`src/components/finance/InvoiceDetailsView.tsx`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/components/finance/InvoiceDetailsView.tsx)
  - Edit: [`src/app/api/finance/invoices/route.ts`](file:///d:/Dev%20AI/CRM/NexAce%20CRM/src/app/api/finance/invoices/route.ts)
* **Actions:**
  1. **Fix Payee Mapping Bug in `AdminInvoicesTab.tsx`:**
     - Fix lines 258–262: Support `inv.category === "Employee Payroll"` and `"Services"` alongside `"Employee Invoice"` so `businessName`, `customerNo`, `businessEmail`, and `bankDetails` are accurately preserved.
  2. **Expand Payment Methods in Payment Modal (`AdminInvoicesTab.tsx`):**
     - Expand `PaymentMethod` type to: `"Bank Transfer" | "UPI" | "Cash"`.
     - In the modal tabs, render all 3 methods with FontAwesome icons:
       - <i className="fa-solid fa-building-columns text-sky-500" /> **Bank Transfer**
       - <i className="fa-solid fa-qrcode text-emerald-500" /> **UPI**
       - <i className="fa-solid fa-money-bill-transfer text-amber-500" /> **Cash**
  
  3. **Bank Transfer Details Panel:**
     - In the Bank Transfer view of the modal, display the payee's actual bank account credentials:
       - **Bank Name**: `invoice.bankDetails?.bankName || "Not Provided"`
       - **Account Number**: `invoice.bankDetails?.accountNo || "Not Provided"` (with quick-copy button)
       - **IFSC / Swift Code**: `invoice.bankDetails?.ifscCode || "Not Provided"` (with quick-copy button)
       - **Account Holder Name**: `invoice.bankDetails?.accountName || invoice.businessName`
       - Add optional Transaction Reference / UTR # input field.
  4. **Invoice View & PDF Remittance Card (`InvoiceDetailsView.tsx`):**
     - Display both Bank Account details AND UPI ID in the remittance section for all invoices when available.

---

## Verification Plan

1. **TypeScript Type-Check**: Run `npx tsc --noEmit` to ensure clean compilation across all backend routes and frontend components.
2. **Signature Verification**:
   - Open `/dashboard/finance/invoices/new?from=hr`.
   - Verify HR's signature or company signature is pre-filled on canvas and in live preview.
3. **Invoice Issuance & Visibility Verification**:
   - Issue an invoice for an employee (e.g. Ashish Sharma) with "Approved by HR".
   - Log in / check `/api/it/invoices` as that employee.
   - Verify the invoice shows in the employee's history tab with complete details, line items, and correct status.
4. **Notification Verification**:
   - Verify notification is generated for the employee upon creation.
   - Settle the invoice as Admin via the Payment Modal with Bank Transfer or UPI.
   - Verify notification is delivered to the employee with link `/dashboard/settings?tab=invoice&invoiceNo=...`.
5. **Payment Methods Verification**:
   - Open the Process Payment modal for the invoice.
   - Verify Bank Transfer displays the employee's Bank Name, Account Number, IFSC, and Holder Name with quick-copy.
   - Verify UPI shows the auto-picked Payee UPI ID and QR code.
