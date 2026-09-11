"use client";

import React, { useState, useEffect } from "react";
import { NativeService } from "@/lib/native/nativeService";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    NativeService.listenNetwork((connected) => {
      setIsOnline((prev) => {
        if (!prev && connected) {
          // Came back online
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 3000);
        }
        return connected;
      });
    }).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="alert"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-md",
        !isOnline
          ? "bg-amber-600 text-white animate-pulse"
          : "bg-emerald-600 text-white"
      )}
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top, 0px))",
      }}
    >
      {!isOnline ? (
        <>
          <i className="fa-solid fa-triangle-exclamation text-sm" />
          <span>You are currently offline. Changes will sync automatically when reconnected.</span>
        </>
      ) : (
        <>
          <i className="fa-solid fa-circle-check text-sm" />
          <span>Connection restored. Back online!</span>
        </>
      )}
    </div>
  );
}
