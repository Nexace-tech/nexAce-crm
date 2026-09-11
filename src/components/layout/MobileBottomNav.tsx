"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { NativeService } from "@/lib/native/nativeService";

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  isMenuOpen?: boolean;
}

export function MobileBottomNav({ onOpenMenu, isMenuOpen = false }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isHomeActive = pathname === "/dashboard";
  const isTasksActive = pathname.startsWith("/dashboard/projects");
  const isChatActive = pathname.startsWith("/dashboard/chat");

  const handleCheckInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    NativeService.haptic("medium");
    if (pathname === "/dashboard") {
      const el = document.getElementById("attendance-widget") || document.querySelector('[data-attendance-widget="true"]');
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Add subtle highlight flash
        el.classList.add("ring-2", "ring-[#00c5a0]", "transition-all");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-[#00c5a0]");
        }, 1500);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#161c24]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#232d3b] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-all duration-200"
      style={{
        paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="flex items-center justify-around px-2 h-15 max-w-lg mx-auto">
        {/* Tab 1: Home */}
        <Link
          href="/dashboard"
          onClick={() => NativeService.haptic("light")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 active:scale-95 no-underline",
            isHomeActive
              ? "text-[#00c5a0] font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          )}
        >
          <div className="relative">
            <i className={cn("fa-solid fa-gauge-high text-base", isHomeActive ? "scale-110" : "")} />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00c5a0] rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </Link>

        {/* Tab 2: Tasks & Projects */}
        <Link
          href="/dashboard/projects"
          onClick={() => NativeService.haptic("light")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 active:scale-95 no-underline",
            isTasksActive
              ? "text-[#00c5a0] font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          )}
        >
          <div className="relative">
            <i className={cn("fa-solid fa-folder-tree text-base", isTasksActive ? "scale-110" : "")} />
            {isTasksActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00c5a0] rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Tasks</span>
        </Link>

        {/* Tab 3: Prominent Center Action (Clock-In / Attendance) */}
        <button
          onClick={handleCheckInClick}
          type="button"
          aria-label="Daily Check-In Attendance"
          className="relative -top-3.5 flex flex-col items-center group cursor-pointer active:scale-90 transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00c5a0] to-[#0ea5e9] text-slate-950 flex items-center justify-center shadow-lg shadow-[#00c5a0]/35 border-3 border-white dark:border-[#11161d] group-hover:shadow-xl group-hover:shadow-[#00c5a0]/50 transition-all">
            <i className="fa-solid fa-fingerprint text-xl text-slate-950" />
          </div>
          <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-200 mt-0.5 tracking-tight">
            Check In
          </span>
        </button>

        {/* Tab 4: Chat & Communications */}
        <Link
          href="/dashboard/chat"
          onClick={() => NativeService.haptic("light")}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 active:scale-95 no-underline",
            isChatActive
              ? "text-[#00c5a0] font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          )}
        >
          <div className="relative">
            <i className={cn("fa-solid fa-comments text-base", isChatActive ? "scale-110" : "")} />
            {isChatActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00c5a0] rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Chat</span>
        </Link>

        {/* Tab 5: More Drawer Menu */}
        <button
          type="button"
          onClick={() => {
            NativeService.haptic("medium");
            onOpenMenu();
          }}
          aria-label="Open Workspace Modules Menu"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
            isMenuOpen
              ? "text-[#00c5a0] font-bold"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          )}
        >
          <div className="relative">
            <i className={cn("fa-solid fa-bars text-base", isMenuOpen ? "scale-110 text-[#00c5a0]" : "")} />
            {isMenuOpen && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00c5a0] rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}
