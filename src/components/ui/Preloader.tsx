"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreloaderProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export function Preloader({ 
  label = "Loading Workspace Data...", 
  fullScreen = false,
  className 
}: PreloaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-4 p-8 transition-all duration-300 animate-in fade-in",
        fullScreen ? "fixed inset-0 z-50 bg-background/90 backdrop-blur-md min-h-screen" : "min-h-[350px] w-full",
        className
      )}
    >
      {/* Animated Glowing Spinner & Brand Icon */}
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Outer glowing pulsing ring */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-blue-500 to-emerald-500 opacity-70 blur-md animate-pulse" />
        
        {/* Rotating gradient border ring */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary border-r-blue-500 border-b-emerald-500 animate-spin" />
        
        {/* Center Sparkles Icon */}
        <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-card border border-border shadow-lg shadow-primary/20 text-primary">
          <Sparkles className="w-6 h-6 animate-bounce" />
        </div>
      </div>

      {/* Text Label & Animated Pulsing Dots */}
      <div className="flex flex-col items-center space-y-1.5 text-center">
        <p className="text-sm font-semibold tracking-wide text-foreground flex items-center gap-1.5">
          {label}
          <span className="flex space-x-1 ml-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
          </span>
        </p>
        <p className="text-xs text-muted-foreground font-mono">NexAce Unified CRM</p>
      </div>
    </div>
  );
}
