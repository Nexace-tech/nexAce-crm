"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";

interface ImportHolidayExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface ParsedRow {
  title: string;
  date: string;
  type: "Mandatory" | "Restricted" | "Company";
  category: "National" | "Religious" | "Cultural" | "Corporate";
  applicableDepartments?: string;
  locations?: string;
  isHalfDay?: boolean;
  description?: string;
  isValid: boolean;
  errorReason?: string;
}

export default function ImportHolidayExcelModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportHolidayExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Generate & download sample Excel template
  const handleDownloadSampleTemplate = () => {
    const headers = [
      "Title",
      "Date",
      "Type",
      "Category",
      "Departments",
      "Locations",
      "Is Half Day",
      "Description",
    ];

    const sampleRows = [
      ["Republic Day", "2026-01-26", "Mandatory", "National", "All", "", "No", "Constitution celebration"],
      ["Holi", "2026-03-04", "Mandatory", "Cultural", "All", "", "No", "Festival of colors"],
      ["Good Friday", "2026-04-03", "Mandatory", "Religious", "All", "", "No", "Easter weekend"],
      ["Independence Day", "2026-08-15", "Mandatory", "National", "All", "", "No", "National Independence Day"],
      ["Diwali", "2026-11-08", "Mandatory", "Cultural", "All", "", "No", "Festival of lights"],
      ["Christmas Eve", "2026-12-24", "Company", "Corporate", "All", "", "Yes", "Optional half day celebration"],
      ["Christmas Day", "2026-12-25", "Mandatory", "Religious", "All", "", "No", "Christmas holiday"],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    // Set nice column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 35 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holidays");
    XLSX.writeFile(wb, "NexAce_Holiday_Import_Template.xlsx");
  };

  // 2. Parse uploaded file
  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    setImportError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setImportError("The uploaded file does not contain any data rows.");
          setIsProcessing(false);
          return;
        }

        const rows: ParsedRow[] = rawJson.map((row) => {
          // Flexible key lookup
          const findVal = (keys: string[]) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(
                (k) => k.trim().toLowerCase() === key.toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") {
                return row[matchedKey];
              }
            }
            return "";
          };

          const rawTitle = String(findVal(["title", "holiday title", "holiday name", "name", "holiday"])).trim();
          let rawDate = findVal(["date", "holiday date", "date (yyyy-mm-dd)", "start date"]);
          const rawType = String(findVal(["type", "holiday type"])).trim();
          const rawCat = String(findVal(["category", "holiday category"])).trim();
          const rawDepts = String(findVal(["departments", "applicable departments", "department"])).trim();
          const rawLocs = String(findVal(["locations", "location"])).trim();
          const rawHalf = findVal(["is half day", "half day", "ishalfday"]);
          const rawDesc = String(findVal(["description", "notes", "desc"])).trim();

          // Handle Excel serial date or formatted string
          let dateStr = "";
          let isValidDate = false;

          if (typeof rawDate === "number") {
            const excelEpoch = new Date((rawDate - 25569) * 86400 * 1000);
            if (!isNaN(excelEpoch.getTime())) {
              dateStr = excelEpoch.toISOString().split("T")[0];
              isValidDate = true;
            }
          } else if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split("T")[0];
              isValidDate = true;
            }
          }

          let normalizedType: "Mandatory" | "Restricted" | "Company" = "Mandatory";
          const lowerType = rawType.toLowerCase();
          if (lowerType.includes("restricted")) normalizedType = "Restricted";
          else if (lowerType.includes("company") || lowerType.includes("optional")) normalizedType = "Company";

          let normalizedCat: "National" | "Religious" | "Cultural" | "Corporate" = "National";
          const lowerCat = rawCat.toLowerCase();
          if (lowerCat.includes("relig")) normalizedCat = "Religious";
          else if (lowerCat.includes("cult")) normalizedCat = "Cultural";
          else if (lowerCat.includes("corp")) normalizedCat = "Corporate";

          const isHalf = Boolean(
            rawHalf === true ||
            String(rawHalf).toLowerCase() === "yes" ||
            String(rawHalf).toLowerCase() === "true" ||
            rawHalf === 1
          );

          let isValid = true;
          let errorReason = "";

          if (!rawTitle) {
            isValid = false;
            errorReason = "Missing holiday title";
          } else if (!isValidDate) {
            isValid = false;
            errorReason = "Invalid date format";
          }

          return {
            title: rawTitle,
            date: dateStr,
            type: normalizedType,
            category: normalizedCat,
            applicableDepartments: rawDepts || "All",
            locations: rawLocs,
            isHalfDay: isHalf,
            description: rawDesc,
            isValid,
            errorReason,
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        console.error("Error parsing spreadsheet:", err);
        setImportError("Failed to parse file. Please verify it is a valid Excel (.xlsx, .xls) or CSV file.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setImportError("Error reading the selected file.");
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 3. Submit valid rows to API
  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setImportError("There are no valid rows to import.");
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/holidays/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holidays: validRows.map((r) => ({
            title: r.title,
            date: r.date,
            type: r.type,
            category: r.category,
            applicableDepartments: r.applicableDepartments,
            locations: r.locations,
            isHalfDay: r.isHalfDay,
            description: r.description,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import holidays.");
      }

      onSuccess(data.message || `Successfully imported ${validRows.length} holidays.`);
      onClose();
    } catch (err: any) {
      setImportError(err.message || "Failed to submit holiday import.");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <i className="fa-solid fa-file-excel text-lg" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold text-white truncate">Import Holidays from Excel</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Upload .xlsx, .xls, or .csv with holiday schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Download Sample Template Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <i className="fa-solid fa-circle-info text-blue-400 text-sm" />
              <span className="text-xs text-slate-300 font-medium">
                Need the standard format? Download the sample template.
              </span>
            </div>
            <button
              onClick={handleDownloadSampleTemplate}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer"
            >
              <i className="fa-solid fa-download text-xs" />
              Download Template
            </button>
          </div>

          {/* File Upload Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              file
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <i className="fa-solid fa-cloud-arrow-up text-xl text-emerald-400" />
            </div>
            {file ? (
              <div>
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · Click or drag to replace</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-white">Choose Excel or CSV file</p>
                <p className="text-xs text-slate-400">or drag and drop here (.xlsx, .xls, .csv)</p>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {importError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <i className="fa-solid fa-triangle-exclamation text-sm shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Processing spinner */}
          {isProcessing && (
            <div className="py-6 flex items-center justify-center gap-3 text-slate-400 text-sm">
              <i className="fa-solid fa-circle-notch fa-spin text-emerald-400" />
              Parsing spreadsheet rows...
            </div>
          )}

          {/* Preview Table */}
          {!isProcessing && parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300">File Preview ({parsedRows.length} rows found)</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <i className="fa-solid fa-circle-check text-[10px]" /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-rose-400">
                      <i className="fa-solid fa-triangle-exclamation text-[10px]" /> {invalidCount} Invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full min-w-[380px] text-left border-collapse text-xs">
                  <thead className="bg-slate-800/80 sticky top-0 text-slate-400 border-b border-slate-700/60 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? "hover:bg-slate-800/40" : "bg-rose-500/5 hover:bg-rose-500/10"}
                      >
                        <td className="py-2 px-3 text-white font-medium truncate max-w-[140px] sm:max-w-[200px]">
                          {row.title || <span className="text-rose-400 italic">Empty</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-mono">
                          {row.date || <span className="text-rose-400 italic">Invalid</span>}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              row.type === "Mandatory"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : row.type === "Restricted"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {row.isValid ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <i className="fa-solid fa-check text-[10px]" /> Ready
                            </span>
                          ) : (
                            <span className="text-rose-400 font-medium flex items-center gap-1" title={row.errorReason}>
                              <i className="fa-solid fa-xmark text-[10px]" /> {row.errorReason}
                            </span>
                          )}
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
        <div className="shrink-0 flex items-center justify-end gap-3 px-4 sm:px-5 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={validCount === 0 || isImporting || isProcessing}
            onClick={handleImportSubmit}
            className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold transition shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            {isImporting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                Importing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-import text-xs" />
                Import {validCount > 0 ? `${validCount} Holidays` : "Holidays"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
