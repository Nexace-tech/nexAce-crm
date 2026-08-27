"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PendingApprovalsCard() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [userToDecline, setUserToDecline] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch("/api/team?pending=true");
        if (res.ok) {
          const data = await res.json();
          setPendingUsers(data.users || []);
        }
      } catch (err) {
        console.error("Error loading pending users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, []);

  const handleApproveUser = async (userId: string, userName: string) => {
    setProcessingId(userId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPending: false }),
      });
      if (res.ok) {
        setActionSuccess(`Approved access for ${userName}.`);
        setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (err) {
      console.error("Error approving user:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectUser = async (userId: string, userName: string) => {
    setProcessingId(userId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActionSuccess(`Declined registration for ${userName}.`);
        setUserToDecline(null);
        setPendingUsers((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (err) {
      console.error("Error declining user:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || pendingUsers.length === 0) {
    if (!actionSuccess) return null;
  }

  return (
    <>
      <Card className="border border-amber-500/30 bg-amber-500/5 shadow-md relative overflow-hidden animate-in fade-in">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-clock text-amber-500 animate-pulse text-base" /> Pending Employee Registration Approvals
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              New employee signups requiring administrator review and account activation
            </CardDescription>
          </div>
          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
            {pendingUsers.length} Pending Request{pendingUsers.length === 1 ? "" : "s"}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          {actionSuccess && (
            <div className="p-3 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md font-medium flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-base shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          <div className="divide-y divide-border/40 rounded-lg border border-border bg-card">
            {pendingUsers.map((user) => (
              <div key={user._id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 font-bold flex items-center justify-center text-sm border border-amber-500/20 shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{user.name}</p>
                      <span className="text-xs font-mono text-muted-foreground">@{user.username || "employee"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.email} • Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUserToDecline({ id: user._id, name: user.name })}
                    disabled={processingId === user._id}
                    className="text-xs h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <i className="fa-solid fa-user-xmark text-xs mr-1" /> Decline
                  </Button>

                  <Button
                    size="sm"
                    color="primary"
                    onClick={() => handleApproveUser(user._id, user.name)}
                    disabled={processingId === user._id}
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm cursor-pointer"
                  >
                    <i className="fa-solid fa-user-check text-xs mr-1" /> Approve Account
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decline User In-App Modal */}
      {userToDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Decline Registration</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to decline registration for <strong className="text-foreground">{userToDecline.name}</strong>? Their pending account will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserToDecline(null)}
                disabled={Boolean(processingId)}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleRejectUser(userToDecline.id, userToDecline.name)}
                disabled={Boolean(processingId)}
                className="gap-2 font-semibold cursor-pointer"
              >
                {processingId === userToDecline.id ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Declining...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-xmark text-xs" /> Decline Access
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
