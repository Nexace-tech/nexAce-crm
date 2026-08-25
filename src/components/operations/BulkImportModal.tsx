"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultTarget?: "clients" | "deals";
}

export function BulkImportModal({ isOpen, onClose, onSuccess, defaultTarget = "clients" }: BulkImportModalProps) {
  const [targetEntity, setTargetEntity] = useState<"clients" | "deals">(defaultTarget);
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  if (!isOpen) return null;

  // ── CSV Template Generator ──────────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sampleRows: string[][] = [];

    if (targetEntity === "clients") {
      headers = [
        "clientAccount",
        "projectName",
        "venture",
        "deliveryOwner",
        "phase",
        "priority",
        "billingType",
        "monthlyValue",
        "estHours",
        "actualHours",
        "health",
        "notes",
      ];
      sampleRows = [
        ["Acme Global Corp", "Enterprise Digital Transformation", "Ace Consultancys", "John Smith", "In Delivery", "High", "Retainer", "25000", "120", "45", "Green", "Strategic multi-quarter initiative"],
        ["NovaWave Systems", "Cloud Infrastructure Modernization", "Ace Consultancys", "Isabella Cooper", "In Delivery", "Medium", "Project", "18500", "80", "30", "Green", "Phase 2 migration underway"],
        ["Starlight Ventures", "AI Workflow Automation", "Ace Consultancys", "Robert Johnson", "On Hold", "High", "Retainer", "15000", "60", "10", "Amber", "Awaiting client API credentials"],
      ];
    } else {
      headers = [
        "clientAccount",
        "dealName",
        "dealValue",
        "stage",
        "probability",
        "owner",
        "expectedClose",
        "venture",
        "notes",
      ];
      sampleRows = [
        ["Apex Digital", "Brand Revamp 2026", "48000", "Proposal Sent", "65", "Sara Khan", "2026-09-30", "Ace Consultancys", "Sent proposal to leadership"],
        ["NovaTech Solutions", "ERP Integration Q3", "95000", "Negotiation", "80", "Ahmed Raza", "2026-08-31", "Ace Consultancys", "Final terms review"],
        ["Greenfield Corp", "HR Module Deployment", "22000", "Discovery", "40", "Omar Malik", "2026-10-15", "Ace Consultancys", "Discovery session booked"],
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...sampleRows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexace_${targetEntity}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Smart Raw Text Parser ───────────────────────────────────────────────────
  const parseRawText = (rawText: string) => {
    setParseError("");
    setParsedRows([]);
    setRawHeaders([]);

    const text = rawText.trim();
    if (!text) {
      setParseError("Please provide CSV or JSON text to parse.");
      return;
    }

    // 1. JSON Array Parser
    if (text.startsWith("[") && text.endsWith("]")) {
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json) && json.length > 0) {
          const headers = Object.keys(json[0]);
          setRawHeaders(headers);
          setParsedRows(json);
          return;
        }
      } catch {
        // Fallthrough to CSV
      }
    }

    // 2. CSV / TSV / Semicolon Parser
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setParseError("Data must contain at least a header row and 1 data row.");
        return;
      }

      const firstLine = lines[0];
      const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

      const headers = lines[0]
        .split(delimiter)
        .map(h => h.replace(/^["']|["']$/g, "").trim());

      setRawHeaders(headers);
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const regex = new RegExp(`(?:${delimiter}|\\r?\\n|^)(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}\\r\\n]*))`, "gi");
        const values: string[] = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
          let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
          if (val !== undefined) values.push(val.trim());
        }

        const rowVals = values.length >= headers.length ? values : line.split(delimiter).map(v => v.replace(/^["']|["']$/g, "").trim());

        const rowObj: any = { id: `row-${i}` };
        headers.forEach((h, colIdx) => {
          rowObj[h] = rowVals[colIdx] || "";
        });

        // Normalize expected attributes
        const clientAccount = rowObj.clientAccount || rowObj["Client Account"] || rowObj.client || rowObj.company || rowObj.name;
        const projectName = rowObj.projectName || rowObj["Project Name"] || rowObj.dealName || rowObj["Deal Name"] || rowObj.project || `${clientAccount || "Account"} Delivery`;
        const value = Number(rowObj.monthlyValue || rowObj.dealValue || rowObj["Monthly Value"] || rowObj["Deal Value"] || rowObj.value || 15000);

        if (clientAccount) {
          rows.push({
            ...rowObj,
            clientAccount,
            projectName,
            dealName: projectName,
            monthlyValue: value,
            dealValue: value,
            venture: rowObj.venture || rowObj.Venture || "Ace Consultancys",
            deliveryOwner: rowObj.deliveryOwner || rowObj["Delivery Owner"] || rowObj.owner || "Admin",
            owner: rowObj.owner || rowObj.deliveryOwner || "Admin",
            phase: rowObj.phase || rowObj.Phase || (targetEntity === "deals" ? "Proposal Sent" : "In Delivery"),
            stage: rowObj.stage || rowObj.Stage || "Prospecting",
            priority: rowObj.priority || rowObj.Priority || "Medium",
            billingType: rowObj.billingType || rowObj["Billing Type"] || "Retainer",
            estHours: Number(rowObj.estHours || rowObj["Est Hours"] || 40),
            actualHours: Number(rowObj.actualHours || rowObj["Actual Hours"] || 0),
            health: rowObj.health || rowObj.Health || "Green",
            probability: Number(rowObj.probability) || 60,
            notes: rowObj.notes || rowObj.Notes || "Bulk imported",
          });
        }
      }

      if (rows.length === 0) {
        setParseError("Could not extract valid records. Ensure header has 'clientAccount' or 'company'.");
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setParseError(`Parser error: ${err.message || "Invalid tabular format"}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseRawText(content);
    };
    reader.readAsText(file);
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, idx) => idx !== index));
  };

  // ── Calculated Statistics ───────────────────────────────────────────────────
  const totalValueSum = useMemo(() => {
    return parsedRows.reduce((sum, r) => sum + (Number(r.monthlyValue || r.dealValue) || 0), 0);
  }, [parsedRows]);

  const uniqueClientsCount = useMemo(() => {
    return new Set(parsedRows.map(r => r.clientAccount)).size;
  }, [parsedRows]);

  const filteredPreviewRows = useMemo(() => {
    if (!filterQuery.trim()) return parsedRows;
    const q = filterQuery.toLowerCase();
    return parsedRows.filter(r =>
      (r.clientAccount && r.clientAccount.toLowerCase().includes(q)) ||
      (r.projectName && r.projectName.toLowerCase().includes(q)) ||
      (r.deliveryOwner && r.deliveryOwner.toLowerCase().includes(q))
    );
  }, [parsedRows, filterQuery]);

  // ── Submit Bulk Import ──────────────────────────────────────────────────────
  const handleBulkSubmit = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    setParseError("");
    setProgressPercent(20);

    const endpoint = targetEntity === "clients" ? "/api/clients" : "/api/operations/sales-deals";

    try {
      setProgressPercent(60);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk: true,
          items: parsedRows,
        }),
      });

      const result = await res.json();
      setProgressPercent(100);

      if (res.ok) {
        setSuccessMessage(`Successfully imported ${result.count || parsedRows.length} ${targetEntity === "clients" ? "client accounts" : "sales deals"}!`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setParseError(result.error || "Failed to commit records to database.");
      }
    } catch (err: any) {
      setParseError(err.message || "Failed to connect to database server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#161c24] border border-[#232d3b] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ── Modal Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232d3b] bg-[#11161d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00c5a0]/15 text-[#00c5a0] flex items-center justify-center font-bold text-base shadow-sm">
              <i className="fa-solid fa-file-import" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">Bulk Data Importer</h2>
              <p className="text-xs text-slate-400 m-0">Import client retainers or sales deals into Operational Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1e2632] transition-colors cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* ── Modal Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Target Module Selector & Mode Switcher */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#11161d] border border-[#232d3b]">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                <i className="fa-solid fa-bullseye text-[#00c5a0] mr-1.5" /> Destination Module:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTargetEntity("clients")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2",
                    targetEntity === "clients"
                      ? "bg-[#00c5a0]/15 border-[#00c5a0] text-[#00c5a0] shadow-xs"
                      : "bg-[#161c24] border-[#232d3b] text-slate-400 hover:text-white"
                  )}
                >
                  <i className="fa-solid fa-layer-group text-[11px]" /> Client Retainers
                </button>
                <button
                  type="button"
                  onClick={() => setTargetEntity("deals")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2",
                    targetEntity === "deals"
                      ? "bg-[#00c5a0]/15 border-[#00c5a0] text-[#00c5a0] shadow-xs"
                      : "bg-[#161c24] border-[#232d3b] text-slate-400 hover:text-white"
                  )}
                >
                  <i className="fa-solid fa-handshake text-[11px]" /> Sales Pipeline Deals
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                <i className="fa-solid fa-cloud-arrow-up text-[#0ea5e9] mr-1.5" /> Input Method:
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode("file")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2",
                    importMode === "file"
                      ? "bg-[#0ea5e9]/15 border-[#0ea5e9] text-[#0ea5e9] shadow-xs"
                      : "bg-[#161c24] border-[#232d3b] text-slate-400 hover:text-white"
                  )}
                >
                  <i className="fa-solid fa-file-csv text-[11px]" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("paste")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-2",
                    importMode === "paste"
                      ? "bg-[#0ea5e9]/15 border-[#0ea5e9] text-[#0ea5e9] shadow-xs"
                      : "bg-[#161c24] border-[#232d3b] text-slate-400 hover:text-white"
                  )}
                >
                  <i className="fa-solid fa-paste text-[11px]" /> Copy-Paste Text
                </button>
              </div>
            </div>
          </div>

          {/* Quick Template Download Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1e2632]/50 border border-[#232d3b] text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <i className="fa-solid fa-circle-info text-[#00c5a0]" />
              <span>Need the proper format? Download our pre-formatted spreadsheet template.</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 text-xs border-[#232d3b] bg-[#161c24] text-slate-200 hover:text-[#00c5a0] hover:bg-[#1e2632] cursor-pointer"
            >
              <i className="fa-solid fa-download text-[#00c5a0]" /> Download {targetEntity === "clients" ? "Client" : "Deal"} Template (.csv)
            </Button>
          </div>

          {/* Input Area: Mode 1 (File Upload) */}
          {importMode === "file" && (
            <div className="border-2 border-dashed border-[#232d3b] hover:border-[#00c5a0]/60 rounded-xl p-8 text-center bg-[#11161d]/50 transition-colors">
              <input
                type="file"
                id="bulk-file-upload"
                accept=".csv, .txt, .json, .tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="bulk-file-upload" className="cursor-pointer block">
                <div className="w-12 h-12 rounded-full bg-[#00c5a0]/15 text-[#00c5a0] flex items-center justify-center mx-auto mb-3 text-xl">
                  <i className="fa-solid fa-cloud-arrow-up" />
                </div>
                <p className="text-sm font-bold text-white m-0 mb-1">
                  {fileName ? fileName : "Click to select or drag CSV / Excel export here"}
                </p>
                <p className="text-xs text-slate-400 m-0">Supports .CSV, .TSV, .TXT, and .JSON tabular files</p>
              </label>
            </div>
          )}

          {/* Input Area: Mode 2 (Paste Text) */}
          {importMode === "paste" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Paste Table Data (CSV or Copied Cells from Excel):</label>
                <span className="text-[11px] text-slate-500">Auto-detects commas, tabs, and semicolons</span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => {
                  setPastedText(e.target.value);
                  parseRawText(e.target.value);
                }}
                placeholder={targetEntity === "clients"
                  ? "clientAccount,projectName,venture,deliveryOwner,phase,monthlyValue&#10;Acme Corp,Enterprise Cloud,Ace Consultancys,John Smith,In Delivery,25000&#10;NovaWave,AI Integration,Ace Consultancys,Isabella Cooper,In Delivery,18000"
                  : "clientAccount,dealName,dealValue,stage,probability,owner&#10;Apex Digital,Brand Revamp 2026,48000,Proposal Sent,65,Sara Khan&#10;NovaTech,ERP Integration Q3,95000,Negotiation,80,Ahmed Raza"}
                className="w-full p-3.5 text-xs font-mono bg-[#11161d] border border-[#232d3b] rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#00c5a0]"
              />
            </div>
          )}

          {/* Progress / Status feedback */}
          {parseError && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-sm shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 font-bold">
              <i className="fa-solid fa-circle-check text-base shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── Live Data Summary & Preview Grid ─────────────────────────────── */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              
              {/* Summary Metric Chips */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#11161d] border border-[#232d3b] text-center">
                  <p className="text-[11px] text-slate-400 m-0">Total Records</p>
                  <p className="text-lg font-black text-white m-0 mt-0.5">{parsedRows.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#11161d] border border-[#232d3b] text-center">
                  <p className="text-[11px] text-slate-400 m-0">Total Value ($)</p>
                  <p className="text-lg font-black text-[#00c5a0] m-0 mt-0.5">${totalValueSum.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#11161d] border border-[#232d3b] text-center">
                  <p className="text-[11px] text-slate-400 m-0">Unique Clients</p>
                  <p className="text-lg font-black text-[#0ea5e9] m-0 mt-0.5">{uniqueClientsCount}</p>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-table text-[#00c5a0]" /> Preview Records ({filteredPreviewRows.length} shown)
                </span>
                <input
                  type="text"
                  placeholder="Filter preview rows..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="px-3 py-1 text-xs bg-[#11161d] border border-[#232d3b] rounded-lg text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#00c5a0] w-full sm:w-56"
                />
              </div>

              {/* Interactive Preview Table */}
              <div className="max-h-56 overflow-x-auto overflow-y-auto border border-[#232d3b] rounded-xl bg-[#11161d]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1a222d] border-b border-[#232d3b] text-slate-400 font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Client Account</th>
                      <th className="py-2.5 px-3">{targetEntity === "clients" ? "Project Name" : "Deal Name"}</th>
                      <th className="py-2.5 px-3">Owner</th>
                      <th className="py-2.5 px-3">{targetEntity === "clients" ? "Phase" : "Stage"}</th>
                      <th className="py-2.5 px-3 text-right">Value ($)</th>
                      <th className="py-2.5 px-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232d3b]">
                    {filteredPreviewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#161c24] text-slate-300 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{row.clientAccount}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.projectName || row.dealName}</td>
                        <td className="py-2.5 px-3 text-slate-400">{row.deliveryOwner || row.owner}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-[#00c5a0]/15 text-[#00c5a0] text-[10px] font-bold">
                            {targetEntity === "clients" ? row.phase : row.stage}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          ${Number(row.monthlyValue || row.dealValue || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                            title="Remove row"
                          >
                            <i className="fa-solid fa-trash-can text-xs" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#232d3b] bg-[#11161d]">
          <span className="text-xs text-slate-400">
            {parsedRows.length > 0
              ? `${parsedRows.length} ${targetEntity === "clients" ? "clients" : "deals"} ready to insert into MongoDB`
              : "Upload a file or paste data to start"}
          </span>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-[#1e2632] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkSubmit}
              disabled={parsedRows.length === 0 || isSubmitting}
              className="bg-[#00c5a0] hover:bg-[#00b08e] text-slate-950 font-bold gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Importing ({progressPercent}%)...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" /> Commit {parsedRows.length > 0 ? `(${parsedRows.length})` : ""} to Database
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
