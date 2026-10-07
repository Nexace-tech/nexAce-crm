"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export function PendingApprovalDashboard({ user }: { user: any }) {
  const { logout, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Background auto-polling every 30 seconds for approval status verification
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (refreshUser) {
          await refreshUser();
        }
      } catch (err) {
        console.error("Auto-polling status check error:", err);
      }
    }, 30000); // 30 seconds interval

    return () => clearInterval(interval);
  }, [refreshUser]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMsg(null);
    try {
      if (refreshUser) {
        await refreshUser();
      }
      setStatusMsg("Status refreshed!");
    } catch (err) {
      console.error("Error refreshing status:", err);
      setStatusMsg("Failed to refresh status.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-4xl mx-auto pt-4">
      {/* Top Banner Notice: Under Approval */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-5 md:p-6 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 mt-0.5 shadow-inner">
              <i className="fa-solid fa-user-clock text-2xl animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold px-2.5 py-0.5 text-xs flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Under Approval
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">Status: Pending OPS / Admin Verification</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Welcome, <span className="text-amber-500 font-extrabold">{user?.name || user?.email}</span>! Your account is currently Under Approval.
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                Your registration was received. An Administrator or Operations Manager is assigning your department and reporting manager.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              color="primary"
              size="sm"
              onClick={handleCheckStatus}
              disabled={checking}
              className="text-xs font-semibold gap-1.5 shadow-md cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
            >
              <i className={`fa-solid fa-rotate text-xs ${checking ? "animate-spin" : ""}`} />
              {checking ? "Verifying..." : "Check Status"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs cursor-pointer border-border hover:bg-muted text-foreground"
            >
              <i className="fa-solid fa-arrow-right-from-bracket mr-1.5 text-muted-foreground" />
              Sign Out
            </Button>
          </div>
        </div>

        {statusMsg && (
          <div className="mt-3 p-2 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg font-medium flex items-center gap-2 animate-in fade-in">
            <i className="fa-solid fa-circle-check" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Progress Timeline Tracker */}
      <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <i className="fa-solid fa-bars-progress text-primary" /> Onboarding &amp; Approval Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-check text-sm font-bold" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">1. Registration Completed</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Email verified and credentials secured.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3 shadow-xs">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-hourglass-half text-sm animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">2. Under Approval (In Review)</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Department &amp; Reporting Manager allocation in OPS Portal.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-start gap-3 opacity-60">
            <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
              <i className="fa-solid fa-lock text-sm" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">3. Workspace Tools Unlocked</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Automated unlock once approved.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid: Registration Details & Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4 border-border shadow-xs bg-card">
          <div className="pb-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-id-card text-amber-500" /> Account Information
            </h3>
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
              Pending Activation
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Full Name</span>
              <span className="font-semibold text-foreground">{user?.name || "Employee User"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Username</span>
              <span className="font-mono text-foreground font-medium">@{user?.username || "—"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Registered Email</span>
              <span className="font-mono text-foreground font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Requested Role</span>
              <span className="font-medium text-primary">{user?.role || "Employee"}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground font-medium">Workspace Organization</span>
              <span className="font-medium text-foreground">{user?.tenantId?.name || "NexAce Workspace"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4 border-border shadow-xs bg-card flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-blue-500" /> What Happens Next?
              </h3>
            </div>
            <div className="mt-3 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                1. Your workspace administrator and Operations (OPS) team have been notified of your registration.
              </p>
              <p>
                2. During the approval process, you will be assigned to your <strong>Department</strong>, a <strong>Reporting Manager</strong>, and an <strong>Assigned HR</strong>.
              </p>
              <p>
                3. This screen checks for approval in the background every 30 seconds. You can also click <strong>&quot;Check Status&quot;</strong> anytime.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-primary shrink-0" />
            <span>Need immediate access? Please notify your team leader or Operations administrator.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
