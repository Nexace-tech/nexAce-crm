"use client";

import React, { useState, useEffect, useMemo, useId } from "react";
import { cn } from "@/lib/utils";

export interface DobPickerProps {
  id?: string;
  name?: string;
  value?: string; // YYYY-MM-DD format
  onChange?: (dateString: string) => void;
  required?: boolean;
  disabled?: boolean;
  minAge?: number; // default 18
  maxAge?: number; // default 100
  label?: string;
  helperText?: string;
  error?: string;
  className?: string;
  showDecadePills?: boolean;
  showAgeBadge?: boolean;
  size?: "sm" | "default";
}

const MONTHS = [
  { value: "01", name: "Jan", fullName: "January" },
  { value: "02", name: "Feb", fullName: "February" },
  { value: "03", name: "Mar", fullName: "March" },
  { value: "04", name: "Apr", fullName: "April" },
  { value: "05", name: "May", fullName: "May" },
  { value: "06", name: "Jun", fullName: "June" },
  { value: "07", name: "Jul", fullName: "July" },
  { value: "08", name: "Aug", fullName: "August" },
  { value: "09", name: "Sep", fullName: "September" },
  { value: "10", name: "Oct", fullName: "October" },
  { value: "11", name: "Nov", fullName: "November" },
  { value: "12", name: "Dec", fullName: "December" },
];

function getDaysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

