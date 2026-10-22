"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface HolidayItem {
  _id: string;
  title: string;
  description?: string;
  date: string;
  year: number;
  month: number;
  dayOfWeek?: string;
  type: "Mandatory" | "Restricted" | "Company";
  category?: "National" | "Religious" | "Cultural" | "Corporate";
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

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function UpcomingHolidaysWidget({ className = "" }: { className?: string }) {
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [stats, setStats] = useState<HolidayStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchUpcoming() {
      try {
        const res = await fetch("/api/holidays?upcoming=true&limit=4");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setHolidays(data.holidays || []);
            setStats(data.stats || null);
          }
        }
      } catch (err) {
        console.error("Failed to load upcoming holidays widget data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchUpcoming();
    return () => {
      isMounted = false;
    };
  }, []);

  const getCountdownText = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: "Today", isUrgent: true };
    if (diffDays === 1) return { label: "Tomorrow", isUrgent: true };
    return { label: `In ${diffDays} days`, isUrgent: false };
  };

  const isLongWeekend = (dateStr: string, dayOfWeek?: string) => {
    if (dayOfWeek === "Friday" || dayOfWeek === "Monday") return true;
    const d = new Date(dateStr);
    const day = d.getUTCDay();
    return day === 1 || day === 5;
  };

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between ${className}`}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm">
            <i className="fa-solid fa-umbrella-beach" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-foreground">Upcoming Holidays</h3>
              {stats?.remainingThisYear !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {stats.remainingThisYear} remaining
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Official company &amp; national calendar observances
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/calendar?tab=holidays"
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-secondary cursor-pointer"
        >
          <span>View All</span>
          <i className="fa-solid fa-arrow-right text-[10px]" />
        </Link>
      </div>

      {/* Widget Content */}
      <div className="pt-3 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50 border border-border/40"
              >
                <div className="w-12 h-12 rounded-lg bg-secondary" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-secondary rounded w-3/5" />
                  <div className="h-2.5 bg-secondary rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl bg-secondary/30 border border-dashed border-border/80">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2 text-muted-foreground">
              <i className="fa-solid fa-calendar-check text-base" />
            </div>
            <p className="text-xs font-semibold text-foreground">No Upcoming Holidays Scheduled</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Check the calendar for the complete year schedule.
            </p>
            <Link
              href="/dashboard/calendar?tab=holidays"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-500 hover:underline"
            >
              <span>Explore Company Holidays</span>
              <i className="fa-solid fa-chevron-right text-[10px]" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {holidays.map((holiday) => {
              const hDate = new Date(holiday.date);
              const monthStr = MONTH_NAMES[hDate.getUTCMonth()];
              const dayNum = hDate.getUTCDate();
              const countdown = getCountdownText(holiday.date);
              const longWeekend = isLongWeekend(holiday.date, holiday.dayOfWeek);

              return (
                <div
                  key={holiday._id}
                  className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/60 hover:border-emerald-500/30 transition-all"
                >
                  {/* Left Date Box */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-12 sm:w-12 sm:h-12 rounded-xl bg-card border border-border flex flex-col items-center justify-center shrink-0 shadow-2xs group-hover:border-emerald-500/40 transition">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-500">
                        {monthStr}
                      </span>
                      <span className="text-base sm:text-lg font-black text-foreground leading-none">
                        {dayNum}
                      </span>
                    </div>

                    {/* Middle Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[150px] sm:max-w-[240px]">
                          {holiday.title}
                        </h4>
                        {holiday.isHalfDay && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            Half Day
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>{holiday.dayOfWeek || "Day"}</span>
                        <span>·</span>
                        <span className="truncate">{holiday.category || "Observance"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Tags */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        countdown.isUrgent
                          ? "bg-emerald-500 text-white shadow-2xs"
                          : "bg-secondary text-foreground/80 border border-border/80"
                      }`}
                    >
                      {countdown.label}
                    </span>

                    {longWeekend && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                        <i className="fa-solid fa-umbrella-beach text-[8px]" />
                        <span>Long Weekend</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
