"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import ImportHolidayExcelModal from "@/components/holidays/ImportHolidayExcelModal";

interface Holiday {
  _id: string;
  title: string;
  description?: string;
  date: string;
  year: number;
  month: number;
  dayOfWeek?: string;
  type: "Mandatory" | "Restricted" | "Company";
  category?: "National" | "Religious" | "Cultural" | "Corporate";
  applicableDepartments?: string[];
  locations?: string[];
  isHalfDay?: boolean;
}

interface HolidayStats {
  total: number;
  mandatory: number;
  restricted: number;
  company: number;
  remainingThisYear: number;
  longWeekendsCount: number;
  year: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const HOLIDAY_TYPES: Array<{
  value: "Mandatory" | "Restricted" | "Company";
  label: string;
  badgeLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = [
  {
    value: "Mandatory",
    label: "Mandatory (Gazetted)",
    badgeLabel: "Official Paid Leave",
    icon: "fa-solid fa-award",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
  },
  {
    value: "Restricted",
    label: "Restricted (Optional)",
    badgeLabel: "Subject to Quota",
    icon: "fa-solid fa-clock-rotate-left",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },
  {
    value: "Company",
    label: "Company Holiday",
    badgeLabel: "Corporate Time Off",
    icon: "fa-solid fa-building",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
  },
];

const HOLIDAY_CATEGORIES: Array<{
  value: "National" | "Religious" | "Cultural" | "Corporate";
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = [
  { value: "National", label: "National", icon: "fa-solid fa-flag", color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
  { value: "Religious", label: "Religious", icon: "fa-solid fa-place-of-worship", color: "text-sky-400", bgColor: "bg-sky-500/15" },
  { value: "Cultural", label: "Cultural", icon: "fa-solid fa-masks-theater", color: "text-amber-400", bgColor: "bg-amber-500/15" },
  { value: "Corporate", label: "Corporate", icon: "fa-solid fa-briefcase", color: "text-purple-400", bgColor: "bg-purple-500/15" },
];

export function CompanyHolidaysTab({
  onToast,
}: {
  onToast: (msg: string, type?: "success" | "error") => void;
}) {
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const { can, isAdmin, isOPS, isHR, role } = usePermissions();
  const normalizedRole = (role || "").toLowerCase();
  const canManage =
    isAdmin ||
    isOPS ||
    isHR ||
    normalizedRole === "admin" ||
    normalizedRole === "ops" ||
    normalizedRole === "hr" ||
    can("manageHolidays");
  const canImport = can("importHolidayExcel") || canManage;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState<HolidayStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState<"Mandatory" | "Restricted" | "Company">("Mandatory");
  const [formCategory, setFormCategory] = useState<"National" | "Religious" | "Cultural" | "Corporate">("National");
  const [formDescription, setFormDescription] = useState("");
  const [formIsHalfDay, setFormIsHalfDay] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<Array<{ _id?: string; name: string; code?: string }>>([]);
  const [formSelectedDepts, setFormSelectedDepts] = useState<string[]>(["All"]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load available departments for multi-select
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await fetch("/api/departments");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.departments) && data.departments.length > 0) {
            setAvailableDepartments(data.departments);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
      // Fallback workspace departments
      setAvailableDepartments([
        { _id: "1", name: "Management", code: "MGMT" },
        { _id: "2", name: "Engineering", code: "ENG" },
        { _id: "3", name: "Design", code: "DES" },
        { _id: "4", name: "Marketing", code: "MKT" },
        { _id: "5", name: "Creatives", code: "CRE" },
        { _id: "6", name: "Operations and EA", code: "OPS" },
      ]);
    }
    loadDepts();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDepartment = (deptName: string) => {
    if (deptName === "All") {
      setFormSelectedDepts(["All"]);
      return;
    }

    if (formSelectedDepts.includes("All")) {
      setFormSelectedDepts([deptName]);
      return;
    }

    if (formSelectedDepts.includes(deptName)) {
      const remaining = formSelectedDepts.filter((d) => d !== deptName);
      setFormSelectedDepts(remaining.length === 0 ? ["All"] : remaining);
    } else {
      setFormSelectedDepts([...formSelectedDepts, deptName]);
    }
  };

  // Fetch holidays for selected year
  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/holidays?year=${selectedYear}${typeFilter !== "All" ? `&type=${typeFilter}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.holidays || []);
        setStats(data.stats || null);
      } else {
        onToastRef.current?.("Failed to fetch holidays.", "error");
      }
    } catch (err) {
      console.error(err);
      onToastRef.current?.("Error connecting to holidays service.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, typeFilter]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Open Add modal
  const handleOpenAddModal = () => {
    setEditingHoliday(null);
    setFormTitle("");
    setFormDate(new Date(selectedYear, 0, 2).toISOString().split("T")[0]);
    setFormType("Mandatory");
    setFormCategory("National");
    setFormDescription("");
    setFormIsHalfDay(false);
    setFormSelectedDepts(["All"]);
    setIsDeptDropdownOpen(false);
    setIsTypeDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (h: Holiday) => {
    setEditingHoliday(h);
    setFormTitle(h.title);
    setFormDate(new Date(h.date).toISOString().split("T")[0]);
    setFormType(h.type);
    setFormCategory(h.category || "National");
    setFormDescription(h.description || "");
    setFormIsHalfDay(Boolean(h.isHalfDay));
    setFormSelectedDepts(
      h.applicableDepartments && h.applicableDepartments.length > 0
        ? h.applicableDepartments
        : ["All"]
    );
    setIsDeptDropdownOpen(false);
    setIsTypeDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    setFormError(null);
    setIsAddEditModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Holiday title is required.");
      return;
    }
    if (!formDate) {
      setFormError("Holiday date is required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const deptsPayload =
        formSelectedDepts.includes("All") || formSelectedDepts.length === 0
          ? []
          : formSelectedDepts;

      const payload = {
        title: formTitle.trim(),
        date: formDate,
        type: formType,
        category: formCategory,
        description: formDescription.trim(),
        isHalfDay: formIsHalfDay,
        applicableDepartments: deptsPayload,
      };

      let res: Response;
      if (editingHoliday) {
        res = await fetch(`/api/holidays/${editingHoliday._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save holiday.");
      }

      onToastRef.current?.(editingHoliday ? "Holiday updated successfully!" : "Holiday added successfully!", "success");
      setIsAddEditModalOpen(false);
      fetchHolidays();
    } catch (err: any) {
      setFormError(err.message || "Failed to save holiday.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!holidayToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/holidays/${holidayToDelete._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onToastRef.current?.(`Deleted holiday '${holidayToDelete.title}'`, "success");
        setHolidayToDelete(null);
        fetchHolidays();
      } else {
        const data = await res.json();
        onToastRef.current?.(data.error || "Failed to delete holiday.", "error");
      }
    } catch (err) {
      console.error(err);
      onToastRef.current?.("Error deleting holiday.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Auto-Detect & Seed
  const handleAutoDetectSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/holidays/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear }),
      });
      const data = await res.json();
      if (res.ok) {
        onToastRef.current?.(data.message || `Synced holidays for ${selectedYear}!`, "success");
        fetchHolidays();
      } else {
        onToastRef.current?.(data.error || "Failed to auto-detect holidays.", "error");
      }
    } catch (err) {
      console.error(err);
      onToastRef.current?.("Error triggering holiday auto-sync.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Export to .ics
  const handleExportICS = () => {
    if (holidays.length === 0) {
      onToastRef.current?.("No holidays to export for this year.", "error");
      return;
    }

    const formatICSDate = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}${m}${d}`;
    };

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NexAce CRM//Company Holidays//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    holidays.forEach((h) => {
      const hDate = new Date(h.date);
      const nextDay = new Date(hDate.getTime() + 24 * 60 * 60 * 1000);
      const uid = `holiday_${h._id}@nexace.crm`;
      const title = (h.title || "Company Holiday").replace(/[,;\\]/g, " ");
      const desc = [h.type ? `[${h.type}]` : null, h.description].filter(Boolean).join(" - ").replace(/[,;\\]/g, " ");

      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${formatICSDate(new Date())}T000000Z`);
      icsLines.push(`DTSTART;VALUE=DATE:${formatICSDate(hDate)}`);
      icsLines.push(`DTEND;VALUE=DATE:${formatICSDate(nextDay)}`);
      icsLines.push(`SUMMARY:🎉 ${title}`);
      if (desc) icsLines.push(`DESCRIPTION:${desc}`);
      icsLines.push("CATEGORIES:HOLIDAY");
      icsLines.push("TRANSP:TRANSPARENT");
      icsLines.push("STATUS:CONFIRMED");
      icsLines.push("END:VEVENT");
    });

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Company_Holidays_${selectedYear}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToastRef.current?.(`Exported ${holidays.length} holidays to .ics calendar!`, "success");
  };

  const isLongWeekend = (dateStr: string, dayOfWeek?: string) => {
    if (dayOfWeek === "Friday" || dayOfWeek === "Monday") return true;
    const d = new Date(dateStr);
    const day = d.getUTCDay();
    return day === 1 || day === 5;
  };

  return (
    <div className="space-y-6">
      {/* ── Top Controls Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-xs">
        {/* Year Selector & Type Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Pills */}
          <div className="inline-flex rounded-xl bg-secondary/70 p-1 border border-border">
            {[currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedYear === yr
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Type Filter Pills */}
          <div className="inline-flex rounded-xl bg-secondary/70 p-1 border border-border overflow-x-auto">
            {["All", "Mandatory", "Restricted", "Company"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  typeFilter === t
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* View Toggle */}
          <div className="inline-flex rounded-xl bg-secondary/70 p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <i className="fa-solid fa-table-cells-large text-xs" />
              <span>Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <i className="fa-solid fa-list text-xs" />
              <span>Table</span>
            </button>
          </div>

          {/* Export .ics */}
          <button
            type="button"
            onClick={handleExportICS}
            className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold transition cursor-pointer"
            title="Download iCal (.ics) file for Google/Outlook Calendar"
          >
            <i className="fa-solid fa-calendar-arrow-down text-primary" />
            <span className="hidden sm:inline">Export .ics</span>
          </button>

          {/* Auto-Detect & Sync button (for privileged roles) */}
          {canManage && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleAutoDetectSync}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600/15 hover:bg-teal-600/25 text-teal-400 border border-teal-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Auto-detect tenant region and sync national public holidays"
            >
              {isSyncing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                  <span className="hidden xs:inline sm:inline">Auto-Detect &amp; Sync</span>
                  <span className="inline xs:hidden sm:hidden">Auto-Sync</span>
                </>
              )}
            </button>
          )}

          {/* Import Excel button (for privileged roles) */}
          {canImport && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <i className="fa-solid fa-file-excel text-xs" />
              <span>Import</span>
            </button>
          )}

          {/* Add Holiday button (for privileged roles) */}
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>Add Holiday</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Holidays */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">Total Holidays</p>
            <p className="text-xl sm:text-2xl font-black text-foreground">{loading ? "..." : stats?.total || holidays.length}</p>
            <p className="text-[10px] sm:text-[11px] text-emerald-500 font-semibold truncate">{stats?.remainingThisYear ?? 0} left in {selectedYear}</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-base sm:text-lg shrink-0">
            <i className="fa-solid fa-calendar-check" />
          </div>
        </div>

        {/* Mandatory / Gazetted */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">Mandatory</p>
            <p className="text-xl sm:text-2xl font-black text-foreground">{loading ? "..." : stats?.mandatory ?? 0}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Paid public holidays</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center text-base sm:text-lg shrink-0">
            <i className="fa-solid fa-award" />
          </div>
        </div>

        {/* Restricted / Optional */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">Restricted / Opt</p>
            <p className="text-xl sm:text-2xl font-black text-foreground">{loading ? "..." : stats?.restricted ?? 0}</p>
            <p className="text-[10px] sm:text-[11px] text-amber-500 font-semibold truncate">Subject to leave quota</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center text-base sm:text-lg shrink-0">
            <i className="fa-solid fa-clock-rotate-left" />
          </div>
        </div>

        {/* Long Weekends Alert */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-emerald-500/10 border border-amber-500/30 shadow-xs flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-500 truncate">Long Weekends</p>
            <p className="text-xl sm:text-2xl font-black text-foreground">{loading ? "..." : stats?.longWeekendsCount ?? 0}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Mon / Fri holidays</p>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center text-base sm:text-lg shrink-0">
            <i className="fa-solid fa-umbrella-beach" />
          </div>
        </div>
      </div>

      {/* ── Main View (Grid or Table) ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="animate-pulse p-4 rounded-2xl bg-card border border-border flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-xl bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary rounded w-1/2" />
                <div className="h-3 bg-secondary rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-card border border-dashed border-border/80">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-muted-foreground text-2xl">
            <i className="fa-solid fa-umbrella-beach" />
          </div>
          <h3 className="text-base font-bold text-foreground">No Holidays Found for {selectedYear}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {canManage
              ? "You can auto-populate national public holidays with a single click, import a spreadsheet, or add entries manually."
              : "No official company holidays have been scheduled for this year yet."}
          </p>
          {canManage && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={handleAutoDetectSync}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                Auto-Detect &amp; Populate
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition border border-border cursor-pointer"
              >
                <i className="fa-solid fa-plus text-xs" />
                Add Manually
              </button>
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holidays.map((holiday) => {
            const hDate = new Date(holiday.date);
            const monthStr = SHORT_MONTHS[hDate.getUTCMonth()];
            const dayNum = hDate.getUTCDate();
            const longWeekend = isLongWeekend(holiday.date, holiday.dayOfWeek);

            return (
              <div
                key={holiday._id}
                className="group p-4 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all shadow-xs flex flex-col justify-between"
              >
                {/* Top Row: Date Box + Title & Badges */}
                <div className="flex items-start gap-3.5">
                  {/* Calendar Date Badge */}
                  <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-emerald-500/40 transition">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                      {monthStr}
                    </span>
                    <span className="text-xl font-black text-foreground leading-none">
                      {dayNum}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors truncate">
                        {holiday.title}
                      </h4>
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-foreground/80">{holiday.dayOfWeek || "Day"}</span>
                      <span>·</span>
                      <span>{holiday.category || "Observance"}</span>
                    </p>

                    {/* Tag Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          holiday.type === "Mandatory"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : holiday.type === "Restricted"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {holiday.type}
                      </span>

                      {longWeekend && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <i className="fa-solid fa-umbrella-beach text-[9px]" /> Long Weekend!
                        </span>
                      )}

                      {holiday.isHalfDay && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          Half Day
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description if present */}
                {holiday.description && (
                  <p className="text-xs text-muted-foreground mt-3 pt-2.5 border-t border-border/50 line-clamp-2">
                    {holiday.description}
                  </p>
                )}

                {/* Card Footer Actions (for privileged roles) */}
                {canManage && (
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50 text-xs">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={(holiday.applicableDepartments && holiday.applicableDepartments.join(", ")) || "All Departments"}>
                      Depts: {(holiday.applicableDepartments && holiday.applicableDepartments.length > 0 ? holiday.applicableDepartments.join(", ") : "All")}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(holiday)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-secondary transition cursor-pointer"
                        title="Edit Holiday"
                      >
                        <i className="fa-solid fa-pen text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHolidayToDelete(holiday)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Delete Holiday"
                      >
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs">
              <thead className="bg-secondary/60 text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Holiday Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Departments</th>
                  <th className="py-3 px-4">Long Weekend</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {holidays.map((holiday) => {
                  const hDate = new Date(holiday.date);
                  const dateStr = hDate.toISOString().split("T")[0];
                  const longWeekend = isLongWeekend(holiday.date, holiday.dayOfWeek);

                  return (
                    <tr key={holiday._id} className="hover:bg-secondary/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {holiday.dayOfWeek || "Day"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{holiday.title}</span>
                          {holiday.isHalfDay && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/20">
                              Half Day
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            holiday.type === "Mandatory"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : holiday.type === "Restricted"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {holiday.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {holiday.category || "Observance"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {(holiday.applicableDepartments && holiday.applicableDepartments.join(", ")) || "All"}
                      </td>
                      <td className="py-3 px-4">
                        {longWeekend ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                            <i className="fa-solid fa-umbrella-beach text-[8px]" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(holiday)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-secondary transition mr-1 cursor-pointer"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setHolidayToDelete(holiday)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-xs" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Holiday Modal ────────────────────────────────────── */}
      {isAddEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-base shadow-xs shrink-0">
                  <i className="fa-solid fa-umbrella-beach" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-white truncate">
                    {editingHoliday ? "Edit Company Holiday" : "Add Company Holiday"}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    Configure date, department scopes, and leave classifications
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSaveHoliday} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-signature text-primary text-[11px]" />
                    Holiday Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independence Day, Diwali, or Annual Offsite"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-primary transition"
                  />
                </div>

              {/* Date & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-day text-primary text-[11px]" />
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    style={{ colorScheme: "dark" }}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-primary transition cursor-pointer"
                  />
                </div>

                {/* Custom Type Dropdown */}
                <div className="relative" ref={typeDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-award text-primary text-[11px]" />
                    Type <span className="text-rose-400">*</span>
                  </label>
                  {(() => {
                    const currentTypeObj =
                      HOLIDAY_TYPES.find((t) => t.value === formType) || HOLIDAY_TYPES[0];
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsTypeDropdownOpen(!isTypeDropdownOpen);
                            setIsCategoryDropdownOpen(false);
                            setIsDeptDropdownOpen(false);
                          }}
                          className="w-full h-10 px-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs flex items-center justify-between gap-2 hover:border-slate-600 focus:outline-none focus:border-primary transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center ${currentTypeObj.bgColor} ${currentTypeObj.color}`}>
                              <i className={`${currentTypeObj.icon} text-[10px]`} />
                            </span>
                            <span className="font-semibold text-slate-200 truncate">{currentTypeObj.label}</span>
                          </div>
                          <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform shrink-0 ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isTypeDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1">
                            {HOLIDAY_TYPES.map((t) => {
                              const isSelected = formType === t.value;
                              return (
                                <button
                                  key={t.value}
                                  type="button"
                                  onClick={() => {
                                    setFormType(t.value);
                                    setIsTypeDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                                    isSelected
                                      ? `${t.bgColor} ${t.color} border ${t.borderColor} font-bold`
                                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center ${t.bgColor} ${t.color}`}>
                                      <i className={`${t.icon} text-xs`} />
                                    </span>
                                    <div className="text-left">
                                      <p className="font-semibold leading-tight">{t.label}</p>
                                      <p className="text-[10px] opacity-75 font-normal">{t.badgeLabel}</p>
                                    </div>
                                  </div>
                                  {isSelected && <i className="fa-solid fa-check text-xs" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Category & Applicable Depts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Custom Category Dropdown */}
                <div className="relative" ref={categoryDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-layer-group text-primary text-[11px]" />
                    Category
                  </label>
                  {(() => {
                    const currentCategoryObj =
                      HOLIDAY_CATEGORIES.find((c) => c.value === formCategory) || HOLIDAY_CATEGORIES[0];
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                            setIsTypeDropdownOpen(false);
                            setIsDeptDropdownOpen(false);
                          }}
                          className="w-full h-10 px-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs flex items-center justify-between gap-2 hover:border-slate-600 focus:outline-none focus:border-primary transition cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center ${currentCategoryObj.bgColor} ${currentCategoryObj.color}`}>
                              <i className={`${currentCategoryObj.icon} text-[10px]`} />
                            </span>
                            <span className="font-semibold text-slate-200 truncate">{currentCategoryObj.label}</span>
                          </div>
                          <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform shrink-0 ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isCategoryDropdownOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 space-y-1">
                            {HOLIDAY_CATEGORIES.map((c) => {
                              const isSelected = formCategory === c.value;
                              return (
                                <button
                                  key={c.value}
                                  type="button"
                                  onClick={() => {
                                    setFormCategory(c.value);
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                                    isSelected
                                      ? `${c.bgColor} ${c.color} font-bold`
                                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className={`w-6 h-6 rounded-md flex items-center justify-center ${c.bgColor} ${c.color}`}>
                                      <i className={`${c.icon} text-xs`} />
                                    </span>
                                    <span className="font-semibold">{c.label}</span>
                                  </div>
                                  {isSelected && <i className="fa-solid fa-check text-xs" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Applicable Departments Multi-Select */}
                <div className="relative" ref={deptDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-building-user text-primary text-[11px]" />
                      Applicable Departments
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {formSelectedDepts.includes("All") || formSelectedDepts.length === 0
                        ? "All Employees"
                        : `${formSelectedDepts.length} selected`}
                    </span>
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeptDropdownOpen(!isDeptDropdownOpen);
                      setIsTypeDropdownOpen(false);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="w-full min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs flex items-center justify-between gap-2 hover:border-slate-600 focus:outline-none focus:border-primary transition cursor-pointer text-left"
                  >
                    <div className="flex flex-wrap items-center gap-1 flex-1 py-0.5 max-h-20 overflow-y-auto">
                      {formSelectedDepts.includes("All") || formSelectedDepts.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                          <i className="fa-solid fa-users text-[10px]" />
                          All Departments (Company-wide)
                        </span>
                      ) : (
                        formSelectedDepts.map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-[11px] font-medium"
                          >
                            {dept}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDepartment(dept);
                              }}
                              className="hover:text-white cursor-pointer ml-0.5"
                            >
                              <i className="fa-solid fa-xmark text-[9px]" />
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                    <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform shrink-0 ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDeptDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 space-y-1 max-h-56 overflow-y-auto">
                      {/* All Departments Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormSelectedDepts(["All"]);
                          setIsDeptDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                          formSelectedDepts.includes("All") || formSelectedDepts.length === 0
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-globe text-xs" />
                          All Departments (Company-wide)
                        </span>
                        {(formSelectedDepts.includes("All") || formSelectedDepts.length === 0) && (
                          <i className="fa-solid fa-check text-emerald-400 text-xs" />
                        )}
                      </button>

                      <div className="border-t border-slate-800 my-1" />

                      <p className="px-2 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Or select specific departments
                      </p>

                      {/* Individual Departments */}
                      {availableDepartments.map((dept) => {
                        const isSelected = !formSelectedDepts.includes("All") && formSelectedDepts.includes(dept.name);
                        return (
                          <button
                            key={dept._id || dept.name}
                            type="button"
                            onClick={() => toggleDepartment(dept.name)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                              isSelected
                                ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-slate-600 bg-slate-800"
                              }`}>
                                {isSelected && <i className="fa-solid fa-check" />}
                              </span>
                              <span className="truncate">{dept.name}</span>
                            </span>
                            {dept.code && (
                              <span className="text-[10px] font-mono text-slate-500 uppercase">{dept.code}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Half Day Interactive Toggle Card */}
              <div className="pt-1">
                <div
                  onClick={() => setFormIsHalfDay(!formIsHalfDay)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer select-none ${
                    formIsHalfDay
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                      : "bg-slate-800/70 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                      formIsHalfDay ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-400"
                    }`}>
                      <i className="fa-solid fa-hourglass-half" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Half-Day Observance</p>
                      <p className="text-[10px] text-slate-400">Festival Eve or partial work shift</p>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      formIsHalfDay ? "bg-amber-500 justify-end" : "bg-slate-700 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fa-solid fa-align-left text-primary text-[11px]" />
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional background or observance details..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-primary resize-none transition"
                />
              </div>

              </div>

              {/* Footer Actions */}
              <div className="shrink-0 flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3.5 border-t border-slate-800 bg-slate-900/95">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs" /> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs" /> Save Holiday
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
      {holidayToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto text-xl">
              <i className="fa-solid fa-trash" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Delete Holiday?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-white">{holidayToDelete.title}</strong> on{" "}
                <span className="font-mono text-emerald-400">
                  {new Date(holidayToDelete.date).toISOString().split("T")[0]}
                </span>
                ?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHolidayToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Excel Import Modal ───────────────────────────────────────────── */}
      <ImportHolidayExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(msg) => {
          onToastRef.current?.(msg, "success");
          fetchHolidays();
        }}
      />
    </div>
  );
}
