"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import styles from "../auth.module.css";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.header}>
          <div className={styles.logo}>✦ NexAce CRM</div>
          <h2 className={styles.title}>Sign In</h2>
          <p className={styles.subtitle}>Enter your credentials to access your tenant workspace.</p>
        </div>

        <form action={formAction} className={styles.form}>
          {/* General Message */}
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

          <div className={styles.formGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <Link href="#" className={styles.link} style={{ fontSize: "0.75rem" }}>
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className={styles.input}
              required
            />
            {state?.errors?.password && (
              <span className={styles.errorText}>{state.errors.password[0]}</span>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className={styles.footer}>
          Need a workspace for your company?{" "}
          <Link href="/register" className={styles.link}>
            Create Tenant
          </Link>
        </div>
      </div>
    </div>
  );
}
