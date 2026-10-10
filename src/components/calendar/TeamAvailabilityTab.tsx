"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

interface WorkerUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  employmentType?: string;
  photoUrl?: string;
  department?: string;
}

interface AvailabilityRecord {
  _id: string;
  userId: WorkerUser;
  date: string;
  dateString: string; // YYYY-MM-DD
  status: "Available" | "Partial" | "Unavailable";
  startTime?: string;
  endTime?: string;
  hours?: number;
  notes?: string;
}

interface TeamAvailabilityTabProps {
  currentUser: any;
  isAdmin: boolean;
  isOPS: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesToTimeStr(mins: number): string {
  const clamped = Math.max(0, Math.min(1440, mins));
  let hours = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = hours >= 12 ? "PM" : "AM";
  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(m)} ${period}`;
}

function timeStrToMinutes(timeStr: string): number {
  if (!timeStr) return 540; // 09:00 AM
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 540;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = (match[3] || "AM").toUpperCase();
  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function timeStrToInput24(timeStr: string): string {
  const mins = timeStrToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function input24ToTimeStr(val24: string): string {
  if (!val24) return "09:00 AM";
  const [hStr, mStr] = val24.split(":");
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return minutesToTimeStr(h * 60 + m);
}

function calcShiftHours(startStr: string, endStr: string): number {
  const sm = timeStrToMinutes(startStr);
  const em = timeStrToMinutes(endStr);
  if (em > sm) {
    return Number(((em - sm) / 60).toFixed(1));
  } else if (em < sm) {
    return Number(((1440 - sm + em) / 60).toFixed(1));
  }
  return 0;
}

export function TeamAvailabilityTab({
  currentUser,
  isAdmin,
  isOPS,
  showToast,
}: TeamAvailabilityTabProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<AvailabilityRecord[]>([]);
  const [eligibleWorkers, setEligibleWorkers] = useState<WorkerUser[]>([]);
  const [isElevated, setIsElevated] = useState(false);
  const [isEligibleWorker, setIsEligibleWorker] = useState(true);

  // Filters
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Multi-select dates on calendar
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTargetUserId, setModalTargetUserId] = useState<string>("");
  const [modalDates, setModalDates] = useState<string[]>([]);
  const [showDateAdder, setShowDateAdder] = useState(false);
  const [newDatePickerValue, setNewDatePickerValue] = useState<string>("");
  const [modalStatus, setModalStatus] = useState<"Available" | "Partial" | "Unavailable">("Available");
  const [modalStartTime, setModalStartTime] = useState<string>("09:00 AM");
  const [modalEndTime, setModalEndTime] = useState<string>("05:00 PM");
  const [modalHours, setModalHours] = useState<number>(4);
  const [modalNotes, setModalNotes] = useState<string>("");
  const [modalRecordId, setModalRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Day inspection drawer/modal for team view
  const [inspectedDay, setInspectedDay] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/calendar/availability", window.location.origin);
      url.searchParams.set("year", String(currentYear));
      url.searchParams.set("month", String(currentMonth));
      if (selectedWorkerId && selectedWorkerId !== "All") {
        url.searchParams.set("userId", selectedWorkerId);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setAvailabilities(data.availabilities || []);
        if (data.eligibleWorkers) {
          setEligibleWorkers(data.eligibleWorkers);
        }
        setIsElevated(Boolean(data.isElevated));
        setIsEligibleWorker(Boolean(data.isEligibleWorker));
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to load availability", "error");
      }
    } catch (err: any) {
      console.error("Error fetching availability:", err);
      showToast("Network error fetching availability", "error");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Tenant Shift configurations from Settings (/api/settings/shifts)
  interface ConfiguredShift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    description?: string;
  }
  const [configuredShifts, setConfiguredShifts] = useState<ConfiguredShift[]>([]);

  useEffect(() => {
    fetchAvailability();
  }, [currentYear, currentMonth, selectedWorkerId]);

  useEffect(() => {
    const fetchConfiguredShifts = async () => {
      try {
        const res = await fetch("/api/settings/shifts");
        if (res.ok) {
          const data = await res.json();
          if (data.shifts && Array.isArray(data.shifts) && data.shifts.length > 0) {
            setConfiguredShifts(data.shifts);
          }
        }
      } catch (err) {
        console.warn("Failed to load tenant configured shifts:", err);
      }
    };
    fetchConfiguredShifts();
  }, []);

  // Calendar days calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      date: Date;
    }> = [];

    // Preceding padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(dayNum).padStart(2, "0");
      days.push({
        dateString: `${yyyy}-${mm}-${dd}`,
        dayNumber: dayNum,
        isCurrentMonth: false,
        date: d,
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(i).padStart(2, "0");
      days.push({
        dateString: `${yyyy}-${mm}-${dd}`,
        dayNumber: i,
        isCurrentMonth: true,
        date: d,
      });
    }

    // Trailing padding days to fill grid
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(i).padStart(2, "0");
      days.push({
        dateString: `${yyyy}-${mm}-${dd}`,
        dayNumber: i,
        isCurrentMonth: false,
        date: d,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Group availability records by dateString
  const availabilityByDate = useMemo(() => {
    const map: Record<string, AvailabilityRecord[]> = {};
    for (const record of availabilities) {
      if (statusFilter !== "All" && record.status !== statusFilter) {
        continue;
      }
      if (!map[record.dateString]) {
        map[record.dateString] = [];
      }
      map[record.dateString].push(record);
    }
    return map;
  }, [availabilities, statusFilter]);

  // Quick stats for the viewed month
  const stats = useMemo(() => {
    let availableCount = 0;
    let partialCount = 0;
    let unavailableCount = 0;

    for (const record of availabilities) {
      if (record.status === "Available") availableCount++;
      else if (record.status === "Partial") partialCount++;
      else if (record.status === "Unavailable") unavailableCount++;
    }

    return {
      available: availableCount,
      partial: partialCount,
      unavailable: unavailableCount,
      totalEntries: availabilities.length,
    };
  }, [availabilities]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Multi-select toggle helpers
  const toggleDateSelection = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const selectAllWeekdays = () => {
    const weekdays = calendarDays
      .filter((d) => d.isCurrentMonth && d.date.getDay() !== 0 && d.date.getDay() !== 6)
      .map((d) => d.dateString);
    setSelectedDates(weekdays);
    setIsMultiSelectMode(true);
  };

  const selectAllWeekends = () => {
    const weekends = calendarDays
      .filter((d) => d.isCurrentMonth && (d.date.getDay() === 0 || d.date.getDay() === 6))
      .map((d) => d.dateString);
    setSelectedDates(weekends);
    setIsMultiSelectMode(true);
  };

  const selectEntireMonth = () => {
    const all = calendarDays.filter((d) => d.isCurrentMonth).map((d) => d.dateString);
    setSelectedDates(all);
    setIsMultiSelectMode(true);
  };

  const clearSelection = () => {
    setSelectedDates([]);
  };

  // Open modal with single or multiple dates
  const openAddModal = (dateStrings: string[] | string, existingRecord?: AvailabilityRecord) => {
    const datesArray = Array.isArray(dateStrings) ? dateStrings : [dateStrings];
    setModalDates(datesArray);
    setShowDateAdder(datesArray.length > 1);
    setNewDatePickerValue("");

    if (existingRecord) {
      setModalRecordId(existingRecord._id);
      setModalTargetUserId(existingRecord.userId?._id || "");
      setModalStatus(existingRecord.status);
      setModalStartTime(existingRecord.startTime || "09:00 AM");
      setModalEndTime(existingRecord.endTime || "05:00 PM");
      setModalHours(existingRecord.hours || 4);
      setModalNotes(existingRecord.notes || "");
    } else {
      setModalRecordId(null);
      setModalTargetUserId(
        isElevated && selectedWorkerId !== "All"
          ? selectedWorkerId
          : currentUser?._id || currentUser?.id || ""
      );
      setModalStatus("Available");
      setModalStartTime("09:00 AM");
      setModalEndTime("05:00 PM");
      setModalHours(4);
      setModalNotes("");
    }
    setModalOpen(true);
  };

  // Add an extra date into the modal's multi-select list
  const addDateToModal = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    if (!modalDates.includes(dateStr)) {
      setModalDates((prev) => [...prev, dateStr].sort());
    }
    setNewDatePickerValue("");
  };

  // Remove a date from modal's multi-select list
  const removeDateFromModal = (dateStr: string) => {
    setModalDates((prev) => prev.filter((d) => d !== dateStr));
  };

  // Quick 1-click batch update from bottom bar
  const handleQuickBatchSubmit = async (status: "Available" | "Unavailable") => {
    if (selectedDates.length === 0) return;
    try {
      setBatchActionLoading(true);
      const res = await fetch("/api/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: selectedDates,
          status,
          targetUserId: isElevated && selectedWorkerId !== "All" ? selectedWorkerId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update availability");

      showToast(`Marked ${selectedDates.length} date(s) as ${status}!`, "success");
      setSelectedDates([]);
      fetchAvailability();
    } catch (err: any) {
      showToast(err.message || "Failed to batch update", "error");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Quick 1-click batch delete
  const handleQuickBatchDelete = async () => {
    if (selectedDates.length === 0) return;
    try {
      setBatchActionLoading(true);
      const url = new URL("/api/calendar/availability", window.location.origin);
      url.searchParams.set("dates", selectedDates.join(","));
      if (isElevated && selectedWorkerId !== "All") {
        url.searchParams.set("userId", selectedWorkerId);
      }

      const res = await fetch(url.toString(), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear dates");

      showToast(`Cleared availability for ${selectedDates.length} date(s)`, "success");
      setSelectedDates([]);
      fetchAvailability();
    } catch (err: any) {
      showToast(err.message || "Failed to batch clear", "error");
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Modal Form Submission (handles single or multi-date batch)
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalDates.length === 0) {
      showToast("Please select at least one date", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: modalDates,
          status: modalStatus,
          startTime: modalStatus === "Partial" ? modalStartTime : "",
          endTime: modalStatus === "Partial" ? modalEndTime : "",
          hours: modalStatus === "Partial" ? Number(modalHours) : modalStatus === "Available" ? 8 : 0,
          notes: modalNotes,
          targetUserId: isElevated && modalTargetUserId ? modalTargetUserId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save availability");
      }

      showToast(`Saved availability for ${modalDates.length} date(s)!`, "success");
      setModalOpen(false);
      setSelectedDates([]);
      fetchAvailability();
    } catch (err: any) {
      showToast(err.message || "Failed to save availability", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSingleModal = async () => {
    if (!modalRecordId && modalDates.length === 0) return;
    try {
      setSaving(true);
      const url = new URL("/api/calendar/availability", window.location.origin);
      if (modalRecordId) {
        url.searchParams.set("id", modalRecordId);
      } else {
        url.searchParams.set("dates", modalDates.join(","));
        if (isElevated && modalTargetUserId) {
          url.searchParams.set("userId", modalTargetUserId);
        }
      }

      const res = await fetch(url.toString(), { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove availability");

      showToast("Availability removed", "success");
      setModalOpen(false);
      fetchAvailability();
    } catch (err: any) {
      showToast(err.message || "Failed to remove", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-16">
      {/* Top Banner / Info Card with Executive Styling */}
      <Card className="border border-border/80 shadow-xs overflow-hidden bg-card rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-sm shadow-2xs shrink-0">
                  <i className="fa-solid fa-user-clock" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                  {isElevated ? "Team Availability Roster" : "My Work Availability"}
                </CardTitle>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border",
                    isElevated
                      ? "bg-primary/10 text-primary border-primary/25"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isElevated ? "bg-primary" : "bg-emerald-500"
                    )}
                  />
                  {isElevated
                    ? "HR & Admin Full Access"
                    : currentUser?.employmentType || "Contractor / Freelancer"}
                </span>
              </div>
              <CardDescription className="text-xs leading-relaxed max-w-2xl text-muted-foreground">
                {isElevated
                  ? "Track, inspect, and coordinate working availability for Part-Time, Freelance, Contractor, and flexible staff."
                  : "Mark your available dates, flexible hours, and planned offline days so your HR partner and team leads can schedule shifts and task assignments accordingly."}
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full lg:w-auto">
              {/* Row on Mobile: View Switcher & Multi-Select Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* View Switcher: Calendar vs Roster */}
                <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5 h-9 sm:h-8 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("calendar")}
                    className={cn(
                      "h-8 sm:h-7 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                      viewMode === "calendar"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-calendar-days text-[11px]" />
                    <span>Calendar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "h-8 sm:h-7 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                      viewMode === "list"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-list-check text-[11px]" />
                    <span>Roster</span>
                  </button>
                </div>

                {/* Multi-Select Toggle Button */}
                <Button
                  variant={isMultiSelectMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const next = !isMultiSelectMode;
                    setIsMultiSelectMode(next);
                    if (!next) setSelectedDates([]);
                  }}
                  className={cn(
                    "h-9 sm:h-8 text-xs gap-1.5 font-semibold cursor-pointer transition-all flex-1 sm:flex-initial justify-center rounded-xl",
                    isMultiSelectMode
                      ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                      : "border-border/80 hover:bg-muted/60 text-foreground"
                  )}
                >
                  <i
                    className={cn(
                      "text-[11px]",
                      isMultiSelectMode ? "fa-solid fa-square-check" : "fa-solid fa-calendar-check"
                    )}
                  />
                  <span>
                    {isMultiSelectMode ? `Selected (${selectedDates.length})` : "Multi-Select"}
                  </span>
                </Button>
              </div>

              {/* Set Availability CTA */}
              <Button
                size="sm"
                onClick={() => openAddModal(selectedDates.length > 0 ? selectedDates : [todayStr])}
                className="h-9 sm:h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer transition-all rounded-xl w-full sm:w-auto justify-center"
              >
                <i className="fa-solid fa-plus text-xs" />
                <span>{selectedDates.length > 0 ? `Set ${selectedDates.length} Dates` : "Set Availability"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filters and Month Navigation */}
        <CardContent className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
          {/* Quick Metrics Bar with Responsive KPI Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* 1. Available Days */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 hover:border-emerald-500/40 hover:shadow-xs transition-all flex items-center justify-between group">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Available Days
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {stats.available}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Full-day scheduled</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ml-1.5">
                <i className="fa-solid fa-circle-check" />
              </div>
            </div>

            {/* 2. Partial Shifts */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 hover:border-amber-500/40 hover:shadow-xs transition-all flex items-center justify-between group">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Partial Shifts
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {stats.partial}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Custom hours window</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ml-1.5">
                <i className="fa-solid fa-business-time" />
              </div>
            </div>

            {/* 3. Offline / Off */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 hover:border-rose-500/40 hover:shadow-xs transition-all flex items-center justify-between group">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Offline / Off
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {stats.unavailable}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Planned leave & rest</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ml-1.5">
                <i className="fa-solid fa-circle-xmark" />
              </div>
            </div>

            {/* 4. Total Logged / Flexible Staff */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center justify-between group">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isElevated ? "Flexible Staff" : "Total Logged"}
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {isElevated ? eligibleWorkers.length : stats.totalEntries}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                  {isElevated ? "Active roster" : "Entries this month"}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ml-1.5">
                <i className="fa-solid fa-users" />
              </div>
            </div>
          </div>

          {/* Month Navigator & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Unified Month Navigator */}
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-0.5 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <i className="fa-solid fa-chevron-left text-xs" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 h-8 sm:px-2.5 sm:h-7 rounded-lg hover:bg-background text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Jump to current date"
                >
                  <i className="fa-solid fa-calendar-day text-[10px] text-primary" /> Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <i className="fa-solid fa-chevron-right text-xs" />
                </button>
              </div>

              <div className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {MONTH_NAMES[currentMonth]} <span className="text-muted-foreground font-normal">{currentYear}</span>
              </div>
            </div>

            {/* Elevated Filters: Worker Dropdown + Status Pill Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isElevated && (
                <div className="relative flex-1 sm:w-44">
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full h-9 sm:h-8 pl-8 pr-7 text-xs rounded-xl border border-border bg-background font-semibold text-foreground hover:border-primary/50 focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                  >
                    <option value="All">All Staff ({eligibleWorkers.length})</option>
                    {eligibleWorkers.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} ({w.employmentType || "Staff"})
                      </option>
                    ))}
                  </select>
                  <i className="fa-solid fa-user absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none" />
                  <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none" />
                </div>
              )}

              <div className="relative flex-1 sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 sm:h-8 pl-8 pr-7 text-xs rounded-xl border border-border bg-background font-semibold text-foreground hover:border-primary/50 focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Available">Available (Full Day)</option>
                  <option value="Partial">Partial Hours</option>
                  <option value="Unavailable">Unavailable / Off</option>
                </select>
                <i className="fa-solid fa-filter absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none" />
                <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Multi-Select Preset Toolbar (Smooth Touch Horizontal Scrolling on Mobile) */}
          {(isMultiSelectMode || selectedDates.length > 0) && (
            <div className="pt-2.5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5 shrink-0 mr-1">
                  <i className="fa-solid fa-layer-group text-primary text-xs" />
                  Range:
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllWeekdays}
                  className="h-7 text-[11px] px-2.5 rounded-lg hover:border-primary/60 font-semibold shrink-0 cursor-pointer"
                >
                  <i className="fa-solid fa-calendar-check text-[10px] mr-1 text-primary" />
                  Mon - Fri
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllWeekends}
                  className="h-7 text-[11px] px-2.5 rounded-lg hover:border-primary/60 font-semibold shrink-0 cursor-pointer"
                >
                  <i className="fa-solid fa-mug-hot text-[10px] mr-1 text-amber-500" />
                  Sat - Sun
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectEntireMonth}
                  className="h-7 text-[11px] px-2.5 rounded-lg hover:border-primary/60 font-semibold shrink-0 cursor-pointer"
                >
                  Entire Month
                </Button>
                {selectedDates.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="h-7 text-[11px] px-2 text-rose-500 hover:bg-rose-500/10 font-semibold shrink-0 cursor-pointer"
                  >
                    Clear ({selectedDates.length})
                  </Button>
                )}
              </div>

              <div className="text-[10px] sm:text-[11px] text-muted-foreground flex items-center gap-1.5 shrink-0">
                <i className="fa-solid fa-hand-pointer text-[10px] text-primary" />
                <span>Tap any day to toggle selection</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content: Calendar View vs List View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Preloader label="Loading availability schedule..." />
        </div>
      ) : viewMode === "calendar" ? (
        <Card className="border border-border/80 shadow-xs overflow-hidden bg-card rounded-2xl w-full">
          {/* Day of Week Header (Adaptive for Mobile Viewports) */}
          <div className="grid grid-cols-7 border-b border-border/80 bg-muted/30 text-center font-semibold text-[10px] sm:text-[11px] py-2 sm:py-2.5 text-muted-foreground tracking-wider uppercase">
            {WEEKDAYS.map((wd) => (
              <div key={wd}>
                <span className="hidden sm:inline">{wd}</span>
                <span className="sm:hidden">{wd.slice(0, 2)}</span>
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 w-full">
            {calendarDays.map((day) => {
              const records = availabilityByDate[day.dateString] || [];
              const isToday = day.dateString === todayStr;
              const isSelected = selectedDates.includes(day.dateString);
              const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

              return (
                <div
                  key={day.dateString}
                  onClick={() => {
                    if (isMultiSelectMode) {
                      toggleDateSelection(day.dateString);
                    } else if (isElevated && records.length > 0) {
                      setInspectedDay(day.dateString);
                    } else if (records.length === 1) {
                      openAddModal(day.dateString, records[0]);
                    } else {
                      openAddModal(day.dateString);
                    }
                  }}
                  className={cn(
                    "min-h-[68px] sm:min-h-[110px] p-1 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group relative select-none overflow-hidden",
                    !day.isCurrentMonth && "bg-muted/10 text-muted-foreground/40",
                    isWeekend && day.isCurrentMonth && "bg-muted/5",
                    isToday && "bg-primary/[0.03] ring-1.5 ring-primary/40 ring-inset",
                    isSelected && "bg-primary/10 ring-2 ring-primary ring-inset font-bold",
                    day.isCurrentMonth && !isSelected && "hover:bg-primary/[0.02]"
                  )}
                >
                  {/* Date Header inside Day Cell */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs font-bold scale-105"
                          : isToday
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : day.isCurrentMonth
                          ? "text-foreground font-semibold group-hover:bg-muted/60"
                          : "text-muted-foreground/35 font-normal"
                      )}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Multi-select checkbox indicator */}
                    {isMultiSelectMode ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDateSelection(day.dateString);
                        }}
                        className={cn(
                          "w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground text-[10px] shadow-xs"
                            : "border-border/80 group-hover:border-primary/70 bg-background"
                        )}
                      >
                        {isSelected && <i className="fa-solid fa-check" />}
                      </div>
                    ) : (
                      /* Quick single-add icon hover (desktop only) */
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddModal(day.dateString);
                        }}
                        className="hidden sm:flex opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary items-center justify-center text-[10px] transition-all cursor-pointer"
                        title="Set availability for this day"
                      >
                        <i className="fa-solid fa-plus" />
                      </button>
                    )}
                  </div>

                  {/* Availability Badges inside Cell (Responsive for mobile & desktop) */}
                  <div className="space-y-0.5 sm:space-y-1 my-0.5 sm:my-1 min-w-0">
                    {/* On Mobile: Show at most 2 badges + '+N'; On Desktop: Show up to 3 + '+N' */}
                    {records.slice(0, 3).map((rec, rIdx) => {
                      const isAvail = rec.status === "Available";
                      const isPartial = rec.status === "Partial";
                      const isUnavail = rec.status === "Unavailable";

                      return (
                        <div
                          key={rec._id}
                          onClick={(e) => {
                            if (!isMultiSelectMode) {
                              e.stopPropagation();
                              openAddModal(day.dateString, rec);
                            }
                          }}
                          className={cn(
                            "px-1 sm:px-2 py-0.5 rounded-md text-[8.5px] sm:text-[10px] font-semibold flex items-center justify-between gap-1 truncate shadow-2xs transition-all hover:scale-[1.02]",
                            rIdx >= 2 && "hidden sm:flex",
                            isAvail && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/15",
                            isPartial && "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 hover:bg-amber-500/15",
                            isUnavail && "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 hover:bg-rose-500/15"
                          )}
                          title={`${rec.userId?.name || "Staff"}: ${rec.status} ${
                            rec.hours ? `(${rec.hours} hrs)` : ""
                          } ${rec.notes ? `- ${rec.notes}` : ""}`}
                        >
                          {/* Desktop Full View */}
                          <div className="hidden sm:flex items-center justify-between w-full min-w-0">
                            <span className="truncate flex items-center gap-1.5 min-w-0">
                              <i
                                className={cn(
                                  "text-[8px] shrink-0",
                                  isAvail && "fa-solid fa-circle-check text-emerald-500",
                                  isPartial && "fa-solid fa-clock text-amber-500",
                                  isUnavail && "fa-solid fa-circle-xmark text-rose-500"
                                )}
                              />
                              {isElevated ? (
                                <span className="font-bold truncate">{rec.userId?.name?.split(" ")[0]}</span>
                              ) : (
                                <span className="truncate">{rec.status}</span>
                              )}
                            </span>

                            {isPartial && rec.hours ? (
                              <span className="font-mono text-[9px] shrink-0 font-bold bg-amber-500/20 px-1 rounded ml-1">
                                {rec.hours}h
                              </span>
                            ) : null}
                          </div>

                          {/* Mobile Compact View (Optimized for 45-55px column width) */}
                          <div className="flex sm:hidden items-center justify-center w-full min-w-0">
                            {isAvail ? (
                              <span className="text-[8.5px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5 truncate">
                                <i className="fa-solid fa-circle-check text-[7px]" />
                                <span className="truncate">Full</span>
                              </span>
                            ) : isPartial ? (
                              <span className="text-[8.5px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-0.5 font-mono truncate">
                                <i className="fa-solid fa-clock text-[7px]" />
                                <span>{rec.hours ? `${rec.hours}h` : "Part"}</span>
                              </span>
                            ) : (
                              <span className="text-[8.5px] font-bold text-rose-700 dark:text-rose-300 flex items-center gap-0.5 truncate">
                                <i className="fa-solid fa-circle-xmark text-[7px]" />
                                <span className="truncate">Off</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Mobile overflow indicator for >2 records */}
                    {records.length > 2 && (
                      <div
                        onClick={(e) => {
                          if (!isMultiSelectMode) {
                            e.stopPropagation();
                            setInspectedDay(day.dateString);
                          }
                        }}
                        className="sm:hidden text-[8px] font-bold text-primary text-center cursor-pointer"
                      >
                        +{records.length - 2}
                      </div>
                    )}

                    {/* Desktop overflow indicator for >3 records */}
                    {records.length > 3 && (
                      <div
                        onClick={(e) => {
                          if (!isMultiSelectMode) {
                            e.stopPropagation();
                            setInspectedDay(day.dateString);
                          }
                        }}
                        className="hidden sm:block text-[9px] sm:text-[10px] font-bold text-primary hover:underline text-center cursor-pointer"
                      >
                        +{records.length - 3} more
                      </div>
                    )}
                  </div>

                  {/* Empty cell placeholder hint */}
                  {records.length === 0 && day.isCurrentMonth && (
                    <div className="text-[10px] text-muted-foreground/30 text-center font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMultiSelectMode ? (isSelected ? "Selected" : "Click to select") : "Click to mark"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        /* Roster List View: Mobile Card Stack + Desktop Data Table */
        <Card className="border border-border/80 shadow-xs overflow-hidden bg-card rounded-2xl">
          <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2">
              <i className="fa-solid fa-list-check text-primary" />
              Recorded Availability Entries ({availabilities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {availabilities.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2 p-4">
                <i className="fa-solid fa-calendar-xmark text-4xl opacity-30 text-muted-foreground" />
                <p className="font-bold text-foreground text-sm">No availability records found for {MONTH_NAMES[currentMonth]} {currentYear}</p>
                <p className="text-[11px]">Click "Set Availability" above to add dates.</p>
              </div>
            ) : (
              <div>
                {/* 1. Mobile Responsive Card List (Visible on Mobile only: < 640px) */}
                <div className="block sm:hidden divide-y divide-border/60">
                  {availabilities.map((rec) => {
                    const isAvail = rec.status === "Available";
                    const isPartial = rec.status === "Partial";
                    const isUnavail = rec.status === "Unavailable";

                    return (
                      <div key={rec._id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {rec.userId?.name ? rec.userId.name.charAt(0) : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-foreground truncate">
                                {rec.userId?.name || "Staff Member"}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {rec.userId?.employmentType || "Flexible"}
                              </p>
                            </div>
                          </div>

                          <Badge
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-bold shrink-0",
                              isAvail && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
                              isPartial && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
                              isUnavail && "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            )}
                          >
                            <i
                              className={cn(
                                "mr-1 text-[9px]",
                                isAvail && "fa-solid fa-circle-check text-emerald-500",
                                isPartial && "fa-solid fa-business-time text-amber-500",
                                isUnavail && "fa-solid fa-circle-xmark text-rose-500"
                              )}
                            />
                            {rec.status}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-0.5">
                          <span className="font-mono font-bold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar-day text-[10px] text-primary" />
                            {rec.dateString}
                          </span>

                          <div className="text-muted-foreground font-medium">
                            {isPartial ? (
                              <span>
                                <strong className="text-foreground">{rec.hours || 0}h</strong>{" "}
                                {rec.startTime && rec.endTime && `(${rec.startTime} - ${rec.endTime})`}
                              </span>
                            ) : isAvail ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <i className="fa-solid fa-sun text-[10px]" /> Full Day
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                <i className="fa-solid fa-bed text-[10px]" /> Off / Rest
                              </span>
                            )}
                          </div>
                        </div>

                        {rec.notes && (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/30 px-2 py-1 rounded-md">
                            &ldquo;{rec.notes}&rdquo;
                          </p>
                        )}

                        <div className="flex justify-end pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5 font-semibold hover:border-primary/50 cursor-pointer rounded-lg w-full justify-center"
                            onClick={() => openAddModal([rec.dateString], rec)}
                          >
                            <i className="fa-solid fa-pen-to-square text-[11px]" /> Edit Entry
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Desktop Data Table (Visible on Tablets & Desktops: >= 640px) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[620px]">
                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                      <tr>
                        <th className="p-3">Worker</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Hours / Time Window</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {availabilities.map((rec) => {
                        const isAvail = rec.status === "Available";
                        const isPartial = rec.status === "Partial";
                        const isUnavail = rec.status === "Unavailable";

                        return (
                          <tr key={rec._id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-semibold text-foreground flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {rec.userId?.name ? rec.userId.name.charAt(0) : "U"}
                              </div>
                              <div>
                                <div className="font-bold">{rec.userId?.name || "Staff Member"}</div>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {rec.userId?.employmentType || "Flexible"} &bull; {rec.userId?.department || "General"}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-foreground">
                              {rec.dateString}
                            </td>
                            <td className="p-3">
                              <Badge
                                className={cn(
                                  "text-[10px] px-2 py-0.5 font-bold",
                                  isAvail && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
                                  isPartial && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
                                  isUnavail && "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                                )}
                              >
                                <i
                                  className={cn(
                                    "mr-1 text-[9px]",
                                    isAvail && "fa-solid fa-circle-check text-emerald-500",
                                    isPartial && "fa-solid fa-business-time text-amber-500",
                                    isUnavail && "fa-solid fa-circle-xmark text-rose-500"
                                  )}
                                />
                                {rec.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {isPartial ? (
                                <span>
                                  <strong className="text-foreground">{rec.hours || 0} hrs</strong>{" "}
                                  {rec.startTime && rec.endTime && `(${rec.startTime} - ${rec.endTime})`}
                                </span>
                              ) : isAvail ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <i className="fa-solid fa-sun text-[10px]" /> Full Day
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                  <i className="fa-solid fa-bed text-[10px]" /> Off / Offline
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground italic truncate max-w-xs">
                              {rec.notes ? `"${rec.notes}"` : "-"}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 font-semibold hover:border-primary/50 cursor-pointer"
                                onClick={() => openAddModal([rec.dateString], rec)}
                              >
                                <i className="fa-solid fa-pen-to-square text-[10px]" /> Edit
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Floating Multi-Select Quick Action Bar (Adaptive Mobile Safe Insets) */}
      {selectedDates.length > 0 && (
        <div className="fixed bottom-3 sm:bottom-6 inset-x-3.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 sm:max-w-2xl sm:w-[92%] bg-card/95 border-2 border-primary/50 shadow-2xl rounded-2xl p-3 sm:p-4 backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0 shadow-xs">
                  {selectedDates.length}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-xs text-foreground truncate">
                    {selectedDates.length} Date{selectedDates.length > 1 ? "s" : ""} Selected
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[180px] sm:max-w-xs font-mono">
                    {selectedDates.slice(0, 3).join(", ")}
                    {selectedDates.length > 3 ? ` + ${selectedDates.length - 3} more` : ""}
                  </p>
                </div>
              </div>

              {/* Mobile top-right Cancel */}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="sm:hidden h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
              >
                Cancel
              </Button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
              <Button
                size="sm"
                disabled={batchActionLoading}
                onClick={() => handleQuickBatchSubmit("Available")}
                className="h-9 sm:h-8 flex-1 sm:flex-none text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs cursor-pointer rounded-xl"
              >
                <i className="fa-solid fa-circle-check text-[11px]" />
                Available
              </Button>

              <Button
                size="sm"
                disabled={batchActionLoading}
                onClick={() => handleQuickBatchSubmit("Unavailable")}
                className="h-9 sm:h-8 flex-1 sm:flex-none text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-xs cursor-pointer rounded-xl"
              >
                <i className="fa-solid fa-circle-xmark text-[11px]" />
                Offline
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={batchActionLoading}
                onClick={() => openAddModal(selectedDates)}
                className="h-9 sm:h-8 flex-1 sm:flex-none text-xs font-semibold gap-1.5 border-primary/50 text-primary hover:bg-primary/10 cursor-pointer rounded-xl"
              >
                <i className="fa-solid fa-clock text-[11px]" />
                <span className="hidden sm:inline">Custom Hours...</span>
                <span className="sm:hidden">Hours</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                disabled={batchActionLoading}
                onClick={handleQuickBatchDelete}
                className="h-9 sm:h-8 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer px-2.5 rounded-xl shrink-0"
                title="Clear availability for these dates"
              >
                <i className="fa-solid fa-trash text-[11px]" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="hidden sm:inline-flex h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Day Inspection Modal (when clicking a date with multiple workers in Team view) */}
      {inspectedDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-calendar-day text-primary" /> Roster for {inspectedDay}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {(availabilityByDate[inspectedDay] || []).length} availability record(s) on this date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 flex-1 overflow-y-auto overscroll-contain">
              {(availabilityByDate[inspectedDay] || []).map((rec) => {
                const isAvail = rec.status === "Available";
                const isPartial = rec.status === "Partial";
                const isUnavail = rec.status === "Unavailable";

                return (
                  <div
                    key={rec._id}
                    className="p-3 rounded-xl border border-border bg-muted/10 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-xs text-foreground flex items-center gap-2 flex-wrap">
                        <span className="truncate">{rec.userId?.name || "Staff Member"}</span>
                        <Badge
                          className={cn(
                            "text-[9px] px-1.5 py-0 font-bold",
                            isAvail && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
                            isPartial && "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
                            isUnavail && "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                          )}
                        >
                          {rec.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {rec.userId?.employmentType || "Flexible"} &bull;{" "}
                        {isPartial ? `${rec.hours || 0} hrs (${rec.startTime || "Flex"} - ${rec.endTime || "Flex"})` : rec.status}
                      </p>
                      {rec.notes && (
                        <p className="text-[10px] text-muted-foreground italic truncate">&ldquo;{rec.notes}&rdquo;</p>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-2.5 cursor-pointer rounded-lg shrink-0"
                      onClick={() => {
                        setInspectedDay(null);
                        openAddModal([inspectedDay], rec);
                      }}
                    >
                      <i className="fa-solid fa-pen text-[10px]" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="p-3 sm:p-3.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 sm:h-8 cursor-pointer rounded-xl px-3"
                onClick={() => setInspectedDay(null)}
              >
                Close
              </Button>
              <Button
                size="sm"
                className="text-xs h-9 sm:h-8 gap-1.5 bg-primary cursor-pointer rounded-xl px-3"
                onClick={() => {
                  const day = inspectedDay;
                  setInspectedDay(null);
                  openAddModal([day]);
                }}
              >
                <i className="fa-solid fa-plus text-[10px]" /> Add Worker
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Set / Edit Availability Modal with Enhanced Mobile & Accessible UI */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-availability-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setModalOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !saving) setModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border/80 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Sticky Header */}
            <div className="shrink-0 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-calendar-check text-xs" />
                </div>
                <div className="min-w-0">
                  <h3 id="modal-availability-title" className="font-bold text-sm text-foreground truncate">
                    {modalRecordId ? "Update Availability" : "Record Work Availability"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {modalDates.length === 1 ? (
                      <>Date: <strong className="text-foreground">{modalDates[0]}</strong></>
                    ) : (
                      <>Applying to <strong className="text-foreground">{modalDates.length} selected dates</strong></>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Form wrapping body + sticky footer */}
            <form onSubmit={handleSaveAvailability} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Modal Body */}
              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 text-xs overscroll-contain">
                {/* Target Worker Selector (Elevated Users only) */}
                {isElevated && (
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                      <i className="fa-solid fa-user text-primary text-[10px]" /> Select Staff Member:
                    </label>
                    <select
                      value={modalTargetUserId}
                      onChange={(e) => setModalTargetUserId(e.target.value)}
                      required
                      className="w-full h-9 rounded-xl border border-border bg-background px-3 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary font-medium"
                    >
                      <option value="">-- Choose Worker --</option>
                      {eligibleWorkers.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name} ({w.employmentType || "Staff"}) - {w.department || "General"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Target Dates Section - Clean & Compact */}
                {modalDates.length === 1 && !showDateAdder ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-calendar-day text-xs" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-foreground block truncate">
                          {(() => {
                            try {
                              const [y, m, d] = modalDates[0].split("-").map(Number);
                              const dateObj = new Date(y, m - 1, d);
                              return dateObj.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                            } catch {
                              return modalDates[0];
                            }
                          })()}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {modalDates[0]}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDateAdder(true)}
                      className="text-[11px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                    >
                      <i className="fa-solid fa-plus text-[9px]" /> Add more dates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/20 border border-border/70">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-calendar-days text-primary text-[11px]" />
                        Selected Dates ({modalDates.length})
                      </span>
                      {modalDates.length <= 1 && (
                        <button
                          type="button"
                          onClick={() => setShowDateAdder(false)}
                          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Hide
                        </button>
                      )}
                    </div>

                    {/* Date Chips */}
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 rounded-lg bg-background border border-border/60">
                      {modalDates.map((dStr) => (
                        <span
                          key={dStr}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold"
                        >
                          {dStr}
                          <button
                            type="button"
                            onClick={() => removeDateFromModal(dStr)}
                            disabled={modalDates.length <= 1}
                            className="hover:text-rose-500 ml-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Remove date"
                          >
                            <i className="fa-solid fa-xmark text-[9px]" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add Extra Date Input */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Input
                        type="date"
                        value={newDatePickerValue}
                        onChange={(e) => setNewDatePickerValue(e.target.value)}
                        className="h-8 text-xs flex-1 rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDateToModal(newDatePickerValue)}
                        disabled={!newDatePickerValue}
                        className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer shrink-0 rounded-lg"
                      >
                        <i className="fa-solid fa-plus text-[9px]" /> Add Date
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Selection Cards (Touch-Optimized for all viewports) */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <i className="fa-solid fa-traffic-light text-primary text-[10px]" /> Availability Status:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setModalStatus("Available")}
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1",
                        modalStatus === "Available"
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <i className="fa-solid fa-circle-check text-base text-emerald-500" />
                      <span className="text-[11px] sm:text-xs">Available</span>
                      <span className="text-[9.5px] sm:text-[10px] hidden xs:block font-normal opacity-75">Full day (8h)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalStatus("Partial")}
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1",
                        modalStatus === "Partial"
                          ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <i className="fa-solid fa-business-time text-base text-amber-500" />
                      <span className="text-[11px] sm:text-xs">Partial</span>
                      <span className="text-[9.5px] sm:text-[10px] hidden xs:block font-normal opacity-75">Custom hours</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalStatus("Unavailable")}
                      className={cn(
                        "p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1",
                        modalStatus === "Unavailable"
                          ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs ring-1 ring-rose-500/30"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <i className="fa-solid fa-circle-xmark text-base text-rose-500" />
                      <span className="text-[11px] sm:text-xs">Unavailable</span>
                      <span className="text-[9.5px] sm:text-[10px] hidden xs:block font-normal opacity-75">Off duty</span>
                    </button>
                  </div>
                </div>

                {/* If Partial: Clean & Direct Start / End Time Configuration */}
                {modalStatus === "Partial" && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-2.5 sm:space-y-3 animate-in fade-in duration-150">
                    {/* Shift Header & Duration Pill */}
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs">
                        <i className="fa-solid fa-business-time text-amber-500 text-xs" />
                        <span>Shift Hours Window</span>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/40 text-xs font-mono font-bold px-2 py-0.5">
                        <i className="fa-solid fa-clock mr-1 text-[10px]" />
                        {modalHours} Hours
                      </Badge>
                    </div>

                    {/* Clean 2-Column Time Pickers */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
                      {/* Start Time Field */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 space-y-1">
                        <label className="text-[10px] sm:text-[11px] font-bold text-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-play text-amber-500 text-[9px]" /> Start
                          </span>
                          <span className="font-mono text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
                            {modalStartTime}
                          </span>
                        </label>
                        <input
                          type="time"
                          value={timeStrToInput24(modalStartTime)}
                          onChange={(e) => {
                            const newStart = input24ToTimeStr(e.target.value);
                            setModalStartTime(newStart);
                            setModalHours(calcShiftHours(newStart, modalEndTime));
                          }}
                          className="w-full h-9 sm:h-8.5 px-2 rounded-lg border border-border bg-muted/20 text-xs font-mono font-semibold text-foreground focus:ring-1 focus:ring-primary focus:bg-background cursor-pointer"
                        />
                      </div>

                      {/* End Time Field */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-background border border-border/80 space-y-1">
                        <label className="text-[10px] sm:text-[11px] font-bold text-foreground flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-stop text-amber-500 text-[9px]" /> End
                          </span>
                          <span className="font-mono text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-bold truncate">
                            {modalEndTime}
                          </span>
                        </label>
                        <input
                          type="time"
                          value={timeStrToInput24(modalEndTime)}
                          onChange={(e) => {
                            const newEnd = input24ToTimeStr(e.target.value);
                            setModalEndTime(newEnd);
                            setModalHours(calcShiftHours(modalStartTime, newEnd));
                          }}
                          className="w-full h-9 sm:h-8.5 px-2 rounded-lg border border-border bg-muted/20 text-xs font-mono font-semibold text-foreground focus:ring-1 focus:ring-primary focus:bg-background cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Clean Shift Summary */}
                    <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 rounded-lg bg-background/80 border border-border/60 text-[10px] sm:text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <i className="fa-solid fa-clock text-amber-500 text-[10px] shrink-0" />
                        <span className="truncate font-mono">{modalStartTime} &rarr; {modalEndTime}</span>
                      </span>
                      <span className="font-bold font-mono text-amber-600 dark:text-amber-400 shrink-0 ml-1">
                        {modalHours}h total
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                    <i className="fa-solid fa-note-sticky text-primary text-[10px]" /> Remarks / Notes (Optional):
                  </label>
                  <textarea
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Available for sprint standup, bug fixes, or client review..."
                    className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>
              </div>

              {/* Sticky Footer (Responsive Button Sizing) */}
              <div className="shrink-0 p-3 sm:px-5 sm:py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
                {modalRecordId || modalDates.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteSingleModal}
                    disabled={saving}
                    className="h-9 sm:h-8 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer rounded-xl shrink-0 px-2.5"
                  >
                    <i className="fa-solid fa-trash text-[10px] sm:mr-1" />
                    <span className="hidden sm:inline">{modalDates.length > 1 ? `Clear (${modalDates.length})` : "Delete"}</span>
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                    className="h-9 sm:h-8 text-xs cursor-pointer rounded-xl px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving}
                    className="h-9 sm:h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs transition-all rounded-xl px-3"
                  >
                    {saving ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk" />
                        <span className="hidden sm:inline">Apply to {modalDates.length} Date{modalDates.length > 1 ? "s" : ""}</span>
                        <span className="sm:hidden">Apply ({modalDates.length})</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

