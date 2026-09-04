"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SendProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    _id?: string;
    proposalCode: string;
    subject: string;
    clientName: string;
    clientEmail?: string;
    clientCompany?: string;
    totalValue: number;
    currency: string;
  } | null;
  onSuccess?: () => void;
}

export default function SendProposalModal({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}: SendProposalModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (proposal && isOpen) {
      const publicLink = typeof window !== "undefined"
        ? `${window.location.origin}/proposals/${proposal._id}`
        : `/proposals/${proposal._id}`;

      setRecipientEmail(proposal.clientEmail || "");
      setCcEmail("");
      setSubject(`Proposal #${proposal.proposalCode}: ${proposal.subject}`);
      setMessage(
        `Dear ${proposal.clientName},\n\nWe are pleased to present our proposal for "${proposal.subject}".\n\nYou can review the complete scope, line-item breakdown, and electronically sign the proposal using our secure client portal:\n\n${publicLink}\n\nTotal Investment: ${proposal.currency} ${Number(proposal.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\nPlease let us know if you have any questions or require any adjustments.\n\nBest regards,\nNexAce Business Development Team`
      );
      setError(null);
    }
  }, [proposal, isOpen]);

  if (!isOpen || !proposal) return null;

  const publicLink = typeof window !== "undefined"
    ? `${window.location.origin}/proposals/${proposal._id}`
    : `/proposals/${proposal._id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInsertTag = (tag: string) => {
    setMessage((prev) => `${prev} ${tag}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) {
      setError("Recipient email is required");
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const res = await fetch("/api/bd/proposals/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal._id,
          recipientEmail,
          cc: ccEmail,
          subject,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <i className="fa-solid fa-paper-plane text-base" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Send Proposal via Email</h2>
              <p className="text-xs text-muted-foreground">
                Dispatch Proposal <span className="font-mono font-semibold text-foreground">#{proposal.proposalCode}</span> directly to client
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Proposal Summary Bar */}
          <div className="p-3.5 bg-muted/50 rounded-xl border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                #{proposal.proposalCode}
              </span>
              <div>
                <span className="font-semibold text-foreground block">{proposal.clientName}</span>
                {proposal.clientCompany && (
                  <span className="text-muted-foreground text-[11px]">{proposal.clientCompany}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground text-sm">
                {proposal.currency} {Number(proposal.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-background border border-border hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1.5 transition-colors"
              >
                <i className={cn("fa-solid text-[10px]", copiedLink ? "fa-check text-emerald-500" : "fa-link")} />
                {copiedLink ? "Link Copied" : "Copy Client Link"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                To (Recipient Email) <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@company.com"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                CC (Optional)
              </label>
              <Input
                type="text"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="accounts@yourfirm.com, team@yourfirm.com"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Email Subject <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Proposal Subject"
              className="h-9 text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground">Message Body</label>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Quick Tags:</span>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{client_name}")}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-mono"
                >
                  {`{client_name}`}
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{proposal_code}")}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-mono"
                >
                  {`{proposal_code}`}
                </button>
              </div>
            </div>
            <textarea
              rows={8}
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 font-sans leading-relaxed resize-y"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/40">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <i className="fa-solid fa-shield-halved text-primary" />
            Proposal status will be marked as <strong className="text-foreground">Sent</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSending}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={isSending}
              className="text-xs h-9 gap-2 shadow-xs"
            >
              {isSending ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane" />
                  Send Proposal Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
