"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Search, ArrowUpRight, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TeamShiftOverviewCard() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("All");

  useEffect(() => {
    async function fetchTeamShifts() {
      try {
        const res = await fetch("/api/team");
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch team shift times:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeamShifts();
  }, []);

  const filteredMembers = teamMembers.filter((m) => {
    const matchesSearch =
      m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const shiftName = m.shiftName || "Standard Day Shift";
    const matchesShift = shiftFilter === "All" || shiftName.toLowerCase().includes(shiftFilter.toLowerCase());

    return matchesSearch && matchesShift;
  });

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <i className="fa-solid fa-clock text-primary text-base" /> All Users Shift Time & Working Hours Schedule
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Real-time shift assignments, working hours, and shift status across all team members
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs gap-1 text-primary">
            <Link href="/dashboard/calendar">
              Shift Attendance Logs <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search user, username, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <span className="text-muted-foreground font-medium shrink-0">Shift Filter:</span>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground outline-none cursor-pointer"
            >
              <option value="All">All Shifts</option>
              <option value="Standard">Standard Day Shift</option>
              <option value="Morning">Morning Shift</option>
              <option value="Evening">Evening Shift</option>
              <option value="Night">Night Shift</option>
            </select>
          </div>
        </div>

        {/* Shift Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-3">Team Member</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Shift Name</th>
                <th className="py-2.5 px-3">Shift Timing</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Loading team shift schedules...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No team members found for the selected shift filter.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => {
                  const shiftTiming = m.shiftTime || "09:00 AM - 05:00 PM";
                  const shiftName = m.shiftName || "Standard Day Shift";
                  const isNightShift = shiftName.toLowerCase().includes("night") || shiftTiming.toLowerCase().includes("pm");

                  return (
                    <tr key={m._id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-primary/20">
                            {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              {m.username ? `@${m.username}` : m.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {m.department || "General"}
                        </Badge>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          <i className={`fa-solid ${isNightShift ? "fa-moon text-indigo-400" : "fa-sun text-amber-500"} text-xs`} />
                          {shiftName}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-foreground border border-border/40 inline-block">
                          {shiftTiming}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Shift
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
