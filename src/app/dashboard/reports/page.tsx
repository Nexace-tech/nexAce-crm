"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import ReportsDashboard from "@/components/operations/ReportsDashboard";
import { Preloader } from "@/components/ui/Preloader";

export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the new OPS Portal Reports & Data Exports tab
    router.replace("/dashboard/clients?tab=reports");
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-circle-info" />
          <span>Reports & Data Exports have moved to the <strong>OPS Portal</strong>. Redirecting you now...</span>
        </div>
      </div>
      <ReportsDashboard embedded={false} />
    </div>
  );
}
