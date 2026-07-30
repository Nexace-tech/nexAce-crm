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
      setStatusMsg("Status checked!");
    } catch (err) {
      console.error("Error refreshing status:", err);
      setStatusMsg("Failed to refresh status.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-[500px] flex items-center justify-center p-4 animate-in fade-in">
      <Card className="max-w-lg w-full border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-background to-background shadow-xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
        
        <CardHeader className="pt-8 pb-4 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center border border-amber-500/20 shadow-inner">
            <i className="fa-solid fa-clock text-amber-500 text-2xl animate-pulse" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 font-semibold px-2.5 py-0.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Status: Pending Approval
              </Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-foreground">
              Account Registration Pending
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1.5">
              Welcome, <strong className="text-foreground">{user?.name || user?.email}</strong>! Your account has been registered.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {/* Real-time status indicator badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-500 bg-emerald-500/10 py-1.5 px-3 rounded-full border border-emerald-500/20 max-w-xs mx-auto">
            <i className="fa-solid fa-tower-broadcast text-xs animate-pulse" />
            <span>Live Auto-Sync Active (Checking every 30s)</span>
          </div>

          {/* Detailed Info Card */}
          <div className="p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground leading-relaxed text-left space-y-3 shadow-xs">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
              <i className="fa-solid fa-shield-cat text-amber-600 text-sm shrink-0" /> Administrator Verification Required
            </div>
            <p>
              Your account is currently under review by your organization&apos;s administrator. Once approved, this page will automatically unlock your full dashboard without reloading!
            </p>

            <div className="pt-2 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">Registered Email:</span>
                <p className="font-semibold text-foreground font-mono truncate">{user?.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Workspace Tenant:</span>
                <p className="font-semibold text-foreground truncate">{user?.tenantId?.name || "NexAce Workspace"}</p>
              </div>
            </div>
          </div>

          {statusMsg && (
            <div className="p-2.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg font-medium flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-check text-sm" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button 
              color="primary" 
              size="sm" 
              onClick={handleCheckStatus} 
              disabled={checking}
              className="w-full sm:w-auto font-semibold gap-2 cursor-pointer shadow-md"
            >
              <i className={`fa-solid fa-rotate text-xs ${checking ? "animate-spin" : ""}`} /> 
              {checking ? "Checking..." : "Check Now"}
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="w-full sm:w-auto text-xs cursor-pointer"
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
