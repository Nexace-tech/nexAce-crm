"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedLeadRow {
  leadName: string;
  companyName: string;
  value?: number;
  currency?: string;
  status?: string;
  stage?: string;
  leadType?: "Internal" | "External";
  phone?: string;
  email?: string;
  location?: string;
  owner?: string;
  source?: string;
  notes?: string;
}

export function LeadImportModal({ isOpen, onClose, onSuccess }: LeadImportModalProps) {
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "allow">("skip");
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // ── Download Sample CSV Template ──────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const headers = [
      "Lead Name",
      "Company",
      "Deal Value",
      "Currency",
      "Status",
      "Stage",
      "Lead Type",
      "Phone",
      "Email",
      "Location",
      "Owner",
      "Source",
      "Notes",
    ];
    const sampleRows = [
      [
        "Alexander Vance",
        "Apex Digital Labs",
        "450000",
        "USD",
        "Contacted",
        "Schedule Service",
        "External",
        "+1 555-019-2834",
        "vance@apexdigital.com",
        "New York, USA",
        "",
        "Inbound Web",
        "Interested in enterprise CRM migration",
      ],
      [
        "Beatriz Ramos",
        "Solaria Renewable",
        "280000",
        "EUR",
        "New",
        "Inpipeline",
        "Internal",
        "+34 912-849-201",
        "b.ramos@solaria.eu",
        "Madrid, Spain",
        "",
        "Partner Referral",
        "Q3 technology audit candidate",
      ],
      [
        "Hamza Siddiqui",
        "Karachi FinTech Group",
        "7500000",
        "PKR",
        "Qualified",
        "Follow Up",
        "External",
        "+92 300-1234567",
        "hamza@kfg.com.pk",
        "Karachi, Pakistan",
        "",
        "Direct Outreach",
        "High-priority core banking client",
      ],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...sampleRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nexace_leads_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Robust CSV Line Parser ────────────────────────────────────────────────
  const parseCSVText = (text: string) => {
    setParseError("");
    const lines = text
      .split(/\r\n|\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length < 2) {
      setParseError("CSV must contain at least one header row and one data row.");
      setParsedRows([]);
      return;
    }

    // Parse header row
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

    const matchedFields: string[] = [];
    headers.forEach(h => {
      if ((h.includes("leadname") || h === "name" || h === "fullname" || h === "lead") && !matchedFields.includes("Lead Name")) matchedFields.push("Lead Name");
      else if ((h.includes("company") || h === "client" || h === "organization") && !matchedFields.includes("Company")) matchedFields.push("Company");
      else if ((h.includes("value") || h.includes("dealvalue") || h.includes("amount")) && !matchedFields.includes("Deal Value")) matchedFields.push("Deal Value");
      else if (h.includes("currency") && !matchedFields.includes("Currency")) matchedFields.push("Currency");
      else if (h.includes("status") && !matchedFields.includes("Status")) matchedFields.push("Status");
      else if (h.includes("stage") && !matchedFields.includes("Stage")) matchedFields.push("Stage");
      else if ((h.includes("type") || h.includes("leadtype")) && !matchedFields.includes("Lead Type")) matchedFields.push("Lead Type");
      else if ((h.includes("phone") || h.includes("mobile") || h.includes("tel")) && !matchedFields.includes("Phone")) matchedFields.push("Phone");
      else if ((h.includes("email") || h.includes("mail")) && !matchedFields.includes("Email")) matchedFields.push("Email");
      else if ((h.includes("location") || h.includes("city") || h.includes("country")) && !matchedFields.includes("Location")) matchedFields.push("Location");
    });
    setDetectedFields(matchedFields);

    const rows: ParsedLeadRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;

      const lead: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        const val = values[colIdx] || "";
        if (h.includes("leadname") || h === "name" || h === "fullname" || h === "lead") lead.leadName = val;
        else if (h.includes("company") || h === "client" || h === "organization") lead.companyName = val;
        else if (h.includes("value") || h.includes("dealvalue") || h.includes("amount")) lead.value = Number(val.replace(/[^0-9.]/g, "")) || 0;
        else if (h.includes("currency")) lead.currency = val.toUpperCase().trim() || "USD";
        else if (h.includes("status")) lead.status = val;
        else if (h.includes("stage")) lead.stage = val;
        else if (h.includes("type") || h.includes("leadtype")) lead.leadType = val.toLowerCase().includes("internal") ? "Internal" : "External";
        else if (h.includes("phone") || h.includes("mobile") || h.includes("tel")) lead.phone = val;
        else if (h.includes("email") || h.includes("mail")) lead.email = val;
        else if (h.includes("location") || h.includes("city") || h.includes("country")) lead.location = val;
        else if (h.includes("owner") || h.includes("assigned")) lead.owner = val;
        else if (h.includes("source")) lead.source = val;
        else if (h.includes("note")) lead.notes = val;
      });

      // Fallbacks if only first two columns were provided without exact header names
      if (!lead.leadName && values[0]) lead.leadName = values[0];
      if (!lead.companyName && values[1]) lead.companyName = values[1];

      if (lead.leadName || lead.companyName) {
        rows.push({
          leadName: lead.leadName || "Untitled Lead",
          companyName: lead.companyName || "Independent",
          value: lead.value || 0,
          currency: lead.currency || "USD",
          status: lead.status || "New",
          stage: lead.stage || "Inpipeline",
          leadType: lead.leadType || "External",
          phone: lead.phone || "",
          email: lead.email || "",
          location: lead.location || "",
          owner: lead.owner || "",
          source: lead.source || "CSV Import",
          notes: lead.notes || "",
        });
      }
    }

    let finalRows = rows;
    if (duplicateStrategy === "skip") {
      const seen = new Set<string>();
      finalRows = rows.filter(r => {
        const key = (r.email || r.phone || r.leadName + r.companyName).toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (finalRows.length === 0) {
      setParseError("No valid rows could be extracted from the provided data.");
      setParsedRows([]);
    } else {
      setParsedRows(finalRows);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      parseCSVText(content || "");
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (val: string) => {
    setPastedText(val);
    if (val.trim().length > 0) {
      parseCSVText(val);
    } else {
      setParsedRows([]);
    }
  };

  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    setParseError("");
    try {
      const res = await fetch("/api/bd/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: parsedRows }),
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setParseError(data.error || "Failed to import leads.");
      }
    } catch {
      setParseError("Network error while importing leads.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <i className="fa-solid fa-file-import text-sm" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Import Leads</h3>
              <p className="text-xs text-muted-foreground">Upload CSV spreadsheet or paste comma-separated rows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Mode Switcher & Download Sample */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 w-fit">
              <button
                type="button"
                onClick={() => setImportMode("file")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  importMode === "file" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-cloud-arrow-up text-[10px]" /> Upload CSV
              </button>
              <button
                type="button"
                onClick={() => setImportMode("paste")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  importMode === "paste" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-paste text-[10px]" /> Paste Raw CSV
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <i className="fa-solid fa-download text-[11px]" /> Download Sample CSV
            </button>
          </div>

          {/* File Upload Zone */}
          {importMode === "file" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2",
                  fileName
                    ? "border-primary/60 bg-primary/[0.04]"
                    : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg">
                  <i className="fa-solid fa-file-csv" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {fileName ? fileName : "Click to select a CSV file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fileName ? "Click to change file" : "Compatible with Excel, Google Sheets, or CRMS exports"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Paste Raw CSV */}
          {importMode === "paste" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Paste CSV Lines (First row must be headers)
              </label>
              <textarea
                rows={5}
                value={pastedText}
                onChange={e => handlePasteChange(e.target.value)}
                placeholder="Lead Name,Company,Deal Value,Currency,Phone,Email,Status&#10;Alice Smith,Acme Corp,150000,USD,+1 555-0100,alice@acme.com,New"
                className="w-full rounded-xl border border-input bg-background font-mono text-xs px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl p-3 text-xs flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-sm shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Duplicate Strategy & Field Mapping Chips */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/30 border border-border/60 rounded-xl p-3 text-xs">
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-filter text-primary text-[10px]" /> Duplicate Handling
                  </p>
                  <p className="text-[11px] text-muted-foreground">Skip leads with matching email or phone</p>
                </div>
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy("skip")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                      duplicateStrategy === "skip" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Skip Duplicates
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateStrategy("allow")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                      duplicateStrategy === "allow" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Import All
                  </button>
                </div>
              </div>

              {detectedFields.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
                    Detected Columns ({detectedFields.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedFields.map(f => (
                      <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <i className="fa-solid fa-check text-[9px]" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Parsed Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-table text-primary text-[11px]" />
                  Preview: Ready to import <strong className="text-primary font-mono">{parsedRows.length}</strong> leads
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Showing first {Math.min(5, parsedRows.length)} rows
                </span>
              </div>
              <div className="border border-border/70 rounded-xl overflow-hidden shadow-2xs max-h-48 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/40 border-b border-border/60 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Lead</th>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Company</th>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Value</th>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Status</th>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-semibold text-foreground truncate max-w-[120px]">{row.leadName}</td>
                        <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">{row.companyName}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-foreground">
                          {row.currency || "USD"} {Number(row.value || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-muted/60 text-foreground border border-border/60">
                            {row.status || "New"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                            row.leadType === "Internal" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-sky-500/10 text-sky-500 border-sky-500/20"
                          )}>
                            {row.leadType || "External"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/70 shrink-0 bg-muted/10">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCommitImport}
            disabled={parsedRows.length === 0 || isSubmitting}
            className="gap-2 font-bold cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" /> Importing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-import text-xs" /> Import {parsedRows.length} Leads
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
