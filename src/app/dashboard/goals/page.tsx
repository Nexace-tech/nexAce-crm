"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";

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

interface SurveyData {
  _id: string;
  question: string;
  category: string;
  active: boolean;
  totalResponses: number;
  avgRating: number;
  userHasResponded: boolean;
  userRating?: number;
  userFeedback?: string;
  createdAt: string;
}

interface ActionItem {
  _id?: string;
  text: string;
  completed: boolean;
  carriedOver: boolean;
}

interface MeetingData {
  _id: string;
  managerId: string;
  managerName: string;
  employeeId: string;
  employeeName: string;
  scheduledDate: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  agenda?: string;
  notes?: string;
  actionItems: ActionItem[];
  createdAt: string;
}

export default function GoalsPage() {
  const { user } = useAuth();
  const { can, isAdmin, isOPS } = usePermissions();
  const [activeTab, setActiveTab] = useTabPersistence<"okrs" | "kudos" | "surveys" | "one_on_ones">(
    "goals_active_tab",
    "okrs",
    ["okrs", "kudos", "surveys", "one_on_ones"]
  );

  const [okrs, setOkrs] = useState<OKRData[]>([]);
  const [kudosList, setKudosList] = useState<KudosData[]>([]);
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
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

  // Pulse Survey state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [newSurveyQuestion, setNewSurveyQuestion] = useState("");
  const [newSurveyCategory, setNewSurveyCategory] = useState("Morale");
  const [surveyRatings, setSurveyRatings] = useState<Record<string, number>>({});
  const [surveyFeedbacks, setSurveyFeedbacks] = useState<Record<string, string>>({});

  // 1:1 Meeting state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedColleague, setSelectedColleague] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("1. Review sprint goals and roadblocks\n2. Action item updates & feedback");
  const [editingMeetingNotes, setEditingMeetingNotes] = useState<Record<string, string>>({});
  const [newActionItemTexts, setNewActionItemTexts] = useState<Record<string, string>>({});

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
    } catch (e) { console.error(e); }
  };

  const fetchKudos = async () => {
    try {
      const res = await fetch("/api/kudos");
      if (res.ok) {
        const data = await res.json();
        setKudosList(data.kudos || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchSurveys = async () => {
    try {
      const res = await fetch("/api/surveys");
      if (res.ok) {
        const data = await res.json();
        setSurveys(data.surveys || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMeetings = async () => {
    try {
      const res = await fetch("/api/one-on-ones");
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.users || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchOkrs(), fetchKudos(), fetchSurveys(), fetchMeetings(), fetchTeam()]);
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
    } catch {
      showToast("Error creating OKR", "error");
    }
  };

  const handleUpdateKRProgress = async (okr: OKRData, krIndex: number, newValue: number) => {
    const updatedKRs = [...okr.keyResults];
    updatedKRs[krIndex].currentValue = newValue;

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
    } catch {
      showToast("Error giving kudos", "error");
    }
  };

  const handleSubmitSurveyResponse = async (surveyId: string) => {
    const rating = surveyRatings[surveyId];
    if (!rating) {
      showToast("Please select a 1-5 rating score", "error");
      return;
    }

    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId,
          rating,
          feedback: surveyFeedbacks[surveyId] || ""
        })
      });
      if (res.ok) {
        showToast("Response recorded! Thank you.");
        await fetchSurveys();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to submit survey", "error");
      }
    } catch {
      showToast("Error submitting survey", "error");
    }
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_survey",
          question: newSurveyQuestion,
          category: newSurveyCategory
        })
      });
      if (res.ok) {
        showToast("Pulse survey launched!");
        setShowSurveyModal(false);
        setNewSurveyQuestion("");
        await fetchSurveys();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to create survey", "error");
      }
    } catch {
      showToast("Error creating survey", "error");
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/one-on-ones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedColleague,
          scheduledDate: meetingDate,
          agenda: meetingAgenda
        })
      });
      if (res.ok) {
        showToast("1:1 Meeting scheduled!");
        setShowMeetingModal(false);
        await fetchMeetings();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to schedule meeting", "error");
      }
    } catch {
      showToast("Error scheduling meeting", "error");
    }
  };

  const handleToggleActionItem = async (meeting: MeetingData, actionIdx: number) => {
    const updatedItems = [...meeting.actionItems];
    updatedItems[actionIdx].completed = !updatedItems[actionIdx].completed;

    try {
      const res = await fetch("/api/one-on-ones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: meeting._id,
          actionItems: updatedItems
        })
      });
      if (res.ok) {
        await fetchMeetings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddActionItem = async (meeting: MeetingData) => {
    const text = newActionItemTexts[meeting._id]?.trim();
    if (!text) return;

    const updatedItems = [...meeting.actionItems, { text, completed: false, carriedOver: false }];

    try {
      const res = await fetch("/api/one-on-ones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: meeting._id,
          actionItems: updatedItems
        })
      });
      if (res.ok) {
        setNewActionItemTexts({ ...newActionItemTexts, [meeting._id]: "" });
        await fetchMeetings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async (meetingId: string) => {
    const notes = editingMeetingNotes[meetingId];
    try {
      const res = await fetch("/api/one-on-ones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          notes
        })
      });
      if (res.ok) {
        showToast("Meeting notes saved!");
        await fetchMeetings();
      }
    } catch (err) {
      console.error(err);
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
          {toast.type === "success" ? <i className="fa-solid fa-circle-check text-base" /> : <i className="fa-solid fa-circle-exclamation text-base" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-bullseye text-primary text-xl" /> Goals & Strategic OKRs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Align Objectives and Key Results (OKRs), track team sentiment via pulse surveys, and log 1:1 meeting agendas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(isAdmin || isOPS || can("sendKudos")) && (
            <Button variant="outline" size="sm" onClick={() => setShowKudosModal(true)} className="gap-2">
              <i className="fa-solid fa-heart text-rose-500 text-xs" /> Give Kudos
            </Button>
          )}
          {(isAdmin || isOPS || can("createGoals")) && (
            <Button color="primary" size="sm" onClick={() => setShowOkrModal(true)} className="gap-2">
              <i className="fa-solid fa-plus text-xs" /> Create OKR
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("okrs")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "okrs" ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-bullseye text-xs" /> OKRs ({okrs.length})
        </button>

        <button
          onClick={() => setActiveTab("surveys")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "surveys" ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-chart-simple text-xs text-sky-500" /> Pulse Surveys ({surveys.length})
        </button>

        <button
          onClick={() => setActiveTab("one_on_ones")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "one_on_ones" ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-user-check text-xs text-emerald-500" /> 1:1 Meetings ({meetings.length})
        </button>

        <button
          onClick={() => setActiveTab("kudos")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "kudos" ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-xs text-amber-500" /> Kudos Wall ({kudosList.length})
        </button>
      </div>

      {/* TAB 1: OKR LIST VIEW */}
      {activeTab === "okrs" && (
        <div className="space-y-5">
          {okrs.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <i className="fa-solid fa-bullseye text-3xl mx-auto mb-3 opacity-50 text-primary block" />
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
                                disabled={!isAdmin && !isOPS && !can("editGoals")}
                                onBlur={(e) => handleUpdateKRProgress(okr, idx, Number(e.target.value))}
                                className="w-16 h-7 text-xs px-2 text-center disabled:opacity-60"
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

      {/* TAB 2: PULSE SURVEYS */}
      {activeTab === "surveys" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Anonymous weekly check-in poll for team morale, workload, and management support.
            </p>
            {(isAdmin || isOPS || can("manageSurveys")) && (
              <Button color="primary" size="sm" onClick={() => setShowSurveyModal(true)} className="gap-1.5">
                <i className="fa-solid fa-plus text-xs" /> Launch Survey
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {surveys.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <i className="fa-solid fa-chart-simple text-3xl mx-auto mb-3 opacity-50 text-sky-500 block" />
                <p className="font-medium">No active pulse surveys</p>
              </Card>
            ) : (
              surveys.map((sv) => (
                <Card key={sv._id} className="border-l-4 border-l-sky-500">
                  <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge color="info">{sv.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {sv.totalResponses} total response{sv.totalResponses !== 1 && "s"}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground mt-1">
                        {sv.question}
                      </CardTitle>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Team Score</p>
                        <p className="text-2xl font-extrabold text-sky-500">{sv.avgRating} / 5</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    {/* Sentiment Score Indicator */}
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-300"
                        style={{ width: `${(sv.avgRating / 5) * 100}%` }}
                      />
                    </div>

                    {/* Employee Response Widget */}
                    <div className="p-4 bg-accent/40 rounded-xl border border-border space-y-3">
                      <p className="text-xs font-semibold text-foreground flex items-center justify-between">
                        <span>{sv.userHasResponded ? "Your Response Recorded" : "Submit Anonymous Rating"}</span>
                        {sv.userHasResponded && (
                          <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-xs" /> Score: {sv.userRating}/5
                          </span>
                        )}
                      </p>

                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((score) => {
                          const currentScore = surveyRatings[sv._id] ?? sv.userRating ?? 0;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setSurveyRatings({ ...surveyRatings, [sv._id]: score })}
                              className={cn(
                                "w-10 h-10 rounded-lg text-sm font-bold border transition-all cursor-pointer flex flex-col items-center justify-center",
                                currentScore === score
                                  ? "bg-sky-500 text-white border-sky-600 shadow-md scale-105"
                                  : "bg-background text-foreground border-border hover:border-sky-400"
                              )}
                            >
                              <span>{score}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Optional anonymous comment or feedback..."
                          defaultValue={sv.userFeedback || ""}
                          onChange={(e) => setSurveyFeedbacks({ ...surveyFeedbacks, [sv._id]: e.target.value })}
                          className="text-xs flex-1"
                        />
                        <Button
                          color="primary"
                          size="sm"
                          onClick={() => handleSubmitSurveyResponse(sv._id)}
                          className="gap-1 font-semibold"
                        >
                          <i className="fa-solid fa-paper-plane text-xs" /> Submit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: 1:1 MEETINGS TRACKER */}
      {activeTab === "one_on_ones" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Recurring manager-employee logs with structured agendas, notes, and carried-over action items.
            </p>
            <Button color="primary" size="sm" onClick={() => setShowMeetingModal(true)} className="gap-1.5">
              <i className="fa-solid fa-plus text-xs" /> Schedule 1:1 Meeting
            </Button>
          </div>

          <div className="space-y-4">
            {meetings.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <i className="fa-solid fa-user-check text-3xl mx-auto mb-3 opacity-50 text-emerald-500 block" />
                <p className="font-medium">No 1:1 meetings logged yet</p>
                <p className="text-xs mt-1">Schedule a meeting to align on career goals, feedback, and action items.</p>
              </Card>
            ) : (
              meetings.map((mtg) => (
                <Card key={mtg._id} className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
                  <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge color="success">{mtg.status}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <i className="fa-solid fa-calendar-days text-xs" /> {new Date(mtg.scheduledDate).toLocaleDateString()} at {new Date(mtg.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-foreground mt-1 flex items-center gap-2">
                        <span>1:1 Session: {mtg.managerName} & {mtg.employeeName}</span>
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Agenda & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-message text-primary text-xs" /> Meeting Agenda
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                          {mtg.agenda || "No agenda set."}
                        </p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
                        <p className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Key Notes & Feedback</span>
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(mtg._id)}
                            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Save Notes
                          </button>
                        </p>
                        <textarea
                          rows={3}
                          defaultValue={mtg.notes || ""}
                          onChange={(e) => setEditingMeetingNotes({ ...editingMeetingNotes, [mtg._id]: e.target.value })}
                          placeholder="Type meeting takeaways, performance feedback, or action items..."
                          className="w-full text-xs bg-background p-2 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                        />
                      </div>
                    </div>

                    {/* Action Items checklist */}
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">Action Items & Deliverables ({mtg.actionItems?.length || 0})</p>
                      </div>

                      <div className="space-y-1.5">
                        {mtg.actionItems?.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleToggleActionItem(mtg, idx)}
                            className="flex items-center justify-between p-2 rounded-md bg-accent/20 border border-border hover:bg-accent/40 cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {item.completed ? (
                                <i className="fa-solid fa-square-check text-emerald-500 text-sm" />
                              ) : (
                                <i className="fa-regular fa-square text-muted-foreground text-sm" />
                              )}
                              <span className={cn("font-medium", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                                {item.text}
                              </span>
                            </div>

                            {item.carriedOver && (
                              <Badge color="warning" className="text-[9px] gap-1">
                                <i className="fa-solid fa-rotate text-[10px]" /> Carried Over
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Action Item Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          placeholder="Add new action item..."
                          value={newActionItemTexts[mtg._id] || ""}
                          onChange={(e) => setNewActionItemTexts({ ...newActionItemTexts, [mtg._id]: e.target.value })}
                          className="text-xs flex-1 h-8"
                          onKeyDown={(e) => e.key === "Enter" && handleAddActionItem(mtg)}
                        />
                        <Button color="primary" size="sm" onClick={() => handleAddActionItem(mtg)} className="h-8 text-xs">
                          + Add Item
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KUDOS WALL */}
      {activeTab === "kudos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kudosList.length === 0 ? (
            <Card className="col-span-full p-8 text-center text-muted-foreground">
              <i className="fa-solid fa-wand-magic-sparkles text-3xl mx-auto mb-3 opacity-50 text-amber-500 block" />
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
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><i className="fa-solid fa-bullseye text-primary text-base" /> Create Strategic OKR</h3>
              <button onClick={() => setShowOkrModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
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

      {/* Launch Pulse Survey Modal */}
      {showSurveyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowSurveyModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-sky-500 text-base" /> Launch Pulse Survey
              </h3>
              <button onClick={() => setShowSurveyModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <form onSubmit={handleCreateSurvey} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Survey Category</label>
                <select
                  value={newSurveyCategory}
                  onChange={(e) => setNewSurveyCategory(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Morale">Morale & Energy</option>
                  <option value="Workload">Workload & Burnout</option>
                  <option value="Management Support">Management Support</option>
                  <option value="Company Vision">Company Vision & Alignment</option>
                  <option value="General">General Feedback</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Survey Question *</label>
                <Input
                  value={newSurveyQuestion}
                  onChange={(e) => setNewSurveyQuestion(e.target.value)}
                  placeholder="e.g. How confident do you feel about our Q3 goals?"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSurveyModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Launch Survey</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule 1:1 Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowMeetingModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-check text-emerald-500 text-base" /> Schedule 1:1 Meeting
              </h3>
              <button onClick={() => setShowMeetingModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <form onSubmit={handleScheduleMeeting} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select Colleague *</label>
                <select
                  value={selectedColleague}
                  onChange={(e) => setSelectedColleague(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose team member...</option>
                  {teamMembers.map((m) => (
                    <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Structured Agenda</label>
                <textarea
                  rows={3}
                  value={meetingAgenda}
                  onChange={(e) => setMeetingAgenda(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowMeetingModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Schedule Meeting</Button>
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
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2"><i className="fa-solid fa-heart text-rose-500 text-base" /> Recognize a Colleague</h3>
              <button onClick={() => setShowKudosModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
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
