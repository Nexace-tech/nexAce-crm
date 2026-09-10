"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface AccessRestrictedProps {
  moduleName: string;
  description?: string;
  icon?: string;
}

export function AccessRestricted({
  moduleName,
  description,
  icon = "fa-solid fa-shield-halved",
}: AccessRestrictedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 animate-in fade-in">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-2xl shadow-xs">
        <i className={icon} />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {description || `You do not have permission to access ${moduleName}. Please contact your workspace administrator to request access.`}
        </p>
      </div>
      <Link href="/dashboard">
        <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold cursor-pointer">
          <i className="fa-solid fa-arrow-left text-xs" /> Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
