"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  
  // Verification states
  const [step, setStep] = useState<"details" | "verify">("details");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [emailForVerification, setEmailForVerification] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [devPreviewUrl, setDevPreviewUrl] = useState("");
  const [devCode, setDevCode] = useState("");

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // remove non-word characters
      .replace(/[\s_-]+/g, "-")  // replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, "");  // trim leading/trailing hyphens
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    if (!isSlugManuallyEdited) {
      setCompanySlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const handleNextStep = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Simple client validation before advancing
    const companyName = (document.getElementById("companyName") as HTMLInputElement)?.value;
    const companySlug = (document.getElementById("companySlug") as HTMLInputElement)?.value;
    const adminName = (document.getElementById("adminName") as HTMLInputElement)?.value;
    const adminEmail = (document.getElementById("adminEmail") as HTMLInputElement)?.value;
    const adminPassword = (document.getElementById("adminPassword") as HTMLInputElement)?.value;

    if (!companyName || !companySlug || !adminName || !adminEmail || !adminPassword) {
      setVerificationError("Please fill out all fields first.");
      return;
    }

    if (!adminEmail.includes("@")) {
      setVerificationError("Please enter a valid email address.");
      return;
    }

    if (adminPassword.length < 6) {
      setVerificationError("Password must be at least 6 characters long.");
      return;
    }

    setVerificationError("");
    setSendingCode(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevPreviewUrl(data.previewUrl || "");
        setDevCode(data.devCode || "");
        setEmailForVerification(adminEmail);
        setStep("verify");
      } else {
        setVerificationError(data.error || "Failed to send verification code. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setVerificationError("Network error: Failed to request verification code.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Submitted naturally to server action
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.header}>
          <div className={styles.logo}>✦ NexAce CRM</div>
          <h2 className={styles.title}>
            {step === "details" ? "Create Workspace" : "Verify Admin Email"}
          </h2>
          <p className={styles.subtitle}>
            {step === "details" 
              ? "Register your client company tenant account." 
              : `We've sent a verification code to ${emailForVerification}`}
          </p>
        </div>

        <form action={formAction} onSubmit={handleFormSubmit} className={styles.form}>
          <input type="hidden" name="code" value={verificationCode} />
          {/* General Message (API/DB Connection Errors) */}
          {(state?.message || verificationError) && (
            <div className={styles.generalError}>
              {state?.message || verificationError}
            </div>
          )}

          {/* STEP 1: Details Section */}
          <div style={{ display: step === "details" ? "flex" : "none", flexDirection: "column", gap: "1.25rem" }}>
            {/* Company Details */}
            <div className={styles.formGroup}>
              <label htmlFor="companyName" className={styles.label}>Company Name</label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="e.g. Acme Corporation"
                value={companyName}
                onChange={handleCompanyNameChange}
                className={styles.input}
                required={step === "details"}
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
                value={companySlug}
                onChange={handleSlugChange}
                className={styles.input}
                required={step === "details"}
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
                required={step === "details"}
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
                required={step === "details"}
              />
              {state?.errors?.adminEmail && (
                <span className={styles.errorText}>{state.errors.adminEmail[0]}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="adminPassword" className={styles.label}>Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="adminPassword"
                  name="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`${styles.input} ${styles.passwordInput}`}
                  required={step === "details"}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <i className="fa-solid fa-eye-slash"></i>
                  ) : (
                    <i className="fa-solid fa-eye"></i>
                  )}
                </button>
              </div>
              {state?.errors?.adminPassword && (
                <span className={styles.errorText}>{state.errors.adminPassword[0]}</span>
              )}
            </div>

            <button 
              type="button" 
              onClick={handleNextStep} 
              className={styles.submitBtn}
              disabled={sendingCode}
            >
              {sendingCode ? "Sending Code..." : "Send Verification Code"}
            </button>
          </div>

          {/* STEP 2: Email Verification Code Section */}
          <div style={{ display: step === "verify" ? "flex" : "none", flexDirection: "column", gap: "1.25rem" }}>
            {devPreviewUrl ? (
              <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid var(--color-primary-glow)", padding: "1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--text-primary)", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div>
                  <i className="fa-solid fa-paper-plane" style={{ color: "var(--color-primary)", marginRight: "0.35rem" }}></i>
                  <strong>Developer SMTP Sandbox:</strong> Verification code sent!
                </div>
                <div>
                  Use code: <code style={{ background: "rgba(255,255,255,0.1)", padding: "0.15rem 0.35rem", borderRadius: "4px", color: "var(--color-primary)", fontWeight: "bold" }}>{devCode}</code>
                </div>
                <a href={devPreviewUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-info)", textDecoration: "underline", fontWeight: 600 }}>
                  View Sent Email Inbox ↗
                </a>
              </div>
            ) : (
              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--text-primary)", textAlign: "center" }}>
                <i className="fa-solid fa-envelope-circle-check" style={{ color: "#10b981", marginRight: "0.35rem" }}></i>
                Verification code sent successfully to <strong>{emailForVerification}</strong>. Please check your inbox.
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="code" className={styles.label}>Verification Code</label>
              <input
                id="code"
                type="text"
                placeholder="e.g. 123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className={styles.input}
                maxLength={6}
                required={step === "verify"}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button 
                type="button" 
                onClick={() => { setStep("details"); setVerificationError(""); }} 
                className={styles.submitBtn} 
                style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-color)", color: "var(--text-primary)", flex: 1 }}
              >
                Go Back
              </button>
              <button 
                type="submit" 
                className={styles.submitBtn} 
                style={{ flex: 2 }}
                disabled={isPending}
              >
                {isPending ? "Creating Workspace..." : "Verify & Register"}
              </button>
            </div>
          </div>
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
