"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

const EMPLOYMENT_TYPE_CONFIG: Record<string, { badge: string; icon: string }> = {
  "Permanent":  { badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: "fa-solid fa-star text-emerald-500" },
  "Freelancer": { badge: "bg-purple-500/10 text-purple-600 border-purple-500/20",   icon: "fa-solid fa-laptop-code text-purple-500" },
  "Part-Time":  { badge: "bg-sky-500/10 text-sky-600 border-sky-500/20",            icon: "fa-solid fa-clock text-sky-500" },
  "Contractor": { badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",         icon: "fa-solid fa-briefcase text-amber-500" },
  "Intern":     { badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",       icon: "fa-solid fa-user-graduate text-indigo-500" },
};

interface ShiftAndStatusTabProps {
  isAdmin: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function ShiftAndStatusTab({ isAdmin, showToast }: ShiftAndStatusTabProps) {
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Shift Form States
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [shiftName, setShiftName] = useState("");
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("05:00 PM");
  const [shiftDesc, setShiftDesc] = useState("");

  // New Employment Type State
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // User Shift Assignment Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [assignShiftName, setAssignShiftName] = useState("");
  const [assignShiftTime, setAssignShiftTime] = useState("");
  const [assignType, setAssignType] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, teamRes] = await Promise.all([
        fetch("/api/settings/shifts"),
        fetch("/api/team"),
      ]);

      if (shiftsRes.ok) {
        const sData = await shiftsRes.json();
        setShifts(sData.shifts || []);
        setEmploymentTypes(sData.employmentTypes || ["Permanent", "Freelancer", "Part-Time", "Contractor", "Intern"]);
      }

      if (teamRes.ok) {
        const tData = await teamRes.json();
        setTeamMembers(tData.users || []);
      }
    } catch (e) {
      console.error("fetchData error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveShifts = async (newShifts: ShiftConfig[], newTypes: string[]) => {
    try {
      setSaving(true);
      const res = await fetch("/api/settings/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shifts: newShifts, employmentTypes: newTypes }),
      });
      if (res.ok) {
        showToast("Shift & Employment Type settings updated!");
        setShifts(newShifts);
        setEmploymentTypes(newTypes);
      } else {
        showToast("Failed to update settings", "error");
      }
    } catch {
      showToast("Error updating settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftName.trim()) return;
    const newShift: ShiftConfig = {
      id: `shift_${Date.now()}`,
      name: shiftName.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      description: shiftDesc.trim(),
    };
    const updated = [...shifts, newShift];
    handleSaveShifts(updated, employmentTypes);
    setShowAddShiftModal(false);
    setShiftName("");
    setShiftDesc("");
  };

  const handleDeleteShift = (id: string) => {
    const updated = shifts.filter((s) => s.id !== id);
    handleSaveShifts(updated, employmentTypes);
  };

  const handleAddEmploymentType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const name = newTypeName.trim();
    if (employmentTypes.includes(name)) {
      showToast("Employment type already exists!", "error");
      return;
    }
    const updated = [...employmentTypes, name];
    handleSaveShifts(shifts, updated);
    setShowAddTypeModal(false);
    setNewTypeName("");
  };

  const handleDeleteEmploymentType = (name: string) => {
    const updated = employmentTypes.filter((t) => t !== name);
    handleSaveShifts(shifts, updated);
  };

  const handleAssignUserShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setAssigning(true);
      const res = await fetch("/api/settings/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateUserId: selectedUser._id,
          newShiftName: assignShiftName,
          newShiftTime: assignShiftTime,
          newEmploymentType: assignType,
        }),
      });

      if (res.ok) {
        showToast(`Updated shift & status for ${selectedUser.name}!`);
        setSelectedUser(null);
        await fetchData();
      } else {
        showToast("Failed to assign shift", "error");
      }
    } catch {
      showToast("Error updating employee shift", "error");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-primary" /> Workspace Shifts &amp; Employment Statuses
              </CardTitle>
              <CardDescription className="mt-1">
                Configure custom shift schedules (Day, Night, Weekend) and employee employment types (Permanent, Freelancer, Part-Time).
              </CardDescription>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddTypeModal(true)} className="gap-1.5 text-xs cursor-pointer">
                  <i className="fa-solid fa-plus text-xs" /> Add Status Type
                </Button>
                <Button color="primary" size="sm" onClick={() => setShowAddShiftModal(true)} className="gap-1.5 font-semibold text-xs cursor-pointer">
                  <i className="fa-solid fa-calendar-plus text-xs" /> Create Custom Shift
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: CUSTOM SHIFT SCHEDULES */}
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <i className="fa-solid fa-calendar-days text-amber-500" /> Defined Shift Schedules ({shifts.length})
              </CardTitle>
              <CardDescription className="text-xs">Active shift slots available for employee assignment.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {shifts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No custom shifts defined yet.</p>
            ) : (
              shifts.map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/10 transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-xs text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-business-time text-xs text-primary" /> {s.name}
                      <Badge variant="soft" color="primary" className="text-[10px] px-2 py-0.5">
                        {s.startTime} - {s.endTime}
                      </Badge>
                    </div>
                    {s.description && <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteShift(s.id)}
                      className="text-rose-500 hover:text-rose-600 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Shift"
                    >
                      <i className="fa-solid fa-trash-can text-xs" />
                    </button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: EMPLOYMENT TYPES / STATUSES */}
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <i className="fa-solid fa-id-badge text-emerald-500" /> Employment Types &amp; Statuses ({employmentTypes.length})
              </CardTitle>
              <CardDescription className="text-xs">Allowed employment status categories across staff roster.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {employmentTypes.map((type) => (
                <div key={type} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <i className="fa-solid fa-user-check text-xs" />
                  {type}
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEmploymentType(type)}
                      className="hover:text-rose-500 text-muted-foreground transition-colors ml-1 cursor-pointer"
                      title="Remove Status"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: EMPLOYEE SHIFT & STATUS ASSIGNMENT TABLE */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <i className="fa-solid fa-users text-indigo-500" /> Employee Shift &amp; Employment Roster ({teamMembers.length})
            </CardTitle>
            <CardDescription className="text-xs">Assign custom shifts and employment statuses to individual team members.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Role</th>
                <th className="p-3">Employment Type</th>
                <th className="p-3">Assigned Shift</th>
                <th className="p-3">Shift Hours</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {teamMembers.map((m) => {
                const empType = m.employmentType || "Permanent";
                const sName = m.shiftName || "Standard Day Shift";
                const sTime = m.shiftTime || "09:00 AM - 05:00 PM";

                return (
                  <tr key={m._id} className="hover:bg-accent/20 transition-colors">
                    <td className="p-3 font-bold text-foreground flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20">
                        {m.name?.[0] || "U"}
                      </div>
                      <div>
                        <div>{m.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{m.email}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="soft" color="primary" className="text-[10px]">{m.role || "Employee"}</Badge>
                    </td>
                    <td className="p-3">
                      {(() => {
                        const etc = EMPLOYMENT_TYPE_CONFIG[empType] || { badge: "bg-muted/40 text-muted-foreground border-border/40", icon: "fa-solid fa-user text-muted-foreground" };
                        return (
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", etc.badge)}>
                            <i className={cn("text-[8px]", etc.icon)} />
                            {empType}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 font-semibold text-foreground">{sName}</td>
                    <td className="p-3 text-muted-foreground font-mono text-[11px]">{sTime}</td>
                    <td className="p-3 text-right">
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(m);
                            setAssignShiftName(sName);
                            setAssignShiftTime(sTime);
                            setAssignType(empType);
                          }}
                          className="gap-1 text-[11px] cursor-pointer"
                        >
                          <i className="fa-solid fa-pen-to-square text-[10px]" /> Assign
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL 1: ADD CUSTOM SHIFT */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-calendar-plus text-primary" /> Create Custom Shift
              </h3>
              <button onClick={() => setShowAddShiftModal(false)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <form onSubmit={handleAddShift} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Shift Name</label>
                <Input
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  placeholder="e.g. Evening Operations Shift"
                  className="text-xs mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Start Time</label>
                  <Input
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="02:00 PM"
                    className="text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">End Time</label>
                  <Input
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="10:00 PM"
                    className="text-xs mt-1"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description (Optional)</label>
                <Input
                  value={shiftDesc}
                  onChange={(e) => setShiftDesc(e.target.value)}
                  placeholder="Brief operational shift overview..."
                  className="text-xs mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddShiftModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" className="text-xs font-semibold">
                  Create Shift
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EMPLOYMENT TYPE */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-plus text-primary" /> Add Employment Status
              </h3>
              <button onClick={() => setShowAddTypeModal(false)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <form onSubmit={handleAddEmploymentType} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Status Name</label>
                <Input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="e.g. Freelancer, Part-Time, Consultant"
                  className="text-xs mt-1"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddTypeModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" className="text-xs font-semibold">
                  Add Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN EMPLOYEE SHIFT & STATUS */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-pen text-primary" /> Assign Shift &amp; Status for {selectedUser.name}
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground">
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
            <form onSubmit={handleAssignUserShift} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Select Shift Schedule</label>
                <select
                  value={assignShiftName}
                  onChange={(e) => {
                    const selName = e.target.value;
                    setAssignShiftName(selName);
                    const matched = shifts.find((s) => s.name === selName);
                    if (matched) setAssignShiftTime(`${matched.startTime} - ${matched.endTime}`);
                  }}
                  className="w-full mt-1 p-2 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Shift Hours String</label>
                <Input
                  value={assignShiftTime}
                  onChange={(e) => setAssignShiftTime(e.target.value)}
                  placeholder="09:00 AM - 05:00 PM"
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Employment Status / Type</label>
                <select
                  value={assignType}
                  onChange={(e) => setAssignType(e.target.value)}
                  className="w-full mt-1 p-2 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  {employmentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedUser(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" disabled={assigning} className="text-xs font-semibold">
                  {assigning ? "Saving..." : "Save Assignment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
