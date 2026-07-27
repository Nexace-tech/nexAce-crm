"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ZoomControl() {
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem("nexace_dashboard_zoom");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 70 && parsed <= 120) {
        setZoomLevel(parsed);
        document.body.style.zoom = `${parsed}%`;
      }
    }
  }, []);

  const updateZoom = (newZoom: number) => {
    const clamped = Math.min(Math.max(newZoom, 70), 120);
    setZoomLevel(clamped);
    document.body.style.zoom = `${clamped}%`;
    localStorage.setItem("nexace_dashboard_zoom", String(clamped));
  };

  return (
    <div className="flex items-center gap-1 bg-muted/60 dark:bg-slate-800/80 border border-border/80 dark:border-slate-700/80 rounded-lg p-0.5 shadow-xs transition-colors">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => updateZoom(zoomLevel - 5)}
        disabled={zoomLevel <= 70}
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/80 dark:hover:bg-slate-700/80 cursor-pointer transition-colors"
        title="Zoom Out"
      >
        <i className="fa-solid fa-magnifying-glass-minus text-xs" />
        <span className="sr-only">Zoom Out</span>
      </Button>

      <span className="text-xs font-semibold text-foreground/90 px-1 min-w-[36px] text-center select-none font-mono">
        {zoomLevel}%
      </span>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => updateZoom(zoomLevel + 5)}
        disabled={zoomLevel >= 120}
        className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/80 dark:hover:bg-slate-700/80 cursor-pointer transition-colors"
        title="Zoom In"
      >
        <i className="fa-solid fa-magnifying-glass-plus text-xs" />
        <span className="sr-only">Zoom In</span>
      </Button>

      {zoomLevel !== 100 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => updateZoom(100)}
          className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/80 dark:hover:bg-slate-700/80 cursor-pointer transition-colors"
          title="Reset Zoom"
        >
          <i className="fa-solid fa-rotate-left text-xs" />
          <span className="sr-only">Reset Zoom</span>
        </Button>
      )}
    </div>
  );
}
