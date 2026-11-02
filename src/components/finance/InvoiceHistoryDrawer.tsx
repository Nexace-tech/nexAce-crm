"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IInvoiceHistoryItem } from "@/models/FinanceInvoice";

export interface InvoiceHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNo?: string;
  clientName?: string;
  amount?: number;
  currency?: string;
  status?: string;
  isInternal?: boolean;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

type TimelineFilter = "All" | "Note" | "Email" | "Call" | "Meeting" | "Payment" | "StatusChange";

const typeConfig: Record<string, { icon: string; color: string; bg: string; badge: string }> = {
  Note: {
    icon: "fa-solid fa-note-sticky",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/30",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  },
  Email: {
    icon: "fa-solid fa-envelope",
    color: "text-sky-500",
    bg: "bg-sky-500/10 border-sky-500/30",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
  },
  Call: {
    icon: "fa-solid fa-phone",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  },
  Meeting: {
    icon: "fa-solid fa-video",
    color: "text-purple-500",
    bg: "bg-purple-500/10 border-purple-500/30",
    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30",
  },
  Payment: {
    icon: "fa-solid fa-receipt",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  },
  StatusChange: {
    icon: "fa-solid fa-sliders",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/30",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
  },
  Audit: {
    icon: "fa-solid fa-shield-halved",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10 border-indigo-500/30",
    badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30",
  },
};

export function InvoiceHistoryDrawer({
  isOpen,
  onClose,
  invoiceId,
  invoiceNo,
  clientName,
  amount,
  currency = "INR",
  status,
  isInternal,
  showToast,
}: InvoiceHistoryDrawerProps) {
  const [history, setHistory] = useState<IInvoiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TimelineFilter>("All");

  // Interaction Logger States
  const [showLogForm, setShowLogForm] = useState(false);
  const [logType, setLogType] = useState<"Note" | "Email" | "Call" | "Meeting" | "Payment">("Note");
  const [logTitle, setLogTitle] = useState("");
  const [logSummary, setLogSummary] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchHistory();
    }
  }, [isOpen, invoiceId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/invoices/${encodeURIComponent(invoiceId)}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      } else {
        const err = await res.json();
        showToast?.(err.error || "Failed to load invoice history", "error");
      }
    } catch {
      showToast?.("Error loading invoice history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() || !logSummary.trim()) {
      showToast?.("Please provide both a title and details.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const attachments = attachmentUrl.trim()
        ? [{ name: attachmentName.trim() || "Attachment", url: attachmentUrl.trim() }]
        : [];

      const res = await fetch(`/api/finance/invoices/${encodeURIComponent(invoiceId)}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: logType,
          category: isInternal ? "Internal" : "External",
          title: logTitle.trim(),
          summary: logSummary.trim(),
          attachments,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast?.("Interaction logged to invoice timeline!", "success");
        setLogTitle("");
        setLogSummary("");
        setAttachmentUrl("");
        setAttachmentName("");
        setShowLogForm(false);
        if (data.historyItem) {
          setHistory((prev) => [data.historyItem, ...prev]);
        } else {
          fetchHistory();
        }
      } else {
        const err = await res.json();
        showToast?.(err.error || "Failed to log interaction", "error");
      }
    } catch {
      showToast?.("Error logging interaction", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filter === "All") return true;
    return item.type === filter;
  });

  if (!isOpen) return null;

  const currSymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "₹";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer Container */}
      <div className="relative w-full sm:w-[480px] md:w-[540px] bg-card border-l border-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-card/95 backdrop-blur-md shrink-0 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {invoiceNo || invoiceId}
                </span>
                {status && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border",
                      status === "Paid"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : status === "Approved"
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
                        : status === "Rejected"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    )}
                  >
                    {status}
                  </span>
                )}
                <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                  {isInternal ? "Internal / Staff" : "External / Corporate"}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                {clientName ? `Invoice History: ${clientName}` : "Invoice Interaction History"}
              </h3>
              {amount !== undefined && (
                <p className="text-xs font-mono text-muted-foreground">
                  Total Value:{" "}
                  <strong className="text-foreground font-bold">
                    {currSymbol}
                    {amount.toLocaleString()}
                  </strong>
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchHistory}
                disabled={loading}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                title="Refresh history"
              >
                <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>
          </div>

          {/* Quick Action Logger Toggle */}
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
              <i className="fa-solid fa-timeline text-primary text-xs" /> Complete Activity &amp; Audit Trail
            </span>
            <Button
              size="sm"
              variant={showLogForm ? "outline" : "default"}
              onClick={() => setShowLogForm(!showLogForm)}
              className="h-7 px-2.5 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <i className={cn("fa-solid text-[10px]", showLogForm ? "fa-xmark" : "fa-plus")} />
              {showLogForm ? "Cancel" : "Log Interaction"}
            </Button>
          </div>
        </div>

        {/* Collapsible Interaction Logger Form */}
        {showLogForm && (
          <form
            onSubmit={handleAddLog}
            className="p-4 bg-muted/40 border-b border-border space-y-3 shrink-0 animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-pen-to-square text-primary text-xs" /> Log New Communication / Note
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Recorded into History
              </span>
            </div>

            {/* Type Selector Pills */}
            <div className="grid grid-cols-5 gap-1 bg-background border border-border p-1 rounded-lg text-center">
              {(["Note", "Email", "Call", "Meeting", "Payment"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLogType(type)}
                  className={cn(
                    "py-1 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    logType === type
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <i className={cn(typeConfig[type]?.icon, "text-[10px]")} />
                  <span className="hidden sm:inline">{type}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">Subject / Headline</label>
              <Input
                type="text"
                value={logTitle}
                onChange={(e) => setLogTitle(e.target.value)}
                placeholder={`e.g. Follow-up regarding ${logType.toLowerCase()} discussion`}
                required
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">Interaction Summary</label>
              <textarea
                value={logSummary}
                onChange={(e) => setLogSummary(e.target.value)}
                placeholder={`Detailed description, takeaways, payment confirmation details, or client discussion notes...`}
                rows={3}
                required
                className="w-full text-xs bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Attachment URL (Optional)</label>
                <Input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://... receipt or document"
                  className="h-7 text-[11px] bg-background font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-muted-foreground">Attachment Name</label>
                <Input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. Bank Payment Proof.pdf"
                  className="h-7 text-[11px] bg-background"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowLogForm(false)}
                className="h-7 px-3 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-7 px-3 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className={cn("fa-solid text-[10px]", submitting ? "fa-circle-notch animate-spin" : "fa-check")} />
                {submitting ? "Saving..." : `Save ${logType}`}
              </Button>
            </div>
          </form>
        )}

        {/* Filter Pills Strip */}
        <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1 shrink-0">Filter:</span>
          {(["All", "Note", "Email", "Call", "Meeting", "Payment", "StatusChange"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1",
                filter === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-background/80 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
              )}
            >
              {cat !== "All" && <i className={cn(typeConfig[cat]?.icon, "text-[9px]")} />}
              <span>{cat === "StatusChange" ? "Status & System" : cat}</span>
              {cat === "All" && (
                <span className="ml-0.5 px-1 py-0.2 rounded-full bg-primary-foreground/20 text-[9px]">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Vertical Timeline Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
          {loading && history.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <i className="fa-solid fa-circle-notch animate-spin text-xl text-primary" />
              <p>Loading invoice timeline &amp; activity history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border bg-muted/10 text-xs text-muted-foreground space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <i className="fa-solid fa-clock-rotate-left text-sm" />
              </div>
              <p className="font-semibold text-foreground">No matching history entries found</p>
              <p className="text-[11px]">
                {filter !== "All"
                  ? `No logs categorized as "${filter}". Try selecting "All" or log a new interaction.`
                  : "Log calls, client emails, status updates, or payment proofs to build an audit trail."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogForm(true)}
                className="mt-2 text-xs font-bold gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[10px]" /> Log First Interaction
              </Button>
            </div>
          ) : (
            <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
              {filteredHistory.map((item, idx) => {
                const conf = typeConfig[item.type] || typeConfig.Note;
                const d = new Date(item.date);
                const formattedDate = d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const formattedTime = d.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={String(item._id || idx)} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={cn(
                        "absolute -left-6 top-1 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] shadow-2xs transition-transform group-hover:scale-110",
                        conf.bg,
                        conf.color
                      )}
                      title={item.type}
                    >
                      <i className={conf.icon} />
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-background/90 border border-border/80 hover:border-primary/40 rounded-xl p-3.5 space-y-2 shadow-2xs transition-all">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", conf.badge)}>
                            <i className={cn(conf.icon, "mr-1 text-[9px]")} />
                            {item.type === "StatusChange" ? "Status Update" : item.type}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            by <strong className="text-foreground">{item.authorName}</strong>{" "}
                            {item.authorRole && `(${item.authorRole})`}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                          <i className="fa-regular fa-clock text-[9px]" />
                          <span>{formattedDate}</span>
                          <span>&bull;</span>
                          <span>{formattedTime}</span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-foreground leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Attachments if any */}
                      {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                        <div className="pt-1.5 border-t border-border/60 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                            <i className="fa-solid fa-paperclip text-[9px]" /> Attachment:
                          </span>
                          {item.attachments.map((att, aIdx) => (
                            <a
                              key={aIdx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20"
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                              <span className="truncate max-w-[200px]">{att.name || "View Document"}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-card/95 shrink-0 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {history.length} event{history.length !== 1 ? "s" : ""} recorded
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 px-3 text-xs cursor-pointer">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

