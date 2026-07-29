"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar, ClipboardCheck, FileText, UserCheck, HelpCircle, Award,
  Plus, X, CheckCircle, AlertCircle, MessageSquare, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

interface LeaveData {
  _id: string; userId: string; userName: string;
  type: string; startDate: string; endDate: string;
  reason: string; status: string; approverName?: string; createdAt: string;
}

interface CaseData {
  _id: string; userId: string; userName: string;
  category: string; subject: string; description: string;
  status: string; priority: string; comments: any[]; createdAt: string;
}

import { useTabPersistence } from "@/hooks/useTabPersistence";

export default function HRPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useTabPersistence<"leaves" | "cases">(
    "hr_active_tab",
    "leaves",
    ["leaves", "cases"]
  );
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [cases, setCases] = useState<CaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Leave form
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Case form
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseCategory, setCaseCategory] = useState("Other");
  const [caseSubject, setCaseSubject] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [casePriority, setCasePriority] = useState("Medium");

  // Comment
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [commentText, setCommentText] = useState("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isManagerOrAdmin = user?.role === "Admin" || user?.role === "Manager";

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/hr/leaves");
      if (res.ok) { const d = await res.json(); setLeaves(d.leaves || []); }
    } catch (e) { console.error(e); }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/hr/cases");
      if (res.ok) { const d = await res.json(); setCases(d.cases || []); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchLeaves(), fetchCases()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: leaveType, startDate: leaveStart, endDate: leaveEnd, reason: leaveReason }),
      });
      if (res.ok) {
        showToast("Leave request submitted!");
        setShowLeaveForm(false);
        setLeaveReason(""); setLeaveStart(""); setLeaveEnd("");
        await fetchLeaves();
      } else { const d = await res.json(); showToast(d.error, "error"); }
    } catch { showToast("Failed to submit leave", "error"); }
  };

  const handleApproveReject = async (leaveId: string, status: string) => {
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, status }),
      });
      if (res.ok) { showToast(`Leave ${status.toLowerCase()}`); await fetchLeaves(); }
    } catch { showToast("Action failed", "error"); }
  };

  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hr/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: caseCategory, subject: caseSubject, description: caseDesc, priority: casePriority }),
      });
      if (res.ok) {
        showToast("HR case created!");
        setShowCaseForm(false);
        setCaseSubject(""); setCaseDesc("");
        await fetchCases();
      } else { const d = await res.json(); showToast(d.error, "error"); }
    } catch { showToast("Failed to create case", "error"); }
  };

  const handleAddComment = async (caseId: string) => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch("/api/hr/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, comment: commentText }),
      });
      if (res.ok) {
        setCommentText("");
        await fetchCases();
        const d = await res.json();
        setSelectedCase(d.case);
        showToast("Comment added!");
      }
    } catch { showToast("Failed to add comment", "error"); }
  };

  const handleUpdateCaseStatus = async (caseId: string, status: string) => {
    try {
      await fetch("/api/hr/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, status }),
      });
      showToast(`Case marked as ${status}`);
      await fetchCases();
      setSelectedCase(null);
    } catch { showToast("Failed to update", "error"); }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading HR Portal & Policy Records..." />;
  }

  const pendingLeaves = leaves.filter((l) => l.status === "Pending").length;
  const openCases = cases.filter((c) => c.status === "Open" || c.status === "In Progress").length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
          toast.type === "success" ? "bg-emerald-500/90 text-white border-emerald-600" : "bg-destructive/90 text-white border-destructive"
        )}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">HR Portal & Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Leave management, helpdesk cases, employee self-service.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setActiveTab("leaves"); setShowLeaveForm(true); }} className="gap-2">
            <Calendar className="w-4 h-4" /> Request Leave
          </Button>
          <Button color="primary" size="sm" onClick={() => { setActiveTab("cases"); setShowCaseForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Submit Case
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leave Requests</p>
              <p className="text-2xl font-bold text-foreground">{pendingLeaves} Pending</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl"><Calendar className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open HR Cases</p>
              <p className="text-2xl font-bold text-foreground">{openCases} Active</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><HelpCircle className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Leaves</p>
              <p className="text-2xl font-bold text-foreground">{leaves.length}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><ClipboardCheck className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold text-foreground">{cases.length}</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl"><FileText className="w-6 h-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1">
        <button onClick={() => setActiveTab("leaves")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
          activeTab === "leaves" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Calendar className="w-4 h-4" /> Leave Requests
        </button>
        <button onClick={() => setActiveTab("cases")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
          activeTab === "cases" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <HelpCircle className="w-4 h-4" /> Help Desk Cases
        </button>
      </div>

      {/* Leave Requests Tab */}
      {activeTab === "leaves" && (
        <div className="space-y-4">
          {leaves.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No leave requests yet</p>
              <p className="text-xs mt-1">Click "Request Leave" to submit your first request.</p>
            </Card>
          ) : (
            leaves.map((l) => (
              <Card key={l._id} className="hover:shadow-md transition-all">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{l.userName}</p>
                      <Badge color="primary" variant="soft">{l.type}</Badge>
                      <Badge
                        color={l.status === "Approved" ? "success" : l.status === "Rejected" ? "destructive" : "warning"}
                        variant="soft"
                      >
                        {l.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.reason}</p>
                    {l.approverName && <p className="text-xs text-muted-foreground">Reviewed by: {l.approverName}</p>}
                  </div>

                  {isManagerOrAdmin && l.status === "Pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" color="primary" onClick={() => handleApproveReject(l._id, "Approved")} className="gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleApproveReject(l._id, "Rejected")} className="gap-1 text-destructive">
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Cases Tab */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          {cases.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No HR cases yet</p>
              <p className="text-xs mt-1">Click "Submit Case" to create your first support ticket.</p>
            </Card>
          ) : (
            cases.map((c) => (
              <Card
                key={c._id}
                className="hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedCase(c)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{c.subject}</p>
                        <Badge color="primary" variant="soft">{c.category}</Badge>
                        <Badge
                          color={c.status === "Open" ? "warning" : c.status === "In Progress" ? "info" : c.status === "Resolved" ? "success" : "default"}
                          variant="soft"
                        >
                          {c.status}
                        </Badge>
                        <Badge variant="outline">{c.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">By {c.userName} • {new Date(c.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-semibold">{c.comments?.length || 0}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Leave Form Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowLeaveForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Request Leave</h3>
              <button onClick={() => setShowLeaveForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitLeave} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Leave Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  {["Casual", "Sick", "Earned", "Unpaid", "Maternity", "Paternity"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Start Date</label>
                  <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">End Date</label>
                  <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Reason</label>
                <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={3} required placeholder="Describe your reason..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowLeaveForm(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Form Modal */}
      {showCaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowCaseForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> Submit HR Case</h3>
              <button onClick={() => setShowCaseForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitCase} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select value={caseCategory} onChange={(e) => setCaseCategory(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {["Payroll", "IT Access", "Policy Query", "Benefits", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select value={casePriority} onChange={(e) => setCasePriority(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {["Low", "Medium", "High"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Subject</label>
                <Input value={caseSubject} onChange={(e) => setCaseSubject(e.target.value)} required placeholder="Brief subject line" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea value={caseDesc} onChange={(e) => setCaseDesc(e.target.value)} rows={3} required placeholder="Describe your issue in detail..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCaseForm(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Create Case</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedCase(null)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedCase.subject}</h3>
                <p className="text-xs text-muted-foreground">{selectedCase.category} • {selectedCase.userName}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2">
              <Badge color={selectedCase.status === "Open" ? "warning" : selectedCase.status === "In Progress" ? "info" : "success"} variant="soft">{selectedCase.status}</Badge>
              <Badge variant="outline">{selectedCase.priority}</Badge>
            </div>

            <p className="text-sm text-foreground">{selectedCase.description}</p>

            {/* Status actions for managers */}
            {isManagerOrAdmin && selectedCase.status !== "Closed" && (
              <div className="flex gap-2 border-t border-border pt-3">
                {selectedCase.status === "Open" && (
                  <Button size="sm" variant="outline" onClick={() => handleUpdateCaseStatus(selectedCase._id, "In Progress")}>Mark In Progress</Button>
                )}
                {(selectedCase.status === "Open" || selectedCase.status === "In Progress") && (
                  <Button size="sm" color="primary" onClick={() => handleUpdateCaseStatus(selectedCase._id, "Resolved")}>Resolve</Button>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-semibold text-foreground">Comments ({selectedCase.comments?.length || 0})</p>
              {selectedCase.comments?.map((c: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{c.userName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-foreground">{c.content}</p>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(selectedCase._id); } }}
                />
                <Button size="sm" color="primary" onClick={() => handleAddComment(selectedCase._id)} disabled={!commentText.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
