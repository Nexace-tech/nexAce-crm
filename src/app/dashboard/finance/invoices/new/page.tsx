"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { removeSignatureBackground } from "@/lib/signature";

interface InternalEmployee {
  _id: string;
  name: string;
  email: string;
  department?: string;
  employmentType?: string;
  salary?: number;
  role?: string;
}

interface ExternalMember {
  _id: string;
  name: string;
  email: string;
  companyName: string;
  role: string;
  serviceCategory: string;
  assignedProject: string;
  hourlyRate: number;
  currency: string;
  status: string;
  phone?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const SERVICE_CATEGORIES = [
  "Software Development",
  "UI/UX Design",
  "DevOps & Infrastructure",
  "Quality Assurance",
  "Product Management",
  "Cybersecurity & Audit",
  "Marketing & Content",
  "Operations & Admin",
  "Legal & Compliance",
  "Consulting Services",
  "Other",
];

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED", "PKR", "CAD", "AUD"];
const VENTURES = ["Ace Consultancys", "NexAce Tech"];

const CURSIVE_FONTS = [
  { name: "Signature Brush", font: "'Brush Script MT', 'Segoe Script', cursive" },
  { name: "Elegant Script", font: "'Dancing Script', 'Lucida Handwriting', cursive" },
  { name: "Formal Cursive", font: "'Great Vibes', 'Apple Chancery', cursive" },
  { name: "Classic Handwritten", font: "'Comic Sans MS', cursive, sans-serif" },
];

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type"); // "external" or "internal"

  const { can, isAdmin, isOPS } = usePermissions();

  // ── Digital Signature State ──
  const [profileSignature, setProfileSignature] = useState<string>("");
  const [useProfileSig, setUseProfileSig] = useState<boolean>(true);
  const [includeSignature, setIncludeSignature] = useState<boolean>(true);
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [saveSigToProfile, setSaveSigToProfile] = useState<boolean>(false);
  const [signatureMode, setSignatureMode] = useState<"draw" | "type" | "upload">("draw");
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [typedName, setTypedName] = useState("");
  const [typedFont, setTypedFont] = useState(CURSIVE_FONTS[0].font);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [isProcessingSig, setIsProcessingSig] = useState(false);
  const sigCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Fetch user profile signature
  useEffect(() => {
    fetch("/api/users/signature")
      .then((res) => res.json())
      .then((data) => {
        if (data.signatureUrl) {
          setProfileSignature(data.signatureUrl);
          setSignatureUrl(data.signatureUrl);
          setUseProfileSig(true);
        }
      })
      .catch(() => {});
  }, []);

