"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface ProposalAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string | Date;
}

interface ProposalData {
  _id: string;
  proposalCode: string;
  subject: string;
  projectName?: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAvatarColor?: string;
  items?: ProposalItem[];
  attachments?: ProposalAttachment[];
  subtotal: number;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  totalValue: number;
  currency: string;
  issueDate: string;
  openTill: string;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
  signedBy?: string;
  signedAt?: string;
  signatureType?: "drawn" | "typed";
  signatureImage?: string;
  description?: string;
  terms?: string;
  tags?: string[];
  clientNotes?: string;
}

const STATUS_BADGES: Record<string, { label: string; cls: string; dot: string }> = {
  Accepted: { label: "Accepted & Signed", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dot: "bg-emerald-500" },
  Sent: { label: "Awaiting Client Response", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30", dot: "bg-sky-500" },
  Draft: { label: "Draft Proposal", cls: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
  Declined: { label: "Changes Requested / Declined", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", dot: "bg-rose-500" },
  Expired: { label: "Proposal Expired", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", dot: "bg-amber-500" },
};

function fmt(n: number) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function PublicProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [signType, setSignType] = useState<"drawn" | "typed">("drawn");
  const [signerName, setSignerName] = useState("");
  const [typedSignStyle, setTypedSignStyle] = useState<"cursive" | "formal" | "modern">("cursive");
  const [declineNotes, setDeclineNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Canvas drawing refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    async function fetchProposal() {
      try {
        setLoading(true);
        const res = await fetch(`/api/bd/proposals/public/${id}`);
        if (!res.ok) throw new Error("Proposal not found or link has expired");
        const data = await res.json();
        setProposal(data.proposal);
        setSignerName(data.proposal.clientName || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load proposal");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchProposal();
  }, [id]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#2563EB";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleClientAccept = async () => {
    if (!signerName.trim()) {
      alert("Please enter your full legal name to sign.");
      return;
    }
    if (!agreedToTerms) {
      alert("Please check the box to agree to the proposal terms.");
      return;
    }

    let signatureImage = "";
    if (signType === "drawn") {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        signatureImage = canvas.toDataURL("image/png");
      } else {
        alert("Please draw your signature on the pad.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/bd/proposals/public/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          signedBy: signerName.trim(),
          signatureType: signType,
          signatureImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit signature");

      setProposal(data.proposal);
      setShowSignModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to sign proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientDecline = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/bd/proposals/public/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline",
          clientNotes: declineNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update proposal");

      setProposal(data.proposal);
      setShowDeclineModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading proposal documents...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl">
            <i className="fa-solid fa-file-circle-xmark" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Proposal Not Available</h1>
          <p className="text-xs text-muted-foreground">{error || "This proposal does not exist or has been removed."}</p>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGES[proposal.status] || STATUS_BADGES.Draft;
  const isAccepted = proposal.status === "Accepted";
  const isDeclined = proposal.status === "Declined";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground py-8 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Client Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 bg-card border border-border/80 px-6 py-4 rounded-2xl shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md shadow-primary/20">
            N
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">NexAce Client Portal</h2>
            <p className="text-xs text-muted-foreground">Official Business Proposal</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs gap-1.5 h-9"
          >
            <i className="fa-solid fa-print text-muted-foreground" />
            Print / PDF
          </Button>

          {!isAccepted && !isDeclined && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeclineModal(true)}
                className="text-xs gap-1.5 h-9 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border-rose-500/30"
              >
                <i className="fa-solid fa-comment-dots" />
                Request Changes
              </Button>
              <Button
                size="sm"
                onClick={() => setShowSignModal(true)}
                className="text-xs gap-1.5 h-9 shadow-md shadow-primary/25 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <i className="fa-solid fa-signature" />
                Accept & Sign
              </Button>
            </>
          )}

          {isAccepted && (
            <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <i className="fa-solid fa-circle-check" />
              Signed & Accepted
            </div>
          )}
        </div>
      </div>

      {/* Main Document Canvas */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-border/90 rounded-3xl shadow-xl overflow-hidden print:border-none print:shadow-none print:m-0 print:p-0">
        {/* Banner Header */}
        <div className="p-8 sm:p-10 border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold font-mono tracking-wide">
                <span className={cn("w-2 h-2 rounded-full", badge.dot)} />
                <span className="text-foreground">#{proposal.proposalCode}</span>
                <span className="text-muted-foreground">·</span>
                <span className={badge.cls.split(" ")[1]}>{badge.label}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{proposal.subject}</h1>
              {proposal.projectName && (
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <i className="fa-solid fa-briefcase text-xs" />
                  Project: {proposal.projectName}
                </p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Total Investment</span>
              <span className="text-3xl font-black text-foreground tracking-tight">
                {proposal.currency} {fmt(proposal.totalValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Parties & Details Grid */}
        <div className="p-8 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-8 border-b border-border bg-muted/20">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block mb-2">Prepared For:</span>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">{proposal.clientName}</p>
              {proposal.clientCompany && <p className="text-xs font-semibold text-muted-foreground">{proposal.clientCompany}</p>}
              {proposal.clientEmail && <p className="text-xs text-muted-foreground">{proposal.clientEmail}</p>}
            </div>
          </div>

          <div className="sm:text-right space-y-2">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Issue Date</span>
              <p className="text-xs font-semibold text-foreground">{fmtDate(proposal.issueDate)}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Proposal Valid Until</span>
              <p className="text-xs font-semibold text-foreground">{fmtDate(proposal.openTill)}</p>
            </div>
          </div>
        </div>

        {/* Proposal Scope / Description */}
        {proposal.description && (
          <div className="p-8 sm:p-10 border-b border-border">
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <i className="fa-solid fa-align-left text-primary" />
              Executive Summary & Scope of Work
            </h3>
            <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-5 rounded-2xl border border-border/60">
              {proposal.description}
            </div>
          </div>
        )}

        {/* Itemized Table */}
        <div className="p-8 sm:p-10 border-b border-border">
          <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-4 flex items-center gap-2">
            <i className="fa-solid fa-list-check text-primary" />
            Deliverables & Cost Breakdown
          </h3>
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/60 border-b border-border font-bold text-muted-foreground">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Rate ({proposal.currency})</th>
                  <th className="py-3 px-4 text-right">Amount ({proposal.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(proposal.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{item.description}</td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-mono">{fmt(item.unitPrice)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono font-medium text-foreground">{proposal.currency} {fmt(proposal.subtotal)}</span>
              </div>
              {(proposal.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({proposal.discountType === "percent" ? `${proposal.discountValue}%` : "Fixed"}):</span>
                  <span className="font-mono font-medium">- {proposal.currency} {fmt(proposal.discountAmount || 0)}</span>
                </div>
              )}
              {(proposal.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({proposal.taxRate}%):</span>
                  <span className="font-mono font-medium text-foreground">{proposal.currency} {fmt(proposal.taxAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between font-black text-sm text-foreground">
                <span>Total Investment:</span>
                <span className="text-primary font-mono">{proposal.currency} {fmt(proposal.totalValue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms of Service */}
        {proposal.terms && (
          <div className="p-8 sm:p-10 border-b border-border bg-muted/10">
            <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <i className="fa-solid fa-file-contract text-primary" />
              Terms of Service & Conditions
            </h3>
            <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line p-4 rounded-xl bg-card border border-border/60 font-sans">
              {proposal.terms}
            </div>
          </div>
        )}

        {/* Signature Verification Block */}
        <div className="p-8 sm:p-10 bg-muted/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl border border-border bg-card">
            {isAccepted ? (
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-certificate" />
                  Legally Accepted & Electronically Signed
                </span>
                <p className="text-sm font-bold text-foreground">Signed by: {proposal.signedBy}</p>
                <p className="text-xs text-muted-foreground">Timestamp: {new Date(proposal.signedAt || "").toLocaleString()}</p>
                {proposal.signatureImage ? (
                  <div className="mt-3 p-2 bg-white rounded-xl border border-border inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proposal.signatureImage} alt="Signature" className="h-12 w-auto object-contain" />
                  </div>
                ) : (
                  <p className="text-lg font-serif italic text-primary mt-2">&ldquo;{proposal.signedBy}&rdquo;</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">Ready to initiate this collaboration?</span>
                <p className="text-xs text-muted-foreground">Click accept below to affix your electronic signature and lock in the proposal terms.</p>
              </div>
            )}

            {!isAccepted && !isDeclined && (
              <Button
                size="lg"
                onClick={() => setShowSignModal(true)}
                className="w-full sm:w-auto font-bold text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                <i className="fa-solid fa-file-signature text-sm" />
                Sign & Accept Proposal
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Sign & Accept Modal ── */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <i className="fa-solid fa-signature" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Sign & Accept Proposal</h3>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Full Legal Name <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="h-9 text-xs"
                />
              </div>

              {/* Signature Mode Toggle */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">Signature Style</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignType("drawn")}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                      signType === "drawn"
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className="fa-solid fa-pen-nib" />
                    Draw with Finger/Mouse
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignType("typed")}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all",
                      signType === "typed"
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className="fa-solid fa-keyboard" />
                    Type Signature
                  </button>
                </div>
              </div>

              {/* Canvas Pad */}
              {signType === "drawn" ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-muted-foreground">Draw inside the box below:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                    >
                      <i className="fa-solid fa-rotate-left text-[10px]" /> Clear
                    </button>
                  </div>
                  <div className="border border-border rounded-xl bg-white overflow-hidden shadow-inner cursor-crosshair">
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={130}
                      className="w-full h-32 touch-none block"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border bg-muted/30 text-center space-y-2">
                  <span className="text-xs text-muted-foreground">Signature Preview:</span>
                  <div className="text-2xl font-serif italic text-primary py-3">
                    {signerName.trim() ? signerName : "Your Signature Here"}
                  </div>
                </div>
              )}

              {/* Legal Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-[11px] text-muted-foreground leading-snug">
                  I confirm that I am authorized to accept this proposal on behalf of <strong className="text-foreground">{proposal.clientName}</strong> and agree to the specified terms and financial commitments.
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignModal(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClientAccept}
                disabled={isSubmitting || !agreedToTerms}
                className="text-xs h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check" />
                    Confirm & Sign
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Decline / Request Changes Modal ── */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <i className="fa-solid fa-comment-dots" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Request Changes / Feedback</h3>
              </div>
              <button
                onClick={() => setShowDeclineModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                Let the NexAce team know what changes or adjustments you require:
              </p>
              <textarea
                rows={4}
                value={declineNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeclineNotes(e.target.value)}
                placeholder="e.g. Can we adjust timeline to Q4? Or modify line item 2..."
                className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-sans resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeclineModal(false)}
                disabled={isSubmitting}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClientDecline}
                disabled={isSubmitting}
                className="text-xs h-9 gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
