"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";
import { isSubAdminRole, normalizeRoleKey } from "@/lib/roles";

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
  confirmed?: boolean;
  confirmedAt?: string;
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
  const [dayDrawerTab, setDayDrawerTab] = useState<"All" | "Confirmed" | "Unconfirmed" | "Partial" | "Unavailable" | "Available">("All");
  const [dayDrawerSearch, setDayDrawerSearch] = useState<string>("");
  const dayTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dayTabsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active tab into view whenever it changes or when the Day Inspector opens
  useEffect(() => {
    if (inspectedDay && dayTabRefs.current[dayDrawerTab]) {
      const activeBtn = dayTabRefs.current[dayDrawerTab];
      const timer = setTimeout(() => {
        activeBtn?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [dayDrawerTab, inspectedDay]);

  const selectDayTab = (
    tab: "All" | "Confirmed" | "Unconfirmed" | "Partial" | "Unavailable" | "Available",
    targetEl?: HTMLButtonElement | null
  ) => {
    setDayDrawerTab(tab);
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  const navigateInspectedDay = (direction: -1 | 1) => {
    if (!inspectedDay) return;
    const parts = inspectedDay.split("-").map(Number);
    const target = new Date(parts[0], parts[1] - 1, parts[2] + direction);
    const nextStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
    setInspectedDay(nextStr);
    if (target.getMonth() !== currentMonth || target.getFullYear() !== currentYear) {
      setCurrentDate(target);
    }
  };

  // Monthly Confirmation & Prompt States
  const [confirmations, setConfirmations] = useState<Record<string, { confirmed: boolean; confirmedAt?: string }>>({});
  const [isMonthConfirmed, setIsMonthConfirmed] = useState(false);
  const [showMonthlyPrompt, setShowMonthlyPrompt] = useState(false);
  const [confirmingMonth, setConfirmingMonth] = useState(false);
  const [skipCount, setSkipCount] = useState<number>(0);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  // Current real-world month key (YYYY-MM) for locking past months
  const realNow = new Date();
  const realCurrentMonthKey = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, "0")}`;
  const isPastMonth = monthKey < realCurrentMonthKey;

  const isDateInPastMonth = (dStr: string | null | undefined) => {
    if (!dStr) return false;
    return dStr.slice(0, 7) < realCurrentMonthKey;
  };

  const userRoleKey = currentUser?.role ? normalizeRoleKey(currentUser.role) : "";
  const isAdminRole =
    isAdmin ||
    userRoleKey === "Admin" ||
    Boolean(currentUser?.role && currentUser.role.trim().toLowerCase() === "admin");

  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const isViewingSelf = !isElevated || selectedWorkerId === currentUserId;

  // Only Admin is exempt from filling availability schedules.
  // Everyone else (OPS/SubAdmin, HR, Manager, Employees, etc.) records their own availability.
  // Past months availability is locked and cannot be edited.
  const canEditAvailability = !isAdminRole && isEligibleWorker && isViewingSelf && !isPastMonth;

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
        setConfirmations(data.confirmations || {});
        const confirmed = Boolean(data.isCurrentUserConfirmed !== undefined ? data.isCurrentUserConfirmed : data.isMonthConfirmed);
        setIsMonthConfirmed(confirmed);

        // Daily Reminder Logic: Up to 3 Days with Maximum 2 Skips
        const storageKey = `avail_snooze_${currentUserId}_${monthKey}`;
        let currentSnooze = { skipCount: 0, lastSnoozedAt: 0, lastSnoozedDateStr: "" };
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) currentSnooze = JSON.parse(raw);
          } catch (e) {}
        }

        const effectiveSkipCount = Number(currentSnooze.skipCount || 0);
        setSkipCount(effectiveSkipCount);

        const now = Date.now();
        const isNextDayOr24h =
          !currentSnooze.lastSnoozedAt ||
          now - currentSnooze.lastSnoozedAt >= 24 * 60 * 60 * 1000 ||
          todayStr !== currentSnooze.lastSnoozedDateStr;

        if (!confirmed && data.isEligibleWorker && !isAdminRole && !isPastMonth) {
          if (effectiveSkipCount === 0) {
            // Day 1: Fresh prompt
            setShowMonthlyPrompt(true);
          } else if (effectiveSkipCount === 1) {
            // Day 2 (1 skip used): Show if 24 hours or next day has arrived
            if (isNextDayOr24h) {
              setShowMonthlyPrompt(true);
            }
          } else {
            // Day 3 (2 skips used): Skips exhausted; mandatory prompt if next day has arrived
            if (isNextDayOr24h) {
              setShowMonthlyPrompt(true);
            }
          }
        } else {
          setShowMonthlyPrompt(false);
        }
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

  // Group all raw availability records by dateString (unfiltered)
  const rawAvailabilityByDate = useMemo(() => {
    const map: Record<string, AvailabilityRecord[]> = {};
    for (const record of availabilities) {
      if (!map[record.dateString]) {
        map[record.dateString] = [];
      }
      map[record.dateString].push(record);
    }
    return map;
  }, [availabilities]);

  // Group filtered availability records by dateString (matching statusFilter)
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

  // Filtered array of availabilities for List View
  const filteredAvailabilities = useMemo(() => {
    if (statusFilter === "All") return availabilities;
    return availabilities.filter((rec) => rec.status === statusFilter);
  }, [availabilities, statusFilter]);

  // Breakdown of month days (working vs Sundays)
  const monthDayBreakdown = useMemo(() => {
    const currentMonthDays = calendarDays.filter((d) => d.isCurrentMonth);
    let sundaysCount = 0;
    let workingDaysCount = 0;
    for (const d of currentMonthDays) {
      if (d.date.getDay() === 0) sundaysCount++;
      else workingDaysCount++;
    }
    return { sundaysCount, workingDaysCount, totalDays: currentMonthDays.length };
  }, [calendarDays]);

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

    // In single worker mode, add working days (Mon-Sat) without records as Available by default
    const isSingleWorker = !isElevated || selectedWorkerId !== "All";
    let defaultAvailableCount = 0;
    if (isSingleWorker) {
      for (const d of calendarDays) {
        if (d.isCurrentMonth && d.date.getDay() !== 0) {
          const recs = rawAvailabilityByDate[d.dateString] || [];
          if (recs.length === 0) {
            defaultAvailableCount++;
          }
        }
      }
    }

    return {
      available: availableCount + defaultAvailableCount,
      explicitAvailable: availableCount,
      defaultAvailable: defaultAvailableCount,
      partial: partialCount,
      unavailable: unavailableCount,
      totalEntries: availabilities.length,
      sundays: monthDayBreakdown.sundaysCount,
      workingDays: monthDayBreakdown.workingDaysCount,
    };
  }, [availabilities, isElevated, selectedWorkerId, calendarDays, rawAvailabilityByDate, monthDayBreakdown]);

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

  // Detailed day roster data for Day Inspector modal (defaults to Available workers)
  interface DayWorkerItem {
    workerId: string;
    name: string;
    email?: string;
    role?: string;
    department?: string;
    employmentType?: string;
    photoUrl?: string;
    status: "Available" | "Partial" | "Unavailable";
    isDefault: boolean;
    hours?: number;
    startTime?: string;
    endTime?: string;
    notes?: string;
    recordId?: string;
    confirmed: boolean;
    canEdit: boolean;
  }

  const inspectedDayData = useMemo(() => {
    if (!inspectedDay) return null;

    let workersPool: WorkerUser[] = [];
    if (isElevated) {
      if (selectedWorkerId && selectedWorkerId !== "All") {
        workersPool = eligibleWorkers.filter((w) => w._id === selectedWorkerId);
      } else {
        workersPool = eligibleWorkers;
      }
    } else {
      const currentWorkerUser: WorkerUser = {
        _id: currentUserId,
        name: currentUser?.name || "Me",
        email: currentUser?.email || "",
        role: currentUser?.role || "Staff",
        employmentType: currentUser?.employmentType || "Full-Time",
        department: (currentUser as any)?.department || "",
      };
      workersPool = [currentWorkerUser];
    }

    const parts = inspectedDay.split("-").map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const isSunday = dateObj.getDay() === 0;

    const dayRecords = rawAvailabilityByDate[inspectedDay] || [];

    const roster: DayWorkerItem[] = workersPool.map((worker) => {
      const explicitRec = dayRecords.find((r) => {
        const recUserId = typeof r.userId === "object" ? r.userId?._id : r.userId;
        return String(recUserId) === String(worker._id);
      });

      const isWorkerConfirmed = Boolean(
        explicitRec?.confirmed ||
        confirmations[worker._id]?.confirmed ||
        (String(worker._id) === currentUserId && isMonthConfirmed)
      );

      const isSelf = String(worker._id) === currentUserId;
      const canEdit = !isAdminRole && isEligibleWorker && isSelf && !isDateInPastMonth(inspectedDay);

      if (explicitRec) {
        return {
          workerId: worker._id,
          name: worker.name,
          email: worker.email,
          role: worker.role,
          department: worker.department,
          employmentType: worker.employmentType,
          photoUrl: worker.photoUrl,
          status: explicitRec.status,
          isDefault: false,
          hours: explicitRec.hours,
          startTime: explicitRec.startTime,
          endTime: explicitRec.endTime,
          notes: explicitRec.notes,
          recordId: explicitRec._id,
          confirmed: isWorkerConfirmed,
          canEdit,
        };
      }

      if (isSunday) {
        return {
          workerId: worker._id,
          name: worker.name,
          email: worker.email,
          role: worker.role,
          department: worker.department,
          employmentType: worker.employmentType,
          photoUrl: worker.photoUrl,
          status: "Unavailable",
          isDefault: true,
          hours: 0,
          notes: "Sunday Off (Weekly Rest)",
          confirmed: true,
          canEdit,
        };
      }

      return {
        workerId: worker._id,
        name: worker.name,
        email: worker.email,
        role: worker.role,
        department: worker.department,
        employmentType: worker.employmentType,
        photoUrl: worker.photoUrl,
        status: "Available",
        isDefault: true,
        hours: 8,
        startTime: "09:00 AM",
        endTime: "05:00 PM",
        notes: "Available by default (Standard Schedule)",
        confirmed: isWorkerConfirmed,
        canEdit,
      };
    });

    const available = roster.filter((w) => w.status === "Available");
    const partial = roster.filter((w) => w.status === "Partial");
    const unavailable = roster.filter((w) => w.status === "Unavailable");
    const confirmed = roster.filter((w) => w.confirmed);
    const unconfirmed = roster.filter((w) => !w.confirmed);
    const confirmedCount = confirmed.length;
    const totalCount = roster.length;
    const confirmedPercent = totalCount > 0 ? Math.round((confirmedCount / totalCount) * 100) : 0;

    return {
      dateString: inspectedDay,
      dateObj,
      isSunday,
      roster,
      available,
      partial,
      unavailable,
      confirmed,
      unconfirmed,
      confirmedCount,
      totalCount,
      confirmedPercent,
    };
  }, [
    inspectedDay,
    isElevated,
    selectedWorkerId,
    eligibleWorkers,
    currentUserId,
    currentUser,
    rawAvailabilityByDate,
    confirmations,
    isMonthConfirmed,
    canEditAvailability,
  ]);

  // Multi-select toggle helpers
  const toggleDateSelection = (dateStr: string) => {
    if (isDateInPastMonth(dateStr)) {
      showToast("Past months availability is locked and cannot be edited.", "error");
      return;
    }
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const selectAllWeekdays = () => {
    if (isPastMonth) {
      showToast("Past months availability is locked.", "error");
      return;
    }
    const weekdays = calendarDays
      .filter((d) => d.isCurrentMonth && d.date.getDay() !== 0 && d.date.getDay() !== 6 && !isDateInPastMonth(d.dateString))
      .map((d) => d.dateString);
    setSelectedDates(weekdays);
    setIsMultiSelectMode(true);
  };

  const selectAllWeekends = () => {
    if (isPastMonth) {
      showToast("Past months availability is locked.", "error");
      return;
    }
    const weekends = calendarDays
      .filter((d) => d.isCurrentMonth && (d.date.getDay() === 0 || d.date.getDay() === 6) && !isDateInPastMonth(d.dateString))
      .map((d) => d.dateString);
    setSelectedDates(weekends);
    setIsMultiSelectMode(true);
  };

  // Exclude Sundays and past dates from entire month selection!
  const selectEntireMonth = () => {
    if (isPastMonth) {
      showToast("Past months availability is locked.", "error");
      return;
    }
    const workingDays = calendarDays
      .filter((d) => d.isCurrentMonth && d.date.getDay() !== 0 && !isDateInPastMonth(d.dateString)) // Exclude Sundays & past dates
      .map((d) => d.dateString);
    setSelectedDates(workingDays);
    setIsMultiSelectMode(true);
  };

  const clearSelection = () => {
    setSelectedDates([]);
  };

  const handleConfirmMonth = async () => {
    if (isPastMonth) {
      showToast("Past months availability is locked and cannot be confirmed or modified.", "error");
      return;
    }
    if (isAdminRole || !isEligibleWorker) {
      showToast("Admin is exempt from recording or confirming availability schedules.", "error");
      return;
    }
    try {
      setConfirmingMonth(true);
      const res = await fetch("/api/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-month",
          monthKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm availability");
      setIsMonthConfirmed(true);
      setShowMonthlyPrompt(false);
      setSkipCount(0);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`avail_snooze_${currentUserId}_${monthKey}`);
        localStorage.removeItem(`dismissed_avail_prompt_${monthKey}`);
      }
      showToast(`Availability confirmed for ${MONTH_NAMES[currentMonth]} ${currentYear}!`, "success");
      fetchAvailability();
    } catch (err: any) {
      showToast(err.message || "Failed to confirm", "error");
    } finally {
      setConfirmingMonth(false);
    }
  };

  const handleUpdateLater = () => {
    if (skipCount >= 2) {
      showToast("Maximum 2 skips reached. Please confirm your availability schedule.", "error");
      return;
    }

    const nextSkipCount = skipCount + 1;
    const storageKey = `avail_snooze_${currentUserId}_${monthKey}`;
    const snoozePayload = {
      skipCount: nextSkipCount,
      lastSnoozedAt: Date.now(),
      lastSnoozedDateStr: todayStr,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(snoozePayload));
    }
    setSkipCount(nextSkipCount);
    setShowMonthlyPrompt(false);

    if (nextSkipCount === 1) {
      showToast("Snoozed for 24 hours. (1 of 2 skips used — Day 1 of 3)", "success");
    } else if (nextSkipCount === 2) {
      showToast("Final skip used. (Day 2 of 3 — Confirmation will be mandatory tomorrow)", "error");
    }
  };

  // Open modal with single or multiple dates
  const openAddModal = (dateStrings: string[] | string, existingRecord?: AvailabilityRecord) => {
    if (isAdminRole || !isEligibleWorker) {
      showToast("Admin is exempt from recording availability schedules.", "error");
      return;
    }
    if (!canEditAvailability || isPastMonth) {
      showToast(
        isPastMonth
          ? "Past months availability is locked and cannot be edited."
          : "Please select your own schedule to edit availability.",
        "error"
      );
      return;
    }
    const datesArray = Array.isArray(dateStrings) ? dateStrings : [dateStrings];
    if (datesArray.some((d) => isDateInPastMonth(d))) {
      showToast("Past months availability is locked and cannot be edited.", "error");
      return;
    }
    setModalDates(datesArray);
    setShowDateAdder(datesArray.length > 1);
    setNewDatePickerValue("");

    if (existingRecord) {
      setModalRecordId(existingRecord._id);
      setModalTargetUserId(currentUserId);
      setModalStatus(existingRecord.status);
      setModalStartTime(existingRecord.startTime || "09:00 AM");
      setModalEndTime(existingRecord.endTime || "05:00 PM");
      setModalHours(existingRecord.hours || 4);
      setModalNotes(existingRecord.notes || "");
    } else {
      setModalRecordId(null);
      setModalTargetUserId(currentUserId);
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
    if (isDateInPastMonth(dateStr)) {
      showToast("Cannot add dates from past months. Past months are locked.", "error");
      return;
    }
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
    if (!canEditAvailability || selectedDates.length === 0) return;
    if (selectedDates.some((d) => isDateInPastMonth(d))) {
      showToast("Cannot modify dates in past months. Availability is locked.", "error");
      return;
    }
    try {
      setBatchActionLoading(true);
      const res = await fetch("/api/calendar/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: selectedDates,
          status,
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
    if (!canEditAvailability || selectedDates.length === 0) return;
    if (selectedDates.some((d) => isDateInPastMonth(d))) {
      showToast("Cannot delete or clear dates in past months. Availability is locked.", "error");
      return;
    }
    try {
      setBatchActionLoading(true);
      const url = new URL("/api/calendar/availability", window.location.origin);
      url.searchParams.set("dates", selectedDates.join(","));

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
    if (isAdminRole || !isEligibleWorker) {
      showToast("Admin is exempt from recording availability schedules.", "error");
      return;
    }
    if (!canEditAvailability) {
      showToast(
        isPastMonth
          ? "Past months availability is locked and cannot be edited."
          : "Please select your own schedule to edit availability.",
        "error"
      );
      return;
    }
    if (modalDates.length === 0) {
      showToast("Please select at least one date", "error");
      return;
    }
    if (modalDates.some((d) => isDateInPastMonth(d))) {
      showToast("Past months availability is locked and cannot be modified.", "error");
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
    if (!canEditAvailability || (!modalRecordId && modalDates.length === 0)) return;
    if (modalDates.some((d) => isDateInPastMonth(d))) {
      showToast("Past months availability is locked and cannot be deleted.", "error");
      return;
    }
    try {
      setSaving(true);
      const url = new URL("/api/calendar/availability", window.location.origin);
      if (modalRecordId) {
        url.searchParams.set("id", modalRecordId);
      } else {
        url.searchParams.set("dates", modalDates.join(","));
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
                    isAdminRole
                      ? "bg-primary/10 text-primary border-primary/25"
                      : isElevated
                      ? "bg-primary/10 text-primary border-primary/25"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isAdminRole || isElevated ? "bg-primary" : "bg-emerald-500"
                    )}
                  />
                  {isAdminRole
                    ? "Admin (Exempt from Availability)"
                    : isElevated
                    ? selectedWorkerId === currentUserId
                      ? "My Work Availability"
                      : "Team Overview"
                    : currentUser?.employmentType || "Staff Availability"}
                </span>

                {isAdminRole && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-muted/60 text-muted-foreground border-border/80"
                    title="Admin is exempt from recording availability schedules. All team members record their own availability."
                  >
                    <i className="fa-solid fa-shield-halved text-[10px]" />
                    Admin Oversight
                  </span>
                )}

                {/* Monthly Confirmation Dot Indicator Badge */}
                {!isAdminRole && (
                  isMonthConfirmed ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      title="Availability confirmed for this month"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse" />
                      Confirmed (Green Dot)
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-slate-400/10 text-slate-600 dark:text-slate-400 border-slate-400/25"
                      title="Availability not yet confirmed by user (defaults to Available)"
                    >
                      <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/20" />
                      Unconfirmed (Grey Dot)
                    </span>
                  )
                )}
              </div>
              <CardDescription className="text-xs leading-relaxed max-w-2xl text-muted-foreground">
                {isAdminRole
                  ? "Admin workspace oversight: inspect and coordinate working availability across team members. All team members except Admin record and manage their own availability."
                  : isElevated && selectedWorkerId !== currentUserId
                  ? "Track and inspect team availability roster, or switch to your personal schedule to record and confirm your own monthly availability."
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

                {/* Multi-Select Toggle Button (Workers only) */}
                {canEditAvailability && (
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
                )}
              </div>

              {canEditAvailability ? (
                /* Set Availability CTA */
                <Button
                  size="sm"
                  onClick={() => openAddModal(selectedDates.length > 0 ? selectedDates : [todayStr])}
                  className="h-9 sm:h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer transition-all rounded-xl w-full sm:w-auto justify-center"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  <span>{selectedDates.length > 0 ? `Set ${selectedDates.length} Dates` : "Set Availability"}</span>
                </Button>
              ) : isPastMonth ? (
                <div className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold select-none">
                  <i className="fa-solid fa-lock text-[11px]" />
                  <span>Past Month (Locked)</span>
                </div>
              ) : isElevated && selectedWorkerId === "All" && isEligibleWorker && !isAdminRole ? (
                /* Elevated workers (OPS, HR, Managers) prompt to switch to own schedule */
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedWorkerId(currentUserId)}
                  className="h-9 sm:h-8 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs cursor-pointer transition-all rounded-xl w-full sm:w-auto justify-center"
                >
                  <i className="fa-solid fa-user-pen text-xs" />
                  <span>Fill My Availability</span>
                </Button>
              ) : isAdminRole ? (
                <div className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-3 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground text-xs font-semibold select-none">
                  <i className="fa-solid fa-shield-halved text-[11px] text-muted-foreground/70" />
                  <span>Admin Oversight (Exempt)</span>
                </div>
              ) : (
                <div className="inline-flex items-center justify-center gap-1.5 h-9 sm:h-8 px-3 rounded-xl border border-border/80 bg-muted/40 text-muted-foreground text-xs font-semibold select-none">
                  <i className="fa-solid fa-lock text-[11px] text-muted-foreground/70" />
                  <span>View Only (Workers Self-Manage)</span>
                </div>
              )}
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
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                  {stats.defaultAvailable > 0
                    ? `${stats.explicitAvailable} marked + ${stats.defaultAvailable} default`
                    : "Full-day scheduled"}
                </p>
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

            {/* 3. Sundays Off (Excluded) */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.03] hover:border-rose-500/50 hover:shadow-xs transition-all flex items-center justify-between group">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Sundays Off (Excluded)
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground flex items-baseline gap-1.5">
                  <span>{stats.sundays}</span>
                  {stats.unavailable > 0 && (
                    <span className="text-xs text-rose-500 font-semibold font-sans">
                      +{stats.unavailable} off
                    </span>
                  )}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Weekly rest excluded</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center text-xs sm:text-sm shrink-0 transition-transform group-hover:scale-105 ml-1.5">
                <i className="fa-solid fa-mug-hot" />
              </div>
            </div>

            {/* 4. Total Logged / Flexible Staff */}
            <div className="p-2.5 sm:p-3.5 rounded-xl border border-border/80 bg-background/80 hover:border-primary/40 hover:shadow-xs transition-all flex items-center justify-between group">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {isElevated ? "Flexible Staff" : "Total Working Days"}
                </span>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground">
                  {isElevated ? eligibleWorkers.length : stats.workingDays}
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                  {isElevated ? "Active roster" : "Mon–Sat scheduled"}
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
                <>
                  <div className="relative flex-1 sm:w-52">
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      className="w-full h-9 sm:h-8 pl-8 pr-7 text-xs rounded-xl border border-border bg-background font-semibold text-foreground hover:border-primary/50 focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                    >
                      <option value="All">All Staff Roster ({eligibleWorkers.length})</option>
                      {!isAdminRole && isEligibleWorker && (
                        <option value={currentUserId}>
                          {confirmations[currentUserId]?.confirmed || isMonthConfirmed ? "● " : "○ "} Myself: {currentUser?.name || "You"} {confirmations[currentUserId]?.confirmed || isMonthConfirmed ? "— Confirmed" : "— Unconfirmed"}
                        </option>
                      )}
                      {eligibleWorkers
                        .filter((w) => w._id !== currentUserId)
                        .map((w) => {
                          const isWorkerConfirmed = Boolean(confirmations[w._id]?.confirmed);
                          return (
                            <option key={w._id} value={w._id}>
                              {isWorkerConfirmed ? "● " : "○ "} {w.name} ({w.role || w.employmentType || "Staff"}) {isWorkerConfirmed ? "— Confirmed" : "— Unconfirmed"}
                            </option>
                          );
                        })}
                    </select>
                    <i className="fa-solid fa-user absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none" />
                    <i className="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground pointer-events-none" />
                  </div>

                  {!isAdminRole && isEligibleWorker && (
                    selectedWorkerId === "All" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkerId(currentUserId)}
                        className="h-9 sm:h-8 text-xs font-semibold px-2.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                        title="Switch to your personal availability schedule"
                      >
                        <i className="fa-solid fa-user-clock text-xs sm:mr-1.5" />
                        <span className="hidden sm:inline">My Availability</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedWorkerId("All")}
                        className="h-9 sm:h-8 text-xs font-semibold px-2.5 rounded-xl border-border hover:bg-muted cursor-pointer shrink-0"
                        title="Switch to all staff roster overview"
                      >
                        <i className="fa-solid fa-users text-xs text-primary sm:mr-1.5" />
                        <span className="hidden sm:inline">Team Roster</span>
                      </Button>
                    )
                  )}
                </>
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
                  <i className="fa-solid fa-calendar-day text-[10px] mr-1 text-primary" />
                  Working Days (Excl. Sun)
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

      {/* Past Month Locked Notice Banner */}
      {isPastMonth && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-lock text-sm" />
            </div>
            <div>
              <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span>Past Month ({MONTH_NAMES[currentMonth]} {currentYear}) &bull; Locked</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30">
                  <i className="fa-solid fa-clock-rotate-left text-[9px]" /> Read-Only History
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Past months availability cannot be edited, confirmed, or cleared. Records are locked for audit and payroll consistency.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
            className="h-8 px-3 text-xs font-semibold rounded-xl text-primary border-primary/30 hover:bg-primary/10 cursor-pointer w-full sm:w-auto shrink-0"
          >
            <i className="fa-solid fa-calendar-day mr-1.5" /> Jump to Current Month
          </Button>
        </div>
      )}

      {/* Unconfirmed Month Prompt Banner (with Quick Confirm & Update Later) */}
      {!isMonthConfirmed && !isAdminRole && isEligibleWorker && !isPastMonth && (
        <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-bell text-sm" />
            </div>
            <div>
              <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span>Availability for {MONTH_NAMES[currentMonth]} {currentYear}</span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-400/15 text-slate-600 dark:text-slate-400 font-semibold border border-slate-400/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" /> Grey Dot: Unconfirmed
                </span>
                {skipCount >= 2 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/30">
                    <i className="fa-solid fa-triangle-exclamation text-[9px]" /> Day 3: Skips Exhausted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30">
                    <i className="fa-solid fa-clock-rotate-left text-[9px]" /> {2 - skipCount} skip{2 - skipCount === 1 ? "" : "s"} left (Day {skipCount + 1} of 3)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {skipCount >= 2
                  ? "Maximum skips reached. Confirmation is required. Working days (Mon–Sat) default to Available (8h); Sundays are excluded."
                  : "Sundays are excluded as weekly off. Working days (Mon–Sat) default to Available. You can confirm now or update anytime later."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {selectedWorkerId !== currentUserId && isElevated && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedWorkerId(currentUserId)}
                className="h-8 px-3 text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer flex-1 sm:flex-initial"
              >
                <i className="fa-solid fa-calendar-days mr-1.5" /> View My Schedule
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConfirmMonth}
              disabled={confirmingMonth}
              className="h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl cursor-pointer shadow-xs flex-1 sm:flex-initial"
            >
              <i className="fa-solid fa-circle-check text-xs" />
              {confirmingMonth ? "Confirming..." : "Confirm Month"}
            </Button>
            {skipCount < 2 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdateLater}
                className="h-8 px-3 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground cursor-pointer flex-1 sm:flex-initial"
              >
                <i className="fa-solid fa-clock mr-1" /> Update Later ({2 - skipCount} left)
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirmed Month Badge Strip */}
      {isMonthConfirmed && !isAdminRole && isEligibleWorker && (
        <div className="px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse shrink-0" />
            <span>
              Availability for <strong>{MONTH_NAMES[currentMonth]} {currentYear}</strong> is confirmed by you. Working days default to Available (Green Dot).
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (selectedWorkerId !== currentUserId && isElevated) {
                setSelectedWorkerId(currentUserId);
              }
              openAddModal(todayStr);
            }}
            className="h-7 px-2.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-lg cursor-pointer shrink-0"
          >
            <i className="fa-solid fa-pen-to-square mr-1" /> Update Dates
          </Button>
        </div>
      )}

      {/* Main Content: Calendar View vs List View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Preloader label="Loading availability schedule..." />
        </div>
      ) : viewMode === "calendar" ? (
        <Card className="border border-border/80 shadow-xs overflow-hidden bg-card rounded-2xl w-full">
          {/* Day of Week Header (Adaptive for Mobile Viewports) */}
          <div className="grid grid-cols-7 border-b border-border/80 bg-muted/30 text-center font-semibold text-[10px] sm:text-[11px] py-2 sm:py-2.5 text-muted-foreground tracking-wider uppercase">
            {WEEKDAYS.map((wd, wdIdx) => {
              const isSun = wdIdx === 0 || wd === "Sun";
              return (
                <div
                  key={wd}
                  className={cn(
                    "py-0.5 transition-colors",
                    isSun && "text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 rounded-t-lg border-b-2 border-rose-500/40"
                  )}
                >
                  <span className="hidden sm:inline">
                    {wd} {isSun && <span className="text-[9px] lowercase font-normal">(off)</span>}
                  </span>
                  <span className="sm:hidden">{wd.slice(0, 2)}</span>
                </div>
              );
            })}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60 w-full">
            {calendarDays.map((day) => {
              const rawRecords = rawAvailabilityByDate[day.dateString] || [];
              const records = availabilityByDate[day.dateString] || [];
              const isToday = day.dateString === todayStr;
              const isSelected = selectedDates.includes(day.dateString);
              const isSunday = day.date.getDay() === 0;
              const isSaturday = day.date.getDay() === 6;
              const isSingleWorker = !isElevated || selectedWorkerId !== "All";

              // Calculations for single worker
              const workerRec = rawRecords[0];
              const singleWorkerEffectiveStatus: "Available" | "Partial" | "Unavailable" = workerRec
                ? workerRec.status
                : isSunday
                ? "Unavailable"
                : "Available";

              const singleWorkerMatchesFilter =
                statusFilter === "All" || singleWorkerEffectiveStatus === statusFilter;

              const isSingleWorkerConfirmed = Boolean(
                workerRec?.confirmed ||
                  confirmations[selectedWorkerId !== "All" ? selectedWorkerId : currentUserId]?.confirmed ||
                  isMonthConfirmed
              );

              // Calculations for team mode (all staff)
              const teamExplicitPartial = rawRecords.filter((r) => r.status === "Partial");
              const teamExplicitUnavail = rawRecords.filter((r) => r.status === "Unavailable");
              const teamExplicitAvail = rawRecords.filter((r) => r.status === "Available");

              const teamTotalAvail = isSunday
                ? teamExplicitAvail.length
                : Math.max(
                    0,
                    eligibleWorkers.length - teamExplicitPartial.length - teamExplicitUnavail.length
                  );

              return (
                <div
                  key={day.dateString}
                  onClick={() => {
                    if (isMultiSelectMode && canEditAvailability && !isDateInPastMonth(day.dateString)) {
                      toggleDateSelection(day.dateString);
                    } else {
                      // By default, open the Day Inspector and show All staff with Confirmed first
                      setDayDrawerTab("All");
                      setDayDrawerSearch("");
                      setInspectedDay(day.dateString);
                    }
                  }}
                  className={cn(
                    "min-h-[68px] sm:min-h-[110px] p-1 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group relative select-none overflow-hidden",
                    !day.isCurrentMonth && "bg-muted/10 text-muted-foreground/40",
                    isSunday && day.isCurrentMonth && "bg-rose-500/[0.04] dark:bg-rose-500/[0.08] border-rose-500/20",
                    !isSunday && isSaturday && day.isCurrentMonth && "bg-muted/5",
                    isToday && "bg-primary/[0.03] ring-1.5 ring-primary/40 ring-inset",
                    isSelected && "bg-primary/10 ring-2 ring-primary ring-inset font-bold",
                    day.isCurrentMonth && !isSelected && !isSunday && "hover:bg-primary/[0.02]"
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
                          : isSunday && day.isCurrentMonth
                          ? "text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10"
                          : day.isCurrentMonth
                          ? "text-foreground font-semibold group-hover:bg-muted/60"
                          : "text-muted-foreground/35 font-normal"
                      )}
                    >
                      {day.dayNumber}
                    </span>

                    {/* Multi-select checkbox indicator */}
                    {isMultiSelectMode && canEditAvailability && !isDateInPastMonth(day.dateString) ? (
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
                    ) : canEditAvailability && !isDateInPastMonth(day.dateString) ? (
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
                    ) : isDateInPastMonth(day.dateString) && day.isCurrentMonth ? (
                      <span className="text-[9px] text-muted-foreground/35 hidden sm:inline-block" title="Past month locked">
                        <i className="fa-solid fa-lock text-[9px]" />
                      </span>
                    ) : null}
                  </div>

                  {/* Availability Badges inside Cell */}
                  <div className="space-y-0.5 sm:space-y-1 my-0.5 sm:my-1 min-w-0">
                    {/* A. SINGLE WORKER MODE */}
                    {isSingleWorker && day.isCurrentMonth && singleWorkerMatchesFilter && (
                      <>
                        {/* 1. Explicit Record */}
                        {workerRec ? (
                          <div
                            className={cn(
                              "px-1 sm:px-2 py-0.5 rounded-md text-[8.5px] sm:text-[10px] font-semibold flex items-center justify-between gap-1 truncate shadow-2xs transition-all hover:scale-[1.02]",
                              workerRec.status === "Available" &&
                                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
                              workerRec.status === "Partial" &&
                                "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25",
                              workerRec.status === "Unavailable" &&
                                "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25"
                            )}
                          >
                            <span className="truncate flex items-center gap-1.5 min-w-0">
                              {isSingleWorkerConfirmed ? (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 shrink-0 inline-block"
                                  title="Confirmed (Green Dot)"
                                />
                              ) : (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/30 shrink-0 inline-block"
                                  title="Unconfirmed (Grey Dot)"
                                />
                              )}
                              <i
                                className={cn(
                                  "text-[8px] shrink-0",
                                  workerRec.status === "Available" && "fa-solid fa-circle-check text-emerald-500",
                                  workerRec.status === "Partial" && "fa-solid fa-clock text-amber-500",
                                  workerRec.status === "Unavailable" && "fa-solid fa-circle-xmark text-rose-500"
                                )}
                              />
                              <span className="truncate">{workerRec.status}</span>
                            </span>
                            {workerRec.status === "Partial" && workerRec.hours ? (
                              <span className="font-mono text-[9px] shrink-0 font-bold bg-amber-500/20 px-1 rounded">
                                {workerRec.hours}h
                              </span>
                            ) : null}
                          </div>
                        ) : isSunday ? (
                          /* 2. Sunday Off (Excluded) */
                          <div className="px-1 sm:px-2 py-0.5 rounded-md text-[8.5px] sm:text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center justify-between gap-1 shadow-2xs">
                            <span className="flex items-center gap-1 truncate font-medium">
                              <i className="fa-solid fa-mug-hot text-[8px] text-rose-500 shrink-0" />
                              <span className="hidden sm:inline">Sunday Off</span>
                              <span className="sm:hidden">Off</span>
                            </span>
                            <span className="text-[8px] font-normal opacity-70 hidden lg:inline">Weekly Rest</span>
                          </div>
                        ) : (
                          /* 3. Mon-Sat Default Available */
                          <div
                            className="px-1 sm:px-2 py-0.5 rounded-md text-[8.5px] sm:text-[10px] font-semibold flex items-center justify-between gap-1 truncate shadow-2xs border bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                            title={
                              isSingleWorkerConfirmed
                                ? "Available (Default - Confirmed by employee)"
                                : "Available (Default - Unconfirmed by employee)"
                            }
                          >
                            <span className="truncate flex items-center gap-1.5 min-w-0">
                              {isSingleWorkerConfirmed ? (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 shrink-0 inline-block"
                                  title="Confirmed (Green Dot)"
                                />
                              ) : (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/30 shrink-0 inline-block"
                                  title="Unconfirmed (Grey Dot)"
                                />
                              )}
                              <span className="truncate font-semibold hidden sm:inline">Available (Default)</span>
                              <span className="truncate font-semibold sm:hidden">Avail</span>
                            </span>
                            <span className="text-[8px] text-muted-foreground hidden lg:inline font-mono">09:00-17:00</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* B. TEAM ROSTER MODE (ALL STAFF) */}
                    {!isSingleWorker && day.isCurrentMonth && (
                      <>
                        {/* Sunday in Team View */}
                        {isSunday && (statusFilter === "All" || statusFilter === "Unavailable") && (
                          <div className="px-1 sm:px-2 py-0.5 rounded-md text-[8.5px] sm:text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center justify-between gap-1 shadow-2xs">
                            <span className="flex items-center gap-1 truncate font-medium">
                              <i className="fa-solid fa-mug-hot text-[8px] text-rose-500 shrink-0" />
                              <span className="hidden sm:inline">Sunday Off</span>
                              <span className="sm:hidden">Off</span>
                            </span>
                            <span className="text-[8px] font-normal opacity-70 hidden lg:inline">Rest</span>
                          </div>
                        )}

                        {/* Explicit records matching filter */}
                        {records.slice(0, 2).map((rec) => {
                          const isConfirmed =
                            rec.confirmed ||
                            Boolean(confirmations[rec.userId?._id]?.confirmed) ||
                            isMonthConfirmed;
                          return (
                            <div
                              key={rec._id}
                              className={cn(
                                "px-1 sm:px-1.5 py-0.5 rounded-md text-[8.5px] sm:text-[9.5px] font-semibold flex items-center justify-between gap-1 truncate shadow-2xs",
                                rec.status === "Available" &&
                                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
                                rec.status === "Partial" &&
                                  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25",
                                rec.status === "Unavailable" &&
                                  "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25"
                              )}
                            >
                              <span className="truncate flex items-center gap-1 min-w-0">
                                {isConfirmed ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0 inline-block" />
                                )}
                                <span className="font-bold truncate">{rec.userId?.name?.split(" ")[0]}</span>
                              </span>
                              {rec.status === "Partial" && rec.hours ? (
                                <span className="font-mono text-[8px] font-bold px-0.5 bg-amber-500/20 rounded">
                                  {rec.hours}h
                                </span>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Available Staff Count Badge for Mon-Sat */}
                        {!isSunday && (statusFilter === "All" || statusFilter === "Available") && (
                          <div className="px-1 sm:px-2 py-0.5 rounded-md text-[8.5px] sm:text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center justify-between gap-1 shadow-2xs">
                            <span className="truncate flex items-center gap-1 min-w-0">
                              <i className="fa-solid fa-circle-check text-[8px] text-emerald-500 shrink-0" />
                              <span className="font-bold truncate">{teamTotalAvail} Available</span>
                            </span>
                            <span className="text-[8px] font-mono text-muted-foreground hidden lg:inline">
                              / {eligibleWorkers.length}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Empty cell placeholder hint for non-current month */}
                  {!day.isCurrentMonth && (
                    <div className="text-[10px] text-muted-foreground/30 text-center font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {isMultiSelectMode ? (isSelected ? "Selected" : "Click to select") : ""}
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
              Recorded Availability Entries ({filteredAvailabilities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAvailabilities.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2 p-4">
                <i className="fa-solid fa-calendar-xmark text-4xl opacity-30 text-muted-foreground" />
                <p className="font-bold text-foreground text-sm">
                  {statusFilter !== "All"
                    ? `No "${statusFilter}" records found for ${MONTH_NAMES[currentMonth]} ${currentYear}`
                    : `No availability records found for ${MONTH_NAMES[currentMonth]} ${currentYear}`}
                </p>
                <p className="text-[11px]">
                  {statusFilter !== "All"
                    ? "Try changing your status filter or view the calendar grid."
                    : "Click \"Set Availability\" above to add dates."}
                </p>
              </div>
            ) : (
              <div>
                {/* 1. Mobile Responsive Card List (Visible on Mobile only: < 640px) */}
                <div className="block sm:hidden divide-y divide-border/60">
                  {filteredAvailabilities.map((rec) => {
                    const isAvail = rec.status === "Available";
                    const isPartial = rec.status === "Partial";
                    const isUnavail = rec.status === "Unavailable";
                    const isRecConfirmed = rec.confirmed || Boolean(confirmations[rec.userId?._id]?.confirmed) || isMonthConfirmed;

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

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isRecConfirmed ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25 shrink-0" title="Confirmed availability (Green Dot)" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/20 shrink-0" title="Unconfirmed (Grey Dot)" />
                            )}
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

                        {((canEditAvailability || String(typeof rec.userId === "object" ? rec.userId?._id : rec.userId) === currentUserId) && !isAdminRole && isEligibleWorker && !isDateInPastMonth(rec.dateString)) ? (
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
                        ) : (
                          <div className="flex justify-end pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs gap-1.5 font-semibold text-muted-foreground hover:text-foreground cursor-pointer rounded-lg w-full justify-center"
                              onClick={() => setInspectedDay(rec.dateString)}
                            >
                              {isDateInPastMonth(rec.dateString) ? (
                                <>
                                  <i className="fa-solid fa-lock text-[11px] text-amber-500" /> View Locked Details
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-eye text-[11px]" /> View Day Details
                                </>
                              )}
                            </Button>
                          </div>
                        )}
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
                      {filteredAvailabilities.map((rec) => {
                        const isAvail = rec.status === "Available";
                        const isPartial = rec.status === "Partial";
                        const isUnavail = rec.status === "Unavailable";
                        const isRecConfirmed = rec.confirmed || Boolean(confirmations[rec.userId?._id]?.confirmed) || isMonthConfirmed;

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
                              <div className="flex items-center gap-1.5">
                                {isRecConfirmed ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25 shrink-0" title="Confirmed availability (Green Dot)" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/20 shrink-0" title="Unconfirmed availability (Grey Dot)" />
                                )}
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
                              </div>
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
                              {((canEditAvailability || String(typeof rec.userId === "object" ? rec.userId?._id : rec.userId) === currentUserId) && !isAdminRole && isEligibleWorker && !isDateInPastMonth(rec.dateString)) ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs gap-1 font-semibold hover:border-primary/50 cursor-pointer"
                                  onClick={() => openAddModal([rec.dateString], rec)}
                                >
                                  <i className="fa-solid fa-pen-to-square text-[10px]" /> Edit
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs gap-1 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={() => setInspectedDay(rec.dateString)}
                                >
                                  {isDateInPastMonth(rec.dateString) ? (
                                    <>
                                      <i className="fa-solid fa-lock text-[10px] text-amber-500" /> View
                                    </>
                                  ) : (
                                    <>
                                      <i className="fa-solid fa-eye text-[10px]" /> View
                                    </>
                                  )}
                                </Button>
                              )}
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
      {selectedDates.length > 0 && canEditAvailability && (
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

      {/* Day Inspection Modal: Opens when clicking ANY date, defaults to Available employees list */}
      {inspectedDay && inspectedDayData && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedDay(null);
          }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border/80 rounded-2xl max-w-lg sm:max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[88vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-3.5 sm:px-4 sm:py-3.5 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-calendar-day text-primary" />
                      <span>
                        {MONTH_NAMES[inspectedDayData.dateObj.getMonth()]} {inspectedDayData.dateObj.getDate()},{" "}
                        {inspectedDayData.dateObj.getFullYear()}
                      </span>
                    </h3>
                    {inspectedDayData.isSunday ? (
                      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] font-bold">
                        <i className="fa-solid fa-mug-hot mr-1 text-[9px]" /> Sunday Off
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                        <i className="fa-solid fa-briefcase mr-1 text-[9px]" /> Working Day
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {WEEKDAYS[inspectedDayData.dateObj.getDay()]}, {inspectedDayData.dateString} &bull;{" "}
                    {inspectedDayData.roster.length} employee(s) tracked
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateInspectedDay(-1)}
                    title="Previous Day"
                    className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <i className="fa-solid fa-chevron-left text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateInspectedDay(1)}
                    title="Next Day"
                    className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <i className="fa-solid fa-chevron-right text-xs" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectedDay(null)}
                    title="Close"
                    className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors ml-1"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
              </div>

              {/* Daily Confirmation Progress Bar */}
              <div className="mt-2.5 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
                    <span>Daily Confirmation</span>
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {inspectedDayData.confirmedCount} / {inspectedDayData.totalCount} confirmed ({inspectedDayData.confirmedPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      inspectedDayData.confirmedPercent === 100
                        ? "bg-emerald-500"
                        : inspectedDayData.confirmedPercent > 0
                        ? "bg-emerald-600"
                        : "bg-muted-foreground/30"
                    )}
                    style={{ width: `${inspectedDayData.confirmedPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Filter Tabs Bar */}
            <div className="pt-2.5 pb-2 border-b border-border/60 bg-muted/15 space-y-2 shrink-0">
              <div
                ref={dayTabsContainerRef}
                onWheel={(e) => {
                  if (e.deltaY !== 0 && dayTabsContainerRef.current) {
                    dayTabsContainerRef.current.scrollLeft += e.deltaY;
                  }
                }}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x px-3.5 sm:px-4 py-0.5 scroll-px-3.5 sm:scroll-px-4"
              >
                {/* 1. All Staff */}
                <button
                  ref={(el) => {
                    dayTabRefs.current["All"] = el;
                  }}
                  type="button"
                  onClick={(e) => selectDayTab("All", e.currentTarget)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-2xs select-none",
                    dayDrawerTab === "All"
                      ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
                  )}
                >
                  <i className="fa-solid fa-users text-[11px]" />
                  <span>All Staff</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      dayDrawerTab === "All" ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    {inspectedDayData.roster.length}
                  </span>
                </button>

                {/* 2. Confirmed */}
                <button
                  ref={(el) => {
                    dayTabRefs.current["Confirmed"] = el;
                  }}
                  type="button"
                  onClick={(e) => selectDayTab("Confirmed", e.currentTarget)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-2xs select-none",
                    dayDrawerTab === "Confirmed"
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
                  )}
                >
                  <i className="fa-solid fa-circle-check text-[11px]" />
                  <span>Confirmed</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      dayDrawerTab === "Confirmed" ? "bg-white/25 text-white" : "bg-muted text-foreground"
                    )}
                  >
                    {inspectedDayData.confirmed.length}
                  </span>
                </button>

                {/* 3. Unconfirmed */}
                <button
                  ref={(el) => {
                    dayTabRefs.current["Unconfirmed"] = el;
                  }}
                  type="button"
                  onClick={(e) => selectDayTab("Unconfirmed", e.currentTarget)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-2xs select-none",
                    dayDrawerTab === "Unconfirmed"
                      ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
                  )}
                >
                  <i className="fa-solid fa-clock text-[11px]" />
                  <span>Unconfirmed</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      dayDrawerTab === "Unconfirmed" ? "bg-white/25 text-white" : "bg-muted text-foreground"
                    )}
                  >
                    {inspectedDayData.unconfirmed.length}
                  </span>
                </button>

                {/* 4. Partial */}
                <button
                  ref={(el) => {
                    dayTabRefs.current["Partial"] = el;
                  }}
                  type="button"
                  onClick={(e) => selectDayTab("Partial", e.currentTarget)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-2xs select-none",
                    dayDrawerTab === "Partial"
                      ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/30"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
                  )}
                >
                  <i className="fa-solid fa-business-time text-[11px]" />
                  <span>Partial</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      dayDrawerTab === "Partial" ? "bg-white/25 text-white" : "bg-muted text-foreground"
                    )}
                  >
                    {inspectedDayData.partial.length}
                  </span>
                </button>

                {/* 5. Unavailable / Off */}
                <button
                  ref={(el) => {
                    dayTabRefs.current["Unavailable"] = el;
                  }}
                  type="button"
                  onClick={(e) => selectDayTab("Unavailable", e.currentTarget)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer shadow-2xs select-none",
                    dayDrawerTab === "Unavailable"
                      ? "bg-rose-600 text-white shadow-xs ring-2 ring-rose-600/30"
                      : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
                  )}
                >
                  <i className="fa-solid fa-circle-xmark text-[11px]" />
                  <span>Unavailable / Off</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      dayDrawerTab === "Unavailable" ? "bg-white/25 text-white" : "bg-muted text-foreground"
                    )}
                  >
                    {inspectedDayData.unavailable.length}
                  </span>
                </button>
              </div>

              {/* Search input for employee name/role/dept */}
              <div className="px-3.5 sm:px-4">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
                  <Input
                    value={dayDrawerSearch}
                    onChange={(e) => setDayDrawerSearch(e.target.value)}
                    placeholder="Filter by name, department, or role..."
                    className="pl-8 text-xs h-8 rounded-xl bg-background border-border/80"
                  />
                  {dayDrawerSearch && (
                    <button
                      type="button"
                      onClick={() => setDayDrawerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Employees for the selected tab */}
            <div className="p-3.5 sm:p-4 space-y-2.5 flex-1 overflow-y-auto overscroll-contain">
              {(() => {
                const baseList =
                  dayDrawerTab === "Confirmed"
                    ? inspectedDayData.confirmed
                    : dayDrawerTab === "Unconfirmed"
                    ? inspectedDayData.unconfirmed
                    : dayDrawerTab === "Partial"
                    ? inspectedDayData.partial
                    : dayDrawerTab === "Unavailable"
                    ? inspectedDayData.unavailable
                    : dayDrawerTab === "Available"
                    ? inspectedDayData.available
                    : inspectedDayData.roster;

                // Sort: Confirmed employees first, then unconfirmed, alphabetical within each group
                const sortedList = [...baseList].sort((a, b) => {
                  if (a.confirmed !== b.confirmed) {
                    return a.confirmed ? -1 : 1;
                  }
                  return a.name.localeCompare(b.name);
                });

                const q = dayDrawerSearch.trim().toLowerCase();
                const filtered = q
                  ? sortedList.filter(
                      (w) =>
                        w.name.toLowerCase().includes(q) ||
                        (w.department && w.department.toLowerCase().includes(q)) ||
                        (w.role && w.role.toLowerCase().includes(q)) ||
                        (w.employmentType && w.employmentType.toLowerCase().includes(q))
                    )
                  : sortedList;

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                      <i className="fa-solid fa-user-slash text-3xl opacity-30" />
                      <p className="font-semibold text-foreground">
                        {dayDrawerTab === "Confirmed"
                          ? "No employees have confirmed their availability yet"
                          : dayDrawerTab === "Unconfirmed"
                          ? "All employees have confirmed their availability!"
                          : dayDrawerTab === "Partial"
                          ? "No partial shifts recorded on this date"
                          : dayDrawerTab === "Unavailable"
                          ? "No employees marked as unavailable"
                          : dayDrawerTab === "Available"
                          ? "No employees available on this date"
                          : "No matching staff members"}
                      </p>
                      {inspectedDayData.isSunday && dayDrawerTab === "Available" && (
                        <p className="text-[11px] text-muted-foreground">
                          Sundays are excluded as weekly off for all staff by default.
                        </p>
                      )}
                    </div>
                  );
                }

                return filtered.map((worker) => {
                  const isAvail = worker.status === "Available";
                  const isPartial = worker.status === "Partial";
                  const isUnavail = worker.status === "Unavailable";

                  return (
                    <div
                      key={worker.workerId}
                      className="p-3 rounded-xl border border-border/80 bg-background hover:border-primary/40 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {worker.photoUrl ? (
                          <img
                            src={worker.photoUrl}
                            alt={worker.name}
                            className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {worker.name ? worker.name.charAt(0) : "U"}
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-foreground truncate">{worker.name}</span>
                            {worker.isDefault === false && (
                              <span
                                className="inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20"
                                title="Customized schedule entry"
                              >
                                Custom Schedule
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-muted-foreground truncate">
                            {worker.role || "Staff"} &bull; {worker.department || "General"} &bull;{" "}
                            <span className="font-medium text-foreground">{worker.employmentType || "Permanent"}</span>
                          </p>

                          {worker.notes && (
                            <p className="text-[10px] text-muted-foreground italic truncate">
                              &ldquo;{worker.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-right">
                          <Badge
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-bold transition-colors",
                              worker.confirmed
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            )}
                          >
                            <i
                              className={cn(
                                "mr-1 text-[9px]",
                                worker.confirmed ? "fa-solid fa-circle-check text-emerald-500" : "fa-solid fa-clock text-amber-500"
                              )}
                            />
                            {worker.confirmed ? "Confirmed" : "Unconfirmed"}
                          </Badge>

                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {isPartial ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {worker.hours || 0}h ({worker.startTime || "Flex"} - ${worker.endTime || "Flex"})
                              </span>
                            ) : isUnavail ? (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                {worker.notes?.includes("Sunday") ? "Sunday Off" : "Unavailable / Off"}
                              </span>
                            ) : worker.isDefault ? (
                              "Full Day (Default 8h)"
                            ) : (
                              "Full Day (8 hrs)"
                            )}
                          </div>
                        </div>

                        {worker.canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2.5 cursor-pointer rounded-xl shrink-0 hover:border-primary/50"
                            onClick={() => {
                              const targetDay = inspectedDay;
                              const existingRec = (rawAvailabilityByDate[targetDay] || []).find(
                                (r) => String(typeof r.userId === "object" ? r.userId?._id : r.userId) === currentUserId
                              );
                              setInspectedDay(null);
                              openAddModal([targetDay], existingRec);
                            }}
                            title="Edit your availability for this date"
                          >
                            <i className="fa-solid fa-pen text-[10px]" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer with Mode notice and Action Buttons */}
            <div className="p-3 sm:p-3.5 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                {isAdminRole ? (
                  <>
                    <i className="fa-solid fa-shield-halved text-primary text-xs" />
                    <span>Admin oversight: All team members except Admin record their own availability.</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-info-circle text-primary text-xs" />
                    <span>Working days default to Available unless explicitly modified.</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 sm:h-8 cursor-pointer rounded-xl px-3.5"
                  onClick={() => setInspectedDay(null)}
                >
                  Close
                </Button>
                {!isAdminRole && isEligibleWorker && !isDateInPastMonth(inspectedDay) && (
                  <Button
                    size="sm"
                    className="text-xs h-9 sm:h-8 gap-1.5 bg-primary cursor-pointer rounded-xl px-3.5 shadow-xs"
                    onClick={() => {
                      const day = inspectedDay;
                      const existingRec = (rawAvailabilityByDate[day] || []).find(
                        (r) => String(typeof r.userId === "object" ? r.userId?._id : r.userId) === currentUserId
                      );
                      setInspectedDay(null);
                      openAddModal([day], existingRec);
                    }}
                  >
                    <i className="fa-solid fa-plus text-[10px]" /> Update My Availability
                  </Button>
                )}
                {isDateInPastMonth(inspectedDay) && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                    <i className="fa-solid fa-lock text-[10px]" />
                    <span>Past Month (Locked)</span>
                  </div>
                )}
              </div>
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

      {/* Monthly Availability Confirmation Modal (Daily prompt up to 3 days, max 2 skips) */}
      {showMonthlyPrompt && !isPastMonth && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget && !confirmingMonth) {
              if (skipCount < 2) {
                handleUpdateLater();
              } else {
                showToast("Maximum 2 skips reached. Please confirm your availability schedule.", "error");
              }
            }
          }}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-base shadow-xs shrink-0">
                  <i className="fa-solid fa-calendar-check" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-foreground">
                      Monthly Availability Check
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </span>
                    {skipCount >= 2 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/30">
                        <i className="fa-solid fa-triangle-exclamation text-[9px]" /> Day 3 (Final) • Skips Exhausted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30">
                        <i className="fa-solid fa-clock-rotate-left text-[9px]" /> Day {skipCount + 1} of 3 ({2 - skipCount} skip{2 - skipCount === 1 ? "" : "s"} left)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {skipCount >= 2
                      ? "Daily skips exhausted. Please confirm your availability schedule."
                      : "Review and confirm your schedule for the month."}
                  </p>
                </div>
              </div>
              {skipCount < 2 && (
                <button
                  type="button"
                  onClick={handleUpdateLater}
                  className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                  title={`Snooze for 24h (${2 - skipCount} skips remaining)`}
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
              {/* Daily Reminder & Skips Tracker Notice */}
              {skipCount >= 2 ? (
                <div className="p-3.5 rounded-xl border border-rose-500/35 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                    <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400 text-sm" />
                    <span>Confirmation Required (2 Skips Exhausted)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    You have taken both of your allowed 24-hour skips for this month. The &ldquo;Update Later&rdquo; option is now disabled. Please confirm your availability to proceed.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 gap-2">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <i className="fa-solid fa-clock-rotate-left text-[11px]" />
                    Daily Reminder: Day {skipCount + 1} of 3
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25">
                    {2 - skipCount} of 2 skips remaining
                  </span>
                </div>
              )}

              {/* Highlight Box explaining default availability and excluded Sundays */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 text-xs leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <i className="fa-solid fa-circle-info text-primary text-sm mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">
                      Default Schedule Policy
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Your schedule is set to <strong>Available</strong> by default for all Monday to Saturday work days. <strong>Sundays are highlighted and excluded</strong> as standard weekly off.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Overview Metric Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                {/* 1. Working Days */}
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <i className="fa-solid fa-briefcase text-[10px] text-emerald-600 dark:text-emerald-400" />
                    <span>Mon – Sat</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats.workingDays} Days
                  </div>
                  <span className="text-[9.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Default Available
                  </span>
                </div>

                {/* 2. Sundays Excluded */}
                <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1">
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-center gap-1">
                    <i className="fa-solid fa-mug-hot text-[10px]" />
                    <span>Sundays</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {stats.sundays} Days
                  </div>
                  <span className="text-[9.5px] font-semibold text-rose-600 dark:text-rose-400">
                    Excluded (Off)
                  </span>
                </div>

                {/* 3. Confirmation Status Indicator */}
                <div className="p-2.5 rounded-xl border border-border bg-muted/40 space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                    <i className="fa-solid fa-circle-dot text-[10px]" />
                    <span>Status</span>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-foreground flex items-center justify-center gap-1 mt-1">
                    {isMonthConfirmed ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse" />
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">Confirmed</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-400/20" />
                        <span className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">Unconfirmed</span>
                      </>
                    )}
                  </div>
                  <span className="text-[9.5px] text-muted-foreground">
                    {isMonthConfirmed ? "Green Dot Active" : "Grey Dot Active"}
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-background text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Confirming marks your schedule with a <strong>Green Dot</strong>. Unconfirmed months display a <strong>Grey Dot</strong>.</span>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-3.5 sm:px-5 sm:py-3.5 border-t border-border bg-muted/20 shrink-0">
              {/* Desktop / Tablet Layout (>= sm) */}
              <div className="hidden sm:flex sm:items-center sm:justify-between gap-3 w-full">
                {skipCount < 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateLater}
                    className="h-9 px-3 text-xs font-semibold rounded-xl border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/70 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
                  >
                    <i className="fa-solid fa-clock text-amber-500 text-xs" />
                    <span>Update Later</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                      {2 - skipCount} left
                    </span>
                  </Button>
                ) : (
                  <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/25 shrink-0">
                    <i className="fa-solid fa-lock text-xs" />
                    <span>Mandatory • 0 skips left</span>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowMonthlyPrompt(false);
                      setViewMode("calendar");
                    }}
                    className="h-9 px-3.5 text-xs font-semibold rounded-xl border-border hover:bg-muted/70 text-foreground cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all"
                  >
                    <i className="fa-solid fa-sliders text-xs mr-1 text-primary" />
                    Customize Dates
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleConfirmMonth}
                    disabled={confirmingMonth}
                    className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all"
                  >
                    {confirmingMonth ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-circle-check text-xs" />
                        <span>Confirm Availability</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Mobile Layout (< sm): Stacks with high-touch targets and zero clipping */}
              <div className="flex flex-col sm:hidden gap-2 w-full">
                <Button
                  type="button"
                  onClick={handleConfirmMonth}
                  disabled={confirmingMonth}
                  className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-xs whitespace-nowrap flex items-center justify-center gap-2 transition-all"
                >
                  {confirmingMonth ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check text-xs" />
                      <span>Confirm Availability</span>
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowMonthlyPrompt(false);
                      setViewMode("calendar");
                    }}
                    className="h-9 text-xs font-semibold rounded-xl border-border hover:bg-muted text-foreground cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <i className="fa-solid fa-sliders text-xs text-primary" />
                    <span>Customize</span>
                  </Button>

                  {skipCount < 2 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUpdateLater}
                      className="h-9 text-xs font-semibold rounded-xl border-border text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <i className="fa-solid fa-clock text-amber-500 text-xs" />
                      <span>Later ({2 - skipCount})</span>
                    </Button>
                  ) : (
                    <div className="h-9 text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1 px-1 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <i className="fa-solid fa-lock text-[10px]" />
                      <span>Mandatory</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

