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
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Top Banner Notice for Pending Verification & Demo Preview Mode */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 md:p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 mt-0.5">
              <i className="fa-solid fa-clock text-xl animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold px-2.5 py-0.5 text-[11px] flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Account Pending Admin Verification
                </Badge>
              </div>
              <p className="text-sm font-semibold text-foreground">
                Welcome, <span className="text-amber-500 font-bold">{user?.name || user?.email}</span>! Your employee registration is awaiting administrator approval.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full workspace tools will unlock automatically as soon as your administrator verifies your account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              color="primary"
              size="sm"
              onClick={handleCheckStatus}
              disabled={checking}
              className="text-xs font-semibold gap-1.5 shadow-md cursor-pointer"
            >
              <i className={`fa-solid fa-rotate text-xs ${checking ? "animate-spin" : ""}`} />
              {checking ? "Verifying..." : "Check Status"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs cursor-pointer"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {statusMsg && (
          <div className="mt-3 p-2 text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg font-medium flex items-center gap-2">
            <i className="fa-solid fa-circle-check" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Content Grid: Registration Details */}
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="p-6 space-y-5 border-amber-500/20 shadow-md bg-card">
          <div className="pb-4 border-b border-border">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-id-card text-amber-500" /> Registration Details
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Your account details have been securely recorded.</p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Name</span>
                <p className="font-bold text-foreground mt-0.5">{user?.name || "Employee User"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered Email</span>
                <p className="font-mono text-foreground font-medium mt-0.5">{user?.email}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</span>
                <p className="font-medium text-primary mt-0.5">{user?.role || "Employee"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</span>
                <p className="font-medium text-foreground mt-0.5">{user?.tenantId?.name || "NexAce Workspace"}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-2 mt-4">
              <p className="font-bold flex items-center gap-2 text-sm">
                <i className="fa-solid fa-bell text-amber-500 text-base" /> Next Steps
              </p>
              <p className="text-xs leading-relaxed opacity-90">
                An email alert was sent to your workspace administrator. You will be automatically redirected to your live employee dashboard as soon as an admin approves your request. Please check back later.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
