"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Target, TrendingUp, Award, CheckCircle2, Plus, Sparkles, Heart, Trash2, X, AlertCircle, Check 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

interface KeyResult {
  _id?: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

interface OKRData {
  _id: string;
  title: string;
  description?: string;
  level: "Company" | "Department" | "Team" | "Individual";
  ownerName: string;
  deadline: string;
  status: "On Track" | "At Risk" | "Behind" | "Completed";
  keyResults: KeyResult[];
}

interface KudosData {
  _id: string;
  fromUserName: string;
  toUserName: string;
  message: string;
  companyValue: string;
  createdAt: string;
}

import { useTabPersistence } from "@/hooks/useTabPersistence";

export default function GoalsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useTabPersistence<"okrs" | "kudos">(
    "goals_active_tab",
    "okrs",
    ["okrs", "kudos"]
  );
  const [okrs, setOkrs] = useState<OKRData[]>([]);
  const [kudosList, setKudosList] = useState<KudosData[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // New OKR state
  const [showOkrModal, setShowOkrModal] = useState(false);
  const [okrTitle, setOkrTitle] = useState("");
  const [okrDesc, setOkrDesc] = useState("");
  const [okrLevel, setOkrLevel] = useState<"Company" | "Department" | "Team" | "Individual">("Team");
  const [okrDeadline, setOkrDeadline] = useState("");
  const [krInputs, setKrInputs] = useState<KeyResult[]>([
    { title: "Key Result 1", targetValue: 100, currentValue: 0, unit: "%" }
  ]);

  // Kudos modal state
  const [showKudosModal, setShowKudosModal] = useState(false);
  const [kudosToUser, setKudosToUser] = useState("");
  const [kudosMsg, setKudosMsg] = useState("");
  const [kudosValue, setKudosValue] = useState("Innovation");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOkrs = async () => {
    try {
      const res = await fetch("/api/okrs");
      if (res.ok) {
        const data = await res.json();
        setOkrs(data.okrs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchKudos = async () => {
    try {
      const res = await fetch("/api/kudos");
      if (res.ok) {
        const data = await res.json();
        setKudosList(data.kudos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOkrs(), fetchKudos(), fetchTeam()]);
      setLoading(false);
    };
    init();
  }, []);

  const handleCreateOKR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/okrs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: okrTitle,
          description: okrDesc,
          level: okrLevel,
          deadline: okrDeadline,
          keyResults: krInputs
        })
      });
      if (res.ok) {
        showToast("OKR Created Successfully!");
        setShowOkrModal(false);
        setOkrTitle("");
        setOkrDesc("");
        await fetchOkrs();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create OKR", "error");
      }
    } catch (err) {
      showToast("Error creating OKR", "error");
    }
  };

  const handleUpdateKRProgress = async (okr: OKRData, krIndex: number, newValue: number) => {
    const updatedKRs = [...okr.keyResults];
    updatedKRs[krIndex].currentValue = newValue;

    // Check overall progress to auto update status if 100%
    const totalProgress = updatedKRs.reduce((acc, kr) => acc + Math.min(100, (kr.currentValue / (kr.targetValue || 1)) * 100), 0) / (updatedKRs.length || 1);
    let newStatus = okr.status;
    if (totalProgress >= 100) newStatus = "Completed";

    try {
      const res = await fetch("/api/okrs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          okrId: okr._id,
          keyResults: updatedKRs,
          status: newStatus
        })
      });
      if (res.ok) {
        await fetchOkrs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGiveKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipient = teamMembers.find(t => t._id === kudosToUser);
    if (!recipient) return;

    try {
      const res = await fetch("/api/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: recipient._id,
          toUserName: recipient.name,
          message: kudosMsg,
          companyValue: kudosValue
        })
      });
      if (res.ok) {
        showToast("Kudos sent!");
        setShowKudosModal(false);
        setKudosMsg("");
        await fetchKudos();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to give Kudos", "error");
      }
    } catch (err) {
      showToast("Error giving kudos", "error");
    }
  };

  if (loading) {
    return <Preloader label="Loading Goals & OKRs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
          toast.type === "success" ? "bg-emerald-500/90 text-white border-emerald-600" : "bg-destructive/90 text-white border-destructive"
        )}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Goals & Strategic OKRs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Align Objectives and Key Results (OKRs) across company, department, and team levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowKudosModal(true)} className="gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" /> Give Kudos
          </Button>
          <Button color="primary" size="sm" onClick={() => setShowOkrModal(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create OKR
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1">
        <button
          onClick={() => setActiveTab("okrs")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "okrs" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Target className="w-4 h-4" /> Objectives & Key Results ({okrs.length})
        </button>
        <button
          onClick={() => setActiveTab("kudos")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "kudos" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> Kudos Wall ({kudosList.length})
        </button>
      </div>

      {/* OKR List View */}
      {activeTab === "okrs" && (
        <div className="space-y-5">
          {okrs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-50 text-primary" />
              <p className="font-medium">No OKRs defined yet</p>
              <p className="text-xs mt-1">Click "Create OKR" to set your company's strategic targets.</p>
            </Card>
          ) : (
            okrs.map((okr) => {
              const totalProgress = Math.round(
                okr.keyResults.reduce(
                  (acc, kr) => acc + Math.min(100, ((kr.currentValue || 0) / (kr.targetValue || 1)) * 100),
                  0
                ) / (okr.keyResults.length || 1)
              );

              return (
                <Card key={okr._id} className="hover:shadow-md transition-all border-l-4 border-l-primary">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge color="primary" variant="soft">{okr.level} Level</Badge>
                        <Badge
                          color={okr.status === "Completed" ? "success" : okr.status === "On Track" ? "info" : okr.status === "At Risk" ? "warning" : "destructive"}
                        >
                          {okr.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-foreground mt-2">
                        {okr.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Owner: {okr.ownerName} | Deadline: {new Date(okr.deadline).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <span className="text-2xl font-extrabold text-primary">{totalProgress}%</span>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${totalProgress}%` }}
                      />
                    </div>

                    <div className="space-y-3 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-foreground">Key Results ({okr.keyResults.length})</p>
                      {okr.keyResults.map((kr, idx) => {
                        const krProgress = Math.min(100, Math.round(((kr.currentValue || 0) / (kr.targetValue || 1)) * 100));
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-accent/30 rounded-lg border border-border">
                            <div className="space-y-0.5 flex-1">
                              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                                <span>{kr.title}</span>
                                <span className="text-muted-foreground font-semibold">{kr.currentValue} / {kr.targetValue} {kr.unit} ({krProgress}%)</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${krProgress}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <Input
                                type="number"
                                defaultValue={kr.currentValue}
                                onBlur={(e) => handleUpdateKRProgress(okr, idx, Number(e.target.value))}
                                className="w-16 h-7 text-xs px-2 text-center"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Kudos Wall */}
      {activeTab === "kudos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kudosList.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50 text-amber-500" />
              <p className="font-medium">No Kudos shared yet!</p>
              <p className="text-xs mt-1">Be the first to appreciate a team member by clicking "Give Kudos".</p>
            </Card>
          ) : (
            kudosList.map((kudos) => (
              <Card key={kudos._id} className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <span className="text-primary">{kudos.fromUserName}</span>
                      <span className="text-muted-foreground">recognized</span>
                      <span className="text-emerald-500 font-bold">{kudos.toUserName}</span>
                    </div>
                    <Badge color="warning" variant="soft" className="text-[10px]">
                      {kudos.companyValue}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground italic bg-accent/40 p-3 rounded-lg border border-border">
                    "{kudos.message}"
                  </p>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {new Date(kudos.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create OKR Modal */}
      {showOkrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowOkrModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Create Strategic OKR</h3>
              <button onClick={() => setShowOkrModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateOKR} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Objective Title *</label>
                <Input value={okrTitle} onChange={(e) => setOkrTitle(e.target.value)} placeholder="e.g. Increase Customer Retention by 20%" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Goal Level</label>
                  <select value={okrLevel} onChange={(e) => setOkrLevel(e.target.value as any)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="Company">Company</option>
                    <option value="Department">Department</option>
                    <option value="Team">Team</option>
                    <option value="Individual">Individual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Target Deadline *</label>
                  <Input type="date" value={okrDeadline} onChange={(e) => setOkrDeadline(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Key Results (KR)</label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setKrInputs([...krInputs, { title: "", targetValue: 100, currentValue: 0, unit: "%" }])}>
                    + Add KR
                  </Button>
                </div>

                {krInputs.map((kr, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder={`KR ${idx + 1} Title`}
                      value={kr.title}
                      onChange={(e) => {
                        const next = [...krInputs];
                        next[idx].title = e.target.value;
                        setKrInputs(next);
                      }}
                      className="flex-1 text-xs"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Target"
                      value={kr.targetValue}
                      onChange={(e) => {
                        const next = [...krInputs];
                        next[idx].targetValue = Number(e.target.value);
                        setKrInputs(next);
                      }}
                      className="w-20 text-xs"
                      required
                    />
                    <Input
                      placeholder="Unit"
                      value={kr.unit}
                      onChange={(e) => {
                        const next = [...krInputs];
                        next[idx].unit = e.target.value;
                        setKrInputs(next);
                      }}
                      className="w-14 text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowOkrModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Save OKR</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Give Kudos Modal */}
      {showKudosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowKudosModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" /> Recognize a Colleague</h3>
              <button onClick={() => setShowKudosModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGiveKudos} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select Teammate *</label>
                <select value={kudosToUser} onChange={(e) => setKudosToUser(e.target.value)} required className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Choose colleague...</option>
                  {teamMembers.map(m => (
                    <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Tag Company Value</label>
                <select value={kudosValue} onChange={(e) => setKudosValue(e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  {["Innovation", "Teamwork", "Excellence", "Customer Focus", "Integrity", "Speed"].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Shoutout Message *</label>
                <textarea
                  value={kudosMsg}
                  onChange={(e) => setKudosMsg(e.target.value)}
                  rows={3}
                  placeholder="Thank them for their help or awesome work..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowKudosModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Post Kudos</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