  const effectiveSignature = useProfileSig && profileSignature ? profileSignature : signatureUrl;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    setSignatureUrl(canvas.toDataURL("image/png"));
    setUseProfileSig(false);
  };

  const clearDrawing = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureUrl("");
  };

  const generateTypedSignature = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement("canvas");
    canvas.width = 450;
    canvas.height = 140;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.font = `44px ${typedFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName.trim(), canvas.width / 2, canvas.height / 2);
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureUrl(dataUrl);
    setUseProfileSig(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      if (!raw) return;
      if (autoRemoveBg) {
        setIsProcessingSig(true);
        try {
          const cleaned = await removeSignatureBackground(raw);
          setSignatureUrl(cleaned);
          setUseProfileSig(false);
        } catch {
          setSignatureUrl(raw);
          setUseProfileSig(false);
        } finally {
          setIsProcessingSig(false);
        }
      } else {
        setSignatureUrl(raw);
        setUseProfileSig(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Candidate Data ──
  const [employees, setEmployees] = useState<InternalEmployee[]>([]);
  const [externalMembers, setExternalMembers] = useState<ExternalMember[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // ── Recipient Selection Mode ──
  // "internal" | "existing-external" | "new-external"
  const [recipientMode, setRecipientMode] = useState<"internal" | "existing-external" | "new-external">(
    initialType === "external" ? "existing-external" : "internal"
  );

  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedInternal, setSelectedInternal] = useState<InternalEmployee | null>(null);
  const [selectedExternal, setSelectedExternal] = useState<ExternalMember | null>(null);

  // ── New External Contractor / Vendor Form ──
  const [newExternalForm, setNewExternalForm] = useState({
    name: "",
    email: "",
    companyName: "",
    role: "External Consultant",
    serviceCategory: "Software Development",
    assignedProject: "General Project Support",
    hourlyRate: "",
    phone: "",
    saveToDirectory: true,
  });

  // ── Billing Model ──
  // "fixed" | "hourly" | "line-items"
  const [billingModel, setBillingModel] = useState<"fixed" | "hourly" | "line-items">("hourly");

  // ── Invoice Details ──
  const [customInvoiceNo, setCustomInvoiceNo] = useState("");
  const [isManualInvoiceNo, setIsManualInvoiceNo] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [currency, setCurrency] = useState("USD");
  const [venture, setVenture] = useState("Ace Consultancys");
  const [category, setCategory] = useState("Services");
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Fixed Amount
  const [fixedAmount, setFixedAmount] = useState("");

  // Hourly Billing
  const [hoursWorked, setHoursWorked] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "item-1", description: "Professional Services Deliverable", quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Fetch candidate lists ──
  useEffect(() => {
    let isMounted = true;
    async function loadCandidates() {
      setLoadingCandidates(true);
      try {
        const [teamRes, extRes] = await Promise.all([
          fetch("/api/team?activeOnly=true"),
          fetch("/api/operations/external-teams"),
        ]);

        if (teamRes.ok && isMounted) {
          const data = await teamRes.json();
          setEmployees(data.employees || data.users || []);
        }
        if (extRes.ok && isMounted) {
          const data = await extRes.json();
          setExternalMembers(data.externalMembers || []);
        }
      } catch (err) {
        console.error("Failed to load candidates:", err);
      } finally {
        if (isMounted) setLoadingCandidates(false);
      }
    }
    loadCandidates();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Handle Candidate Selection ──
  const handleSelectInternal = (emp: InternalEmployee) => {
    setSelectedInternal(emp);
    setSelectedExternal(null);
    setCandidateSearch("");
    const isFreelance = (emp.employmentType || "").toLowerCase().includes("freelan") || (emp.employmentType || "").toLowerCase().includes("contract");
    if (isFreelance) {
      setBillingModel("hourly");
      setHourlyRate("");
      setCategory("Freelancer Payment");
    } else {
      setBillingModel("fixed");
      setFixedAmount(emp.salary ? String(emp.salary) : "");
      setCategory("Employee Payroll");
    }
  };

  const handleSelectExternal = (ext: ExternalMember) => {
    setSelectedExternal(ext);
    setSelectedInternal(null);
    setCandidateSearch("");
    setBillingModel("hourly");
    setHourlyRate(ext.hourlyRate ? String(ext.hourlyRate) : "");
    if (ext.currency) setCurrency(ext.currency);
    setCategory(ext.serviceCategory || "External Contractor Payment");
  };

  // ── Compute Total Amount ──
  const totalAmount = useMemo(() => {
    if (billingModel === "fixed") {
      return Number(fixedAmount) || 0;
    }
    if (billingModel === "hourly") {
      return (Number(hoursWorked) || 0) * (Number(hourlyRate) || 0);
    }
    if (billingModel === "line-items") {
      return lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }
    return 0;
  }, [billingModel, fixedAmount, hoursWorked, hourlyRate, lineItems]);

  // ── Auto Invoice Number ──
  const suggestedInvoiceNo = useMemo(() => {
    const periodTag = billingPeriod.replace("-", "");
    let prefix = "INV";
    let nameTag = "GEN";

    if (recipientMode === "internal") {
      prefix = "EMP";
      if (selectedInternal) {
        nameTag = selectedInternal.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3);
      }
    } else if (recipientMode === "existing-external") {
      prefix = "EXT";
      if (selectedExternal) {
        nameTag = selectedExternal.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3);
      }
    } else {
      prefix = "EXT";
      if (newExternalForm.name.trim()) {
        nameTag = newExternalForm.name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3);
      }
    }
    return `${prefix}-${nameTag}-${periodTag}`;
  }, [recipientMode, selectedInternal, selectedExternal, newExternalForm.name, billingPeriod]);

  const activeInvoiceNo = isManualInvoiceNo && customInvoiceNo.trim() ? customInvoiceNo.trim() : suggestedInvoiceNo;

  // ── Recipient Name & Details ──
  const recipientInfo = useMemo(() => {
    if (recipientMode === "internal") {
      return {
        name: selectedInternal?.name || "Internal Team Member",
        company: "NexAce Internal",
        email: selectedInternal?.email || "",
        scope: "internal" as const,
        badge: selectedInternal?.employmentType || "Internal Employee",
      };
    }
    if (recipientMode === "existing-external") {
      return {
        name: selectedExternal?.name || "External Contractor",
        company: selectedExternal?.companyName || "Independent Contractor",
        email: selectedExternal?.email || "",
        scope: "external" as const,
        badge: "External Contractor",
      };
    }
    return {
      name: newExternalForm.name.trim() || "New External Client / Contractor",
      company: newExternalForm.companyName.trim() || "External Vendor",
      email: newExternalForm.email.trim(),
      scope: "external" as const,
      badge: "New External",
    };
  }, [recipientMode, selectedInternal, selectedExternal, newExternalForm]);

  // ── Line Items Helpers ──
  const handleUpdateLineItem = (id: string, field: keyof LineItem, val: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === "quantity" || field === "unitPrice") {
          const qty = field === "quantity" ? Number(val) || 0 : item.quantity;
          const price = field === "unitPrice" ? Number(val) || 0 : item.unitPrice;
          updated.amount = qty * price;
        }
        return updated;
      })
    );
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
        amount: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  // ── Form Submission ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validation
    if (recipientMode === "internal" && !selectedInternal) {
      setErrorMessage("Please select an internal employee.");
      return;
    }
    if (recipientMode === "existing-external" && !selectedExternal) {
      setErrorMessage("Please select an external contractor/vendor.");
      return;
    }
    if (recipientMode === "new-external") {
      if (!newExternalForm.name.trim() || !newExternalForm.email.trim()) {
        setErrorMessage("Please provide both Name and Email for the new external contractor/vendor.");
        return;
      }
    }
    if (totalAmount <= 0) {
      setErrorMessage("Total invoice amount must be greater than 0.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. If brand new external member and saveToDirectory is true, register them in External Teams
      if (recipientMode === "new-external" && newExternalForm.saveToDirectory) {
        try {
          await fetch("/api/operations/external-teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newExternalForm.name.trim(),
              email: newExternalForm.email.trim(),
              companyName: newExternalForm.companyName.trim() || "Independent Vendor",
              role: newExternalForm.role || "External Contractor",
              serviceCategory: newExternalForm.serviceCategory,
              assignedProject: newExternalForm.assignedProject || "General Project",
              hourlyRate: billingModel === "hourly" ? Number(hourlyRate) || 0 : 0,
              currency,
              phone: newExternalForm.phone,
              status: "Active",
            }),
          });
        } catch (regErr) {
          console.warn("Could not save new external member to registry:", regErr);
        }
      }

      // 2. Prepare Invoice Payload
      const clientFormatted =
        recipientMode === "internal"
          ? selectedInternal!.name
          : recipientMode === "existing-external"
            ? `${selectedExternal!.name}${selectedExternal!.companyName ? ` (${selectedExternal!.companyName})` : ""}`
            : `${newExternalForm.name.trim()}${newExternalForm.companyName.trim() ? ` (${newExternalForm.companyName.trim()})` : ""}`;

      const computedLineItems =
        billingModel === "line-items"
          ? lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              amount: li.amount,
            }))
          : billingModel === "hourly"
            ? [
                {
                  description: `${category} - ${hoursWorked} hours @ ${currency} ${hourlyRate}/hr`,
                  quantity: Number(hoursWorked) || 1,
                  unitPrice: Number(hourlyRate) || totalAmount,
                  amount: totalAmount,
                },
              ]
            : [
                {
                  description: `${category} - Fixed Period Deliverable (${billingPeriod})`,
                  quantity: 1,
                  unitPrice: totalAmount,
                  amount: totalAmount,
                },
              ];

      const effectiveSignature = useProfileSig && profileSignature ? profileSignature : signatureUrl;

      const invoicePayload = {
        invoiceNo: activeInvoiceNo,
        client: clientFormatted,
        amount: totalAmount,
        currency,
        status: "Pending",
        issuedDate,
        dueDate,
        category: category || (recipientMode === "internal" ? "Employee Payroll" : "External Services"),
        venture,
        signatureUrl: includeSignature ? effectiveSignature : "",
        notes:
          notes ||
          `${recipientInfo.badge} Invoice for period ${billingPeriod}. Recipient: ${recipientInfo.name}${recipientInfo.company ? ` (${recipientInfo.company})` : ""}.`,
        lineItems: computedLineItems,
      };

      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoicePayload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice.");
      }

      // Navigate back to finance portal
      router.push("/dashboard/finance?tab=invoices");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while saving the invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Top Breadcrumbs & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/finance" className="hover:text-primary transition-colors flex items-center gap-1">
              <i className="fa-solid fa-coins text-[11px]" /> Finance Portal
            </Link>
            <i className="fa-solid fa-chevron-right text-[9px] opacity-40" />
            <span className="text-foreground font-semibold">New Invoice</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <i className="fa-solid fa-file-invoice-dollar text-primary text-xl" />
            Generate Invoice
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and disburse invoices for internal corporate team members or external vendors and contractors.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/dashboard/finance">
            <Button variant="outline" size="sm" className="gap-2 font-semibold cursor-pointer">
              <i className="fa-solid fa-arrow-left text-xs" /> Back
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="sm"
            className="gap-2 font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {submitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" /> Creating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check text-xs" /> Generate & Save Invoice
              </>
            )}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5">
          <i className="fa-solid fa-triangle-exclamation text-sm shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Main Form Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Configuration */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Recipient Selection Card */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                    1
                  </span>
                  Invoice Recipient & Scope
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {recipientMode === "internal"
                    ? "Internal Corporate Scope"
                    : "External & Vendor Scope"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Segmented Mode Selector: 3 Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 p-1 bg-muted/60 rounded-xl border border-border/70 text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode("internal");
                    setSelectedExternal(null);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer font-bold",
                    recipientMode === "internal"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <i className="fa-solid fa-building text-xs" />
                  Internal Team
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                      recipientMode === "internal" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground border"
                    )}
                  >
                    {employees.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode("existing-external");
                    setSelectedInternal(null);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer font-bold",
                    recipientMode === "existing-external"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <i className="fa-solid fa-globe text-xs" />
                  Existing External
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                      recipientMode === "existing-external" ? "bg-white/20 text-white" : "bg-background/80 text-muted-foreground border"
                    )}
                  >
                    {externalMembers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode("new-external");
                    setSelectedInternal(null);
                    setSelectedExternal(null);
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer font-bold",
                    recipientMode === "new-external"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <i className="fa-solid fa-user-plus text-xs" />
                  New External Vendor
                </button>
              </div>

              {/* Mode 1: Internal Employee Search & Pick */}
              {recipientMode === "internal" && (
                <div className="space-y-3">
                  {selectedInternal ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center">
                          {selectedInternal.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{selectedInternal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedInternal.email} {selectedInternal.department && `· ${selectedInternal.department}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {selectedInternal.employmentType || "Full-time"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInternal(null)}
                          className="h-7 text-xs text-muted-foreground hover:text-rose-500"
                        >
                          <i className="fa-solid fa-rotate-left mr-1 text-[10px]" /> Change
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                        <Input
                          value={candidateSearch}
                          onChange={(e) => setCandidateSearch(e.target.value)}
                          placeholder="Search internal employee by name, email, department..."
                          className="pl-8 text-xs h-9"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto border border-border/70 rounded-xl divide-y divide-border/40">
                        {employees
                          .filter((emp) => {
                            if (!candidateSearch) return true;
                            const q = candidateSearch.toLowerCase();
                            return (
                              emp.name.toLowerCase().includes(q) ||
                              emp.email.toLowerCase().includes(q) ||
                              (emp.department || "").toLowerCase().includes(q)
                            );
                          })
                          .map((emp) => (
                            <button
                              key={emp._id}
                              type="button"
                              onClick={() => handleSelectInternal(emp)}
                              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {emp.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground truncate">{emp.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{emp.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {emp.salary ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    ${emp.salary.toLocaleString()}
                                  </span>
                                ) : null}
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                  {emp.department || "General"}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: Existing External Members Pick */}
              {recipientMode === "existing-external" && (
                <div className="space-y-3">
                  {selectedExternal ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold text-sm flex items-center justify-center border border-cyan-500/30">
                          {selectedExternal.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground">{selectedExternal.name}</p>
                            {selectedExternal.companyName && (
                              <span className="text-xs text-muted-foreground font-medium">
                                ({selectedExternal.companyName})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedExternal.role} · Proj: {selectedExternal.assignedProject}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedExternal.hourlyRate ? (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {selectedExternal.currency || "USD"} {selectedExternal.hourlyRate}/hr
                          </span>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExternal(null)}
                          className="h-7 text-xs text-muted-foreground hover:text-rose-500"
                        >
                          <i className="fa-solid fa-rotate-left mr-1 text-[10px]" /> Change
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                        <Input
                          value={candidateSearch}
                          onChange={(e) => setCandidateSearch(e.target.value)}
                          placeholder="Search external contractor by name, company, role, project..."
                          className="pl-8 text-xs h-9"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto border border-border/70 rounded-xl divide-y divide-border/40">
                        {externalMembers
                          .filter((ext) => {
                            if (!candidateSearch) return true;
                            const q = candidateSearch.toLowerCase();
                            return (
                              ext.name.toLowerCase().includes(q) ||
                              ext.email.toLowerCase().includes(q) ||
                              (ext.companyName || "").toLowerCase().includes(q) ||
                              (ext.role || "").toLowerCase().includes(q)
                            );
                          })
                          .map((ext) => (
                            <button
                              key={ext._id}
                              type="button"
                              onClick={() => handleSelectExternal(ext)}
                              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {ext.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground truncate">
                                    {ext.name} {ext.companyName ? `(${ext.companyName})` : ""}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">{ext.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {ext.hourlyRate ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    {ext.currency || "USD"} {ext.hourlyRate}/hr
                                  </span>
                                ) : null}
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                  External
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: New External Contractor/Vendor Direct Entry */}
              {recipientMode === "new-external" && (
                <div className="p-4 rounded-xl bg-muted/25 border border-border/70 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <i className="fa-solid fa-user-gear text-primary" />
                    Enter New External Client or Vendor Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Contractor / Client Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        placeholder="e.g. David Miller"
                        className="h-8 text-xs"
                        value={newExternalForm.name}
                        onChange={(e) => setNewExternalForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        required
                        type="email"
                        placeholder="e.g. david@agency.com"
                        className="h-8 text-xs"
                        value={newExternalForm.email}
                        onChange={(e) => setNewExternalForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Company / Organization</label>
                      <Input
                        placeholder="e.g. Miller Creative Agency Ltd"
                        className="h-8 text-xs"
                        value={newExternalForm.companyName}
                        onChange={(e) => setNewExternalForm((p) => ({ ...p, companyName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Service Category</label>
                      <select
                        value={newExternalForm.serviceCategory}
                        onChange={(e) => {
                          setNewExternalForm((p) => ({ ...p, serviceCategory: e.target.value }));
                          setCategory(e.target.value);
                        }}
                        className="w-full h-8 rounded-md border border-input bg-background text-xs px-2 text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {SERVICE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Role / Designation</label>
                      <Input
                        placeholder="e.g. Senior Security Auditor"
                        className="h-8 text-xs"
                        value={newExternalForm.role}
                        onChange={(e) => setNewExternalForm((p) => ({ ...p, role: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Assigned Project</label>
                      <Input
                        placeholder="e.g. NexAce Redesign Phase 2"
                        className="h-8 text-xs"
                        value={newExternalForm.assignedProject}
                        onChange={(e) => setNewExternalForm((p) => ({ ...p, assignedProject: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2 border-t border-border/50">
                    <input
                      type="checkbox"
                      id="saveDirectory"
                      checked={newExternalForm.saveToDirectory}
                      onChange={(e) => setNewExternalForm((p) => ({ ...p, saveToDirectory: e.target.checked }))}
                      className="rounded border-input text-primary focus:ring-primary cursor-pointer w-3.5 h-3.5"
                    />
                    <label htmlFor="saveDirectory" className="text-xs text-muted-foreground font-medium cursor-pointer">
                      Save this contractor to External Teams Directory for future quick invoicing
                    </label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Billing Model & Line Items */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                    2
                  </span>
                  Billing Model & Amount
                </CardTitle>
                <div className="flex items-center gap-1.5 p-0.5 bg-muted/60 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setBillingModel("hourly")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                      billingModel === "hourly" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Hourly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingModel("fixed")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                      billingModel === "fixed" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Fixed / Retainer
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingModel("line-items")}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer",
                      billingModel === "line-items" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Itemized Items
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Hourly Billing Fields */}
              {billingModel === "hourly" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        Hours Worked <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 120"
                        value={hoursWorked}
                        onChange={(e) => setHoursWorked(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        Hourly Rate ({currency}) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 85"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  {Number(hoursWorked) > 0 && Number(hourlyRate) > 0 && (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-calculator text-emerald-500" />
                        Calculation: {hoursWorked} hrs × {currency} {hourlyRate}/hr
                      </span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {currency} {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Fixed / Retainer Amount */}
              {billingModel === "fixed" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Fixed Total Amount ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter fixed amount or monthly retainer"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="h-9 text-sm"
                  />
                  {selectedInternal?.salary && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      <i className="fa-solid fa-circle-info mr-1" />
                      Auto-populated from employee monthly salary (${selectedInternal.salary.toLocaleString()})
                    </p>
                  )}
                </div>
              )}

              {/* Itemized Line Items */}
              {billingModel === "line-items" && (
                <div className="space-y-3">
                  <div className="border border-border/80 rounded-xl overflow-hidden divide-y divide-border/60">
                    <div className="grid grid-cols-12 gap-2 bg-muted/40 p-2 text-[10px] font-bold uppercase text-muted-foreground">
                      <div className="col-span-6">Description</div>
                      <div className="col-span-2 text-right">Qty / Hrs</div>
                      <div className="col-span-2 text-right">Rate ({currency})</div>
                      <div className="col-span-2 text-right">Amount</div>
                    </div>
                    {lineItems.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 p-2 items-center text-xs">
                        <div className="col-span-6 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(item.id)}
                            disabled={lineItems.length <= 1}
                            className="text-muted-foreground hover:text-rose-500 disabled:opacity-20 p-1"
                          >
                            <i className="fa-solid fa-xmark text-[10px]" />
                          </button>
                          <Input
                            placeholder={`Deliverable #${index + 1}`}
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(item.id, "description", e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateLineItem(item.id, "quantity", Number(e.target.value))}
                            className="h-7 text-xs text-right"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateLineItem(item.id, "unitPrice", Number(e.target.value))}
                            className="h-7 text-xs text-right"
                          />
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold text-foreground">
                          {currency} {item.amount.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddLineItem}
                    className="gap-1.5 text-xs h-7"
                  >
                    <i className="fa-solid fa-plus text-[10px]" /> Add Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Invoice Parameters */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                  3
                </span>
                Dates & Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Billing Period</label>
                  <Input
                    type="month"
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background text-xs px-2 text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Venture Entity</label>
                  <select
                    value={venture}
                    onChange={(e) => setVenture(e.target.value)}
                    className="w-full h-8 rounded-md border border-input bg-background text-xs px-2 text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {VENTURES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Issue Date</label>
                  <Input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Invoice #</label>
                    <button
                      type="button"
                      onClick={() => setIsManualInvoiceNo(!isManualInvoiceNo)}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      {isManualInvoiceNo ? "Auto-generate" : "Customize"}
                    </button>
                  </div>
                  <Input
                    value={activeInvoiceNo}
                    readOnly={!isManualInvoiceNo}
                    onChange={(e) => setCustomInvoiceNo(e.target.value)}
                    className={cn("h-8 text-xs font-mono", !isManualInvoiceNo && "bg-muted/40 text-muted-foreground")}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Invoice Category</label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Software Development, Employee Payroll"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Notes & Terms (Optional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment instructions, deliverables completed, bank details or project milestones..."
                  className="w-full rounded-md border border-input bg-background text-xs p-3 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card: Authorized Digital Signature */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-file-signature text-primary text-xs" />
                  Authorized Signature
                </CardTitle>
                <div className="flex items-center gap-2">
                  {effectiveSignature && !showSignaturePad && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeSignature}
                        onChange={(e) => setIncludeSignature(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer accent-primary"
                      />
                      <span className="text-xs font-semibold text-foreground">
                        Affix signature to invoice
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {effectiveSignature && !showSignaturePad ? (
                <div className={cn("space-y-3 transition-opacity", !includeSignature && "opacity-50")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-background border border-border">
                    <div className="flex items-center gap-4">
                      <div className="p-2 sm:p-3 rounded-lg bg-white border border-border/80 shadow-xs relative overflow-hidden inline-flex items-center justify-center min-w-[140px] max-w-[220px]">
                        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 20px, #64748b 20px, #64748b 21px)" }} />
                        <img src={effectiveSignature} alt="Digital signature" className="relative max-h-12 max-w-[190px] object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-foreground">
                            {useProfileSig && profileSignature ? "Profile Signature Active" : "Custom Signature"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                            Ready
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {includeSignature
                            ? "This signature will be embedded in the invoice record and printed PDF."
                            : "Signature is detached. Check 'Affix signature' to attach."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSignaturePad(true)}
                        className="text-xs gap-1.5 cursor-pointer"
                      >
                        <i className="fa-solid fa-pen-nib text-[11px]" /> Change
                      </Button>
                      {(!useProfileSig || !profileSignature) && profileSignature && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSignatureUrl(profileSignature);
                            setUseProfileSig(true);
                          }}
                          className="text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <i className="fa-solid fa-rotate-left text-[11px]" /> Reset to Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mode switcher */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="inline-flex p-1 bg-muted/60 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setSignatureMode("draw")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                          signatureMode === "draw"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <i className="fa-solid fa-pen-nib text-[10px]" /> Draw
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMode("type")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                          signatureMode === "type"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <i className="fa-solid fa-font text-[10px]" /> Type
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureMode("upload")}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                          signatureMode === "upload"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <i className="fa-solid fa-upload text-[10px]" /> Upload
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border">
                        <span className="w-2.5 h-2.5 rounded-full bg-black border border-slate-300 inline-block shadow-xs" />
                        Solid Black Ink
                      </span>
                    </div>
                  </div>

                  {/* Draw mode */}
                  {signatureMode === "draw" && (
                    <div className="space-y-2">
                      <div className="border border-border/80 rounded-xl bg-white relative overflow-hidden shadow-inner">
                        <div
                          className="absolute inset-0 opacity-[0.06] pointer-events-none"
                          style={{
                            backgroundImage: "repeating-linear-gradient(transparent, transparent 24px, #64748b 24px, #64748b 25px)"
                          }}
                        />
                        <canvas
                          ref={sigCanvasRef}
                          width={600}
                          height={160}
                          className="w-full h-[140px] cursor-crosshair touch-none relative"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        <span className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-medium select-none pointer-events-none">
                          Draw with mouse or fingertip
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          Sign smoothly inside the box in crisp solid black ink.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearDrawing}
                          className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <i className="fa-solid fa-rotate-left text-[10px]" /> Clear Canvas
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Type mode */}
                  {signatureMode === "type" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                          <Input
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder="e.g. Johnathan Doe"
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Handwriting Font</label>
                          <select
                            value={typedFont}
                            onChange={(e) => setTypedFont(e.target.value)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          >
                            {CURSIVE_FONTS.map((f) => (
                              <option key={f.name} value={f.font}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-border/80 flex items-center justify-center min-h-[100px] shadow-xs">
                        <p
                          style={{ fontFamily: typedFont }}
                          className="text-3xl text-black text-center select-none truncate px-4"
                        >
                          {typedName || "Your Signature"}
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!typedName.trim()}
                          onClick={generateTypedSignature}
                          className="text-xs gap-1.5 cursor-pointer"
                        >
                          <i className="fa-solid fa-check text-[11px]" /> Use This Signature
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Upload mode */}
                  {signatureMode === "upload" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-wand-magic-sparkles text-primary text-xs" />
                          <div>
                            <p className="text-xs font-bold text-foreground">Auto Background Removal</p>
                            <p className="text-[11px] text-muted-foreground">
                              Crops paper background and sharpens ink strokes to pure black
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoRemoveBg}
                            onChange={(e) => setAutoRemoveBg(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                        </label>
                      </div>

                      <div className="border-2 border-dashed border-border/80 rounded-xl p-5 text-center bg-muted/10 hover:bg-muted/20 transition-colors relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          disabled={isProcessingSig}
                        />
                        {isProcessingSig ? (
                          <div className="flex flex-col items-center gap-2 py-3">
                            <i className="fa-solid fa-spinner fa-spin text-primary text-xl" />
                            <p className="text-xs font-medium text-foreground">Cleaning paper background &amp; sharpening ink...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <i className="fa-solid fa-cloud-arrow-up text-base" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                              Click or drag signature photo here
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              PNG, JPG, or photo from white paper supported
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {signatureUrl && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">Preview:</span>
                        <div className="p-1.5 rounded bg-white border border-border max-w-[140px] inline-flex items-center justify-center">
                          <img src={signatureUrl} alt="Signature preview" className="max-h-8 object-contain" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {profileSignature && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowSignaturePad(false);
                              setUseProfileSig(true);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setShowSignaturePad(false);
                            setIncludeSignature(true);
                          }}
                          className="text-xs gap-1.5 cursor-pointer"
                        >
                          <i className="fa-solid fa-check text-[11px]" /> Affix to Invoice
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Invoice Preview Card */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <Card className="border-border/90 shadow-md bg-gradient-to-b from-card to-muted/20">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-eye text-primary text-xs" /> Live Invoice Preview
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    recipientInfo.scope === "external"
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                      : "bg-primary/10 text-primary border-primary/20"
                  )}
                >
                  {recipientInfo.scope === "external" ? "External Scope" : "Internal Scope"}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Header inside preview */}
              <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <div>
                  <p className="font-extrabold text-sm text-foreground">{venture}</p>
                  <p className="text-[10px] text-muted-foreground">Corporate Financial Office</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 inline-block">
                    {activeInvoiceNo}
                  </span>
                </div>
              </div>

              {/* Recipient block */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Billed To:</p>
                <p className="text-sm font-bold text-foreground">{recipientInfo.name}</p>
                {recipientInfo.company && <p className="text-[11px] text-muted-foreground">{recipientInfo.company}</p>}
                {recipientInfo.email && <p className="text-[11px] text-muted-foreground">{recipientInfo.email}</p>}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-muted/40 rounded-xl">
                <div>
                  <p className="text-[10px] text-muted-foreground">Issued Date</p>
                  <p className="font-semibold text-foreground">{issuedDate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Due Date</p>
                  <p className="font-semibold text-foreground">{dueDate}</p>
                </div>
              </div>

              {/* Summary of items */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Billing Category:</span>
                  <span className="font-semibold text-foreground">{category}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>Billing Model:</span>
                  <span className="font-semibold text-foreground capitalize">{billingModel}</span>
                </div>
              </div>

              {/* Total Amount Box */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Payable</p>
                  <p className="text-xl font-black text-primary">
                    {currency} {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Pending
                </span>
              </div>

              {/* Authorized Signature in Live Preview */}
              {includeSignature && effectiveSignature && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Authorized Signatory
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">
                      Digital Signature Affixed
                    </span>
                  </div>
                  <div className="inline-flex items-center justify-center">
                    <img src={effectiveSignature} alt="Authorized Signatory" className="max-h-8 max-w-[120px] object-contain mix-blend-multiply dark:mix-blend-screen" />
                  </div>
                </div>
              )}

              {/* Action */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full gap-2 font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-md py-5"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Creating Invoice...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles text-xs" /> Create Invoice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
          <i className="fa-solid fa-spinner fa-spin text-lg" />
          <span className="text-sm font-medium">Loading invoice generator...</span>
        </div>
      }
    >
      <NewInvoiceContent />
    </Suspense>
  );
}