export function DobPicker({
  id: explicitId,
  name,
  value = "",
  onChange,
  required = false,
  disabled = false,
  minAge = 18,
  maxAge = 100,
  label,
  helperText,
  error,
  className,
  showDecadePills = true,
  showAgeBadge = true,
  size = "default",
}: DobPickerProps) {
  const generatedId = useId();
  const inputId = explicitId || generatedId;

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const maxYear = useMemo(() => currentYear - minAge, [currentYear, minAge]);
  const minYear = useMemo(() => currentYear - maxAge, [currentYear, maxAge]);

  // Mode: "dropdowns" vs "native"
  const [useNative, setUseNative] = useState(false);

  // Parse incoming YYYY-MM-DD
  const parsed = useMemo(() => {
    if (!value) return { day: "", month: "", year: "" };
    const parts = value.split("-");
    if (parts.length === 3) {
      return {
        year: parts[0] || "",
        month: parts[1] || "",
        day: parts[2] || "",
      };
    }
    return { day: "", month: "", year: "" };
  }, [value]);

  const [selectedDay, setSelectedDay] = useState(parsed.day);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);
  const [selectedYear, setSelectedYear] = useState(parsed.year);

  // Keep internal state synchronized if external value changes
  useEffect(() => {
    setSelectedDay(parsed.day);
    setSelectedMonth(parsed.month);
    setSelectedYear(parsed.year);
  }, [parsed.day, parsed.month, parsed.year]);

  // Available days calculated based on selected year & month
  const maxDays = useMemo(() => {
    const y = selectedYear ? parseInt(selectedYear, 10) : 2000;
    const m = selectedMonth ? parseInt(selectedMonth, 10) : 1;
    return getDaysInMonth(y, m);
  }, [selectedYear, selectedMonth]);

  // Clamp day if month changes and previously selected day exceeds max days (e.g. Feb 30 -> Feb 28)
  useEffect(() => {
    if (selectedDay && parseInt(selectedDay, 10) > maxDays) {
      const clamped = String(maxDays).padStart(2, "0");
      setSelectedDay(clamped);
      if (selectedYear && selectedMonth && onChange) {
        onChange(`${selectedYear}-${selectedMonth}-${clamped}`);
      }
    }
  }, [maxDays, selectedDay, selectedMonth, selectedYear, onChange]);

  // Generate Year List (From maxYear down to minYear)
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxYear, minYear]);

  // Quick Decade Jump Pills
  const decadePills = useMemo(() => {
    const decades: { label: string; year: number }[] = [];
    const highestDecade = Math.floor(maxYear / 10) * 10;
    for (let d = highestDecade; d >= highestDecade - 40; d -= 10) {
      if (d <= maxYear && d >= minYear) {
        // Target middle of decade or maxYear
        const targetYear = Math.min(d + 4, maxYear);
        decades.push({ label: `${d}s`, year: targetYear });
      }
    }
    return decades;
  }, [maxYear, minYear]);

  // Real-time Age Calculation
  const calculatedAge = useMemo(() => {
    if (!selectedYear || !selectedMonth || !selectedDay) return null;
    const y = parseInt(selectedYear, 10);
    const m = parseInt(selectedMonth, 10);
    const d = parseInt(selectedDay, 10);

    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const birthDate = new Date(y, m - 1, d);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [selectedYear, selectedMonth, selectedDay]);

  const isUnderage = calculatedAge !== null && calculatedAge < minAge;
  const isComplete = Boolean(selectedYear && selectedMonth && selectedDay);

  const handleDayChange = (d: string) => {
    setSelectedDay(d);
    if (selectedYear && selectedMonth && d) {
      onChange?.(`${selectedYear}-${selectedMonth}-${d}`);
    } else if (!d && onChange) {
      onChange?.("");
    }
  };

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m);
    if (selectedYear && m && selectedDay) {
      onChange?.(`${selectedYear}-${m}-${selectedDay}`);
    } else if (!m && onChange) {
      onChange?.("");
    }
  };

  const handleYearChange = (y: string) => {
    setSelectedYear(y);
    if (y && selectedMonth && selectedDay) {
      onChange?.(`${y}-${selectedMonth}-${selectedDay}`);
    } else if (!y && onChange) {
      onChange?.("");
    }
  };

  const handleDecadeSelect = (decadeYear: number) => {
    const yrStr = String(decadeYear);
    setSelectedYear(yrStr);
    if (yrStr && selectedMonth && selectedDay) {
      onChange?.(`${yrStr}-${selectedMonth}-${selectedDay}`);
    }
  };

  const selectHeight = size === "sm" ? "h-8 text-xs px-2" : "h-9.5 text-sm px-2.5";

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      {/* Hidden input for standard Form and FormData submission */}
      {name && (
        <input
          type="hidden"
          id={inputId}
          name={name}
          value={value || ""}
          required={required}
        />
      )}

      {/* Header & Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {label ? (
          <label htmlFor={inputId} className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <i className="fa-solid fa-cake-candles text-primary text-xs" />
            {label}
            {required && <span className="text-destructive font-bold">*</span>}
          </label>
        ) : (
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <i className="fa-solid fa-cake-candles text-primary text-xs" />
            Date of Birth
            {required && <span className="text-destructive font-bold">*</span>}
          </span>
        )}

        <div className="flex items-center gap-2">
          {/* Live Calculated Age Badge */}
          {showAgeBadge && isComplete && calculatedAge !== null && (
            <div className="animate-in fade-in zoom-in-95 duration-150">
              {isUnderage ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                  <i className="fa-solid fa-triangle-exclamation text-[10px]" />
                  Must be {minAge}+ yrs ({calculatedAge} yrs)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <i className="fa-solid fa-cake-candles text-[10px]" />
                  {calculatedAge} years old
                </span>
              )}
            </div>
          )}

          {/* Switch View Toggle */}
          <button
            type="button"
            onClick={() => setUseNative(!useNative)}
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
            title={useNative ? "Switch to 3-part dropdowns" : "Switch to calendar input"}
          >
            <i className={cn("fa-solid", useNative ? "fa-list" : "fa-calendar-days", "text-xs")} />
            <span className="hidden sm:inline">{useNative ? "Dropdowns" : "Calendar"}</span>
          </button>
        </div>
      </div>

      {/* Main Input Display: 3-Part Dropdowns or Native Picker */}
      {useNative ? (
        <div className="relative">
          <input
            type="date"
            max={`${maxYear}-12-31`}
            min={`${minYear}-01-01`}
            value={value || ""}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={required}
            className={cn(
              "w-full bg-background border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer",
              selectHeight,
              error && "border-destructive focus:ring-destructive"
            )}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Day Dropdown */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                <span>Day</span>
              </label>
              <select
                aria-label="Day of Birth"
                value={selectedDay}
                onChange={(e) => handleDayChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  "w-full bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all",
                  selectHeight,
                  !selectedDay && "text-muted-foreground",
                  error && "border-destructive focus:ring-destructive"
                )}
              >
                <option value="">Day</option>
                {Array.from({ length: maxDays }, (_, i) => {
                  const dayNum = String(i + 1).padStart(2, "0");
                  return (
                    <option key={dayNum} value={dayNum}>
                      {dayNum}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Month Dropdown */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                <span>Month</span>
              </label>
              <select
                aria-label="Month of Birth"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  "w-full bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all",
                  selectHeight,
                  !selectedMonth && "text-muted-foreground",
                  error && "border-destructive focus:ring-destructive"
                )}
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.value} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Year Dropdown (Starts from 18+ eligible years) */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                <span>Year</span>
                <span className="text-[9px] text-muted-foreground/80 font-normal">≤ {maxYear}</span>
              </label>
              <select
                aria-label="Year of Birth"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  "w-full bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-all",
                  selectHeight,
                  !selectedYear && "text-muted-foreground",
                  error && "border-destructive focus:ring-destructive"
                )}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Decade Jump Pills */}
          {showDecadePills && !disabled && (
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <i className="fa-solid fa-bolt text-[9px] text-amber-500" /> Quick jump:
              </span>
              {decadePills.map((pill) => {
                const isActive = selectedYear && Math.floor(parseInt(selectedYear, 10) / 10) * 10 === Math.floor(pill.year / 10) * 10;
                return (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => handleDecadeSelect(pill.year)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer border",
                      isActive
                        ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Helper text or Error message */}
      {error ? (
        <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
          <i className="fa-solid fa-circle-exclamation text-[10px]" />
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
