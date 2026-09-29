import { generateInvoicePdfDoc } from "../src/lib/invoice-pdf";

const testInvoice = {
  invoiceNo: "INV-SAL-654858",
  invoiceDate: "2026-09-29",
  dueDate: "2026-09-30",
  customerNo: "EMP-SAL-ASHISHSHARMA",
  businessName: "Ashish Sharma",
  businessSubtitle: "EMPLOYEE • ENGINEERING (PERMANENT STAFF)",
  businessAddress: "Employee • Engineering (Permanent Staff)",
  businessEmail: "sharmaashish7251@gmail.com",
  billedToName: "Nex Ace",
  billedToAddress: "Building no 1254, Tower B Zone, Gurgaon, Noida, 110078, India",
  billedToEmail: "finance@nexace.com",
  items: [
    {
      description: "Monthly Fixed Base Salary - September 2026 [2026-09-01 to 2026-09-30]",
      quantity: 1,
      unitPrice: 20000,
      amount: 20000,
    }
  ],
  subtotal: 20000,
  taxRate: 0,
  taxAmount: 0,
  total: 20000,
  currency: "INR",
  status: "Paid",
  paymentDetails: {
    method: "UPI",
    fromUpiId: "nexace@axl",
    toUpiId: "linuxclaw@axl",
    transactionId: "7897894564145677",
    paidAt: "2026-09-29T10:00:00.000Z",
  },
  notes: "Monthly contractual salary claim for September 2026. Verified biometric & shift attendance attached.\n[Verified Shift Attendance]: 234.4 hrs logged over 26 days (Overtime: 43.4 hrs)",
  paymentTerms: "14 days",
  approvedBy: "Nex Ace Admin",
  approvedAt: "2026-09-29T10:05:00.000Z",
};

const doc = generateInvoicePdfDoc(testInvoice as any);
console.log("Pages:", (doc as any).internal.getNumberOfPages());
