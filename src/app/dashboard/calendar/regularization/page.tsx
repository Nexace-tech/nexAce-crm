"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Preloader } from "@/components/ui/Preloader";
import { AccessRestricted } from "@/components/ui/AccessRestricted";
import { AttendanceRegularizationDesk } from "@/components/calendar/AttendanceRegularizationDesk";
import { cn } from "@/lib/utils";

function AttendanceRegularizationPageContent() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { can, canAccessModule, isAdmin, isOPS, isHR, loading: permLoading } = usePermissions();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "all");
      params.append("allUsers", "true");

      const res = await fetch(`/api/attendance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceHistory(data.history || []);
      } else {
        showToast("Failed to fetch attendance records.", "error");
      }
    } catch (err) {
      console.error("AttendanceRegularizationPage fetch error:", err);
      showToast("Network error fetching attendance records.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || authLoading || permLoading) return;
    fetchAttendance();
  }, [mounted, authLoading, permLoading, fetchAttendance]);

  if (!mounted || authLoading || permLoading) {
    return <Preloader label="Loading Attendance Regularization Desk..." />;
  }

  // Access validation: Calendar access
  const hasAccess = canAccessModule("calendar");

  if (currentUser && !hasAccess) {
    return (
      <AccessRestricted
        moduleName="Attendance Regularization Desk"
        icon="fa-solid fa-clock-rotate-left"
      />
    );
  }

  const canApprove = Boolean(isAdmin || can("approveRegularization"));
  const canExport = Boolean(isAdmin || isOPS || isHR || can("exportAttendance") || can("exportShiftExtensions"));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-[99999] px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-600"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          {toast.type === "success" ? (
            <i className="fa-solid fa-circle-check text-base" />
          ) : (
            <i className="fa-solid fa-circle-exclamation text-base" />
          )}
          {toast.message}
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors shadow-xs"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            <span>Back to Calendar</span>
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <i className="fa-solid fa-clock-rotate-left text-amber-500" />
            <span className="font-semibold text-foreground">Dedicated Regularization Screen</span>
          </div>
        </div>

        <button
          onClick={() => fetchAttendance()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-card border border-border/80 text-foreground hover:border-primary/50 hover:bg-accent/30 transition-colors shadow-xs cursor-pointer self-start sm:self-auto min-h-[38px]"
        >
          <i className={cn("fa-solid fa-rotate text-xs text-primary", loading && "fa-spin")} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Main AttendanceRegularizationDesk Component */}
      <AttendanceRegularizationDesk
        attendanceHistory={attendanceHistory}
        onRefresh={fetchAttendance}
        onToast={showToast}
        canApprove={canApprove}
        canExport={canExport}
        currentUserId={currentUser?._id}
        currentUserRole={currentUser?.role}
        currentUserDepartment={currentUser?.department}
        onBackToClock={() => router.push("/dashboard/calendar?tab=attendance")}
      />
    </div>
  );
}

export default function AttendanceRegularizationPage() {
  return (
    <Suspense fallback={<Preloader label="Loading Attendance Regularization Desk..." />}>
      <AttendanceRegularizationPageContent />
    </Suspense>
  );
}
