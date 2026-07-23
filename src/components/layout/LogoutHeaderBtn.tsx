"use client";

import React, { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import styles from "./LogoutHeaderBtn.module.css";

export function LogoutHeaderBtn() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      <button 
        type="button" 
        onClick={() => setShowConfirm(true)} 
        className={styles.logoutBtn}
        title="Log Out"
      >
        <i className="fa-solid fa-right-from-bracket"></i>
        <span>Log Out</span>
      </button>

      {/* Sleek Logout Confirmation Modal */}
      {showConfirm && (
        <div className={styles.modalOverlay} onClick={() => !loggingOut && setShowConfirm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              <i className="fa-solid fa-right-from-bracket" style={{ color: "var(--color-danger)" }}></i> Confirm Log Out
            </h3>
            <p className={styles.modalDesc}>
              Are you sure you want to sign out of your NexAce CRM workspace?
            </p>
            <div className={styles.modalActions}>
              <button 
                type="button" 
                className={styles.btnCancel} 
                onClick={() => setShowConfirm(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.btnConfirm} 
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging Out..." : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
