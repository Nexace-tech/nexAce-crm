"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrokenPhotoPlaceholderProps {
  /** Size of the placeholder circle — matches Avatar sizes */
  size?: "sm" | "default" | "md" | "lg" | "xl";
  /** If true, shows a re-upload CTA overlay on hover */
  showReuploadHint?: boolean;
  /** Called when the user clicks the re-upload area */
  onReuploadClick?: () => void;
  /** If true, shows a Link to /dashboard/settings instead of onClick */
  linkToSettings?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { outer: "h-8 w-8", icon: "text-sm", badge: "hidden" },
  default: { outer: "h-10 w-10", icon: "text-base", badge: "hidden" },
  md: { outer: "h-12 w-12", icon: "text-lg", badge: "hidden" },
  lg: { outer: "h-16 w-16", icon: "text-2xl", badge: "text-[9px]" },
  xl: { outer: "h-20 w-20", icon: "text-3xl", badge: "text-[10px]" },
};

/**
 * BrokenPhotoPlaceholder
 * Renders a friendly camera-icon placeholder when a profile photo is corrupt or missing.
 * Optionally shows a re-upload hint on hover.
 */
export function BrokenPhotoPlaceholder({
  size = "default",
  showReuploadHint = false,
  onReuploadClick,
  linkToSettings = false,
  className,
}: BrokenPhotoPlaceholderProps) {
  const { outer, icon, badge } = sizeMap[size];

  const inner = (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-amber-500/10 border-2 border-dashed border-amber-400/60 group/bph overflow-hidden shrink-0",
        outer,
        showReuploadHint && "cursor-pointer",
        className
      )}
      onClick={!linkToSettings ? onReuploadClick : undefined}
      title="Profile photo is missing or corrupt — click to re-upload"
    >
      {/* Placeholder icon */}
      <i className={cn("fa-solid fa-camera text-amber-400/80 transition-opacity group-hover/bph:opacity-0", icon)} />

      {/* Hover overlay — re-upload hint */}
      {showReuploadHint && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-500/90 opacity-0 group-hover/bph:opacity-100 transition-opacity rounded-full text-white text-center px-1">
          <i className="fa-solid fa-arrow-up-from-bracket text-xs" />
          <span className={cn("font-bold leading-tight mt-0.5", badge)}>Re-upload</span>
        </div>
      )}
    </div>
  );

  if (linkToSettings) {
    return (
      <Link href="/dashboard/settings" title="Your profile photo is missing — click to go to Settings and re-upload">
        {inner}
      </Link>
    );
  }

  return inner;
}

/**
 * BrokenPhotoBanner
 * A full-width amber warning banner shown below/above a photo to prompt the user to re-upload.
 */
export function BrokenPhotoBanner({
  onReuploadClick,
  linkToSettings = false,
  compact = false,
}: {
  onReuploadClick?: () => void;
  linkToSettings?: boolean;
  compact?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 rounded-lg text-amber-700 dark:text-amber-400",
        compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
      )}
    >
      <i className="fa-solid fa-triangle-exclamation shrink-0" />
      <span className="flex-1 font-medium">
        Profile photo is corrupt or missing.{" "}
        {linkToSettings ? (
          <Link
            href="/dashboard/settings"
            className="underline font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200"
          >
            Go to Settings to re-upload →
          </Link>
        ) : (
          <button
            type="button"
            onClick={onReuploadClick}
            className="underline font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer bg-transparent border-0 p-0"
          >
            Click here to re-upload →
          </button>
        )}
      </span>
    </div>
  );

  return content;
}
