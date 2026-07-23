"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, undefined);

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.header}>
          <div className={styles.logo}>✦ NexAce CRM</div>
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>Enter your email to receive a temporary reset link.</p>
        </div>

        {state?.success ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              fontSize: "0.875rem",
              fontWeight: 500
            }}>
              {state.message}
            </div>
            <Link href="/login" className={styles.submitBtn}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form action={formAction} className={styles.form}>
            {state?.message && (
              <div className={styles.generalError}>
                {state.message}
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. john@acme.com"
                className={styles.input}
                required
              />
              {state?.errors?.email && (
                <span className={styles.errorText}>{state.errors.email[0]}</span>
              )}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isPending}>
              {isPending ? "Sending Link..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className={styles.footer}>
          Remember your password?{" "}
          <Link href="/login" className={styles.link}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
