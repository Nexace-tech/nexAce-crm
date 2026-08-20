"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutHeaderBtn() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutAction();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30 border border-destructive/25 rounded-lg h-9 px-2.5 gap-2 transition-all shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
        title="Log Out"
      >
        <i className="fa-solid fa-right-from-bracket text-sm text-destructive" />
        <span className="hidden sm:inline font-semibold text-xs text-destructive">Log Out</span>
      </Button>

      {/* Sleek Logout Confirmation Modal Rendered via React Portal */}
      {showConfirm && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => !loggingOut && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-destructive">
              <i className="fa-solid fa-circle-exclamation text-xl shrink-0" />
              <h3 className="text-lg font-bold text-foreground">Confirm Log Out</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to sign out of your NexAce CRM workspace?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={loggingOut}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging Out..." : "Log Out"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
