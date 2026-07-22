"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, undefined);

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.header}>
          <div className={styles.logo}>✦ NexAce CRM</div>
          <h2 className={styles.title}>Create Workspace</h2>
          <p className={styles.subtitle}>Register your client company tenant tenant-isolation account.</p>
        </div>

        <form action={formAction} className={styles.form}>
          {/* General Message (API/DB Connection Errors) */}
          {state?.message && (
            <div className={styles.generalError}>
              {state.message}
            </div>
          )}

          {/* Company Details */}
          <div className={styles.formGroup}>
            <label htmlFor="companyName" className={styles.label}>Company Name</label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="e.g. Acme Corporation"
              className={styles.input}
              required
            />
            {state?.errors?.companyName && (
              <span className={styles.errorText}>{state.errors.companyName[0]}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="companySlug" className={styles.label}>Workspace Slug</label>
            <input
              id="companySlug"
              name="companySlug"
              type="text"
              placeholder="e.g. acme-corp"
              className={styles.input}
              required
            />
            {state?.errors?.companySlug && (
              <span className={styles.errorText}>{state.errors.companySlug[0]}</span>
            )}
          </div>

          {/* Admin User Details */}
          <div className={styles.formGroup}>
            <label htmlFor="adminName" className={styles.label}>Administrator Name</label>
            <input
              id="adminName"
              name="adminName"
              type="text"
              placeholder="e.g. John Doe"
              className={styles.input}
              required
            />
            {state?.errors?.adminName && (
              <span className={styles.errorText}>{state.errors.adminName[0]}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="adminEmail" className={styles.label}>Admin Email</label>
            <input
              id="adminEmail"
              name="adminEmail"
              type="email"
              placeholder="e.g. john@acme.com"
              className={styles.input}
              required
            />
            {state?.errors?.adminEmail && (
              <span className={styles.errorText}>{state.errors.adminEmail[0]}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="adminPassword" className={styles.label}>Password</label>
            <input
              id="adminPassword"
              name="adminPassword"
              type="password"
              placeholder="••••••••"
              className={styles.input}
              required
            />
            {state?.errors?.adminPassword && (
              <span className={styles.errorText}>{state.errors.adminPassword[0]}</span>
            )}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isPending}>
            {isPending ? "Creating Workspace..." : "Create Tenant & Admin Account"}
          </button>
        </form>

        <div className={styles.footer}>
          Already have a workspace?{" "}
          <Link href="/login" className={styles.link}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
