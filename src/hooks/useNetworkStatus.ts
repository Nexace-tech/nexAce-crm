"use client";

import { useState, useEffect, useCallback } from "react";
import { NativeService } from "@/lib/native/nativeService";

export interface NetworkStatus {
  isOnline: boolean;
  reconnected: boolean;
  isChecking: boolean;
  isNative: boolean;
  checkConnection: () => Promise<boolean>;
}

/**
 * Professional hook for tracking network connectivity across Web and Native Mobile (Capacitor).
 * Handles true ping verification, haptic responses, and auto-reconnect notifications.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof window !== "undefined" ? navigator.onLine : true;
  });
  const [reconnected, setReconnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isNative] = useState<boolean>(() => {
    return NativeService.isNative();
  });

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    NativeService.listenNetwork((connected) => {
      setIsOnline((prev) => {
        if (!prev && connected) {
          // Reconnected after an offline state
          NativeService.haptic("success");
          setReconnected(true);
          setTimeout(() => setReconnected(false), 3500);
        } else if (prev && !connected) {
          NativeService.haptic("warning");
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

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    NativeService.haptic("light");

    try {
      let active = typeof navigator !== "undefined" ? navigator.onLine : true;

      // Verify actual internet throughput via lightweight HEAD request
      if (active) {
        try {
          const res = await fetch("/api/auth/me", {
            method: "HEAD",
            cache: "no-store",
          });
          active = res.status < 500;
        } catch {
          active = false;
        }
      }

      setIsOnline(active);

      if (active) {
        NativeService.haptic("success");
        setReconnected(true);
        setTimeout(() => setReconnected(false), 3500);
      } else {
        NativeService.haptic("error");
      }

      return active;
    } catch {
      setIsOnline(false);
      NativeService.haptic("error");
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    isOnline,
    reconnected,
    isChecking,
    isNative,
    checkConnection,
  };
}
