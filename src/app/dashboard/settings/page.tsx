"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email verification modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeError, setEmailCodeError] = useState("");
  const [pendingProfileData, setPendingProfileData] = useState<any>(null);
  const [devPreviewUrl, setDevPreviewUrl] = useState("");
  const [devCode, setDevCode] = useState("");

  // UI state
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Hydrate form states once user is loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setSkills(user.skills ? user.skills.join(", ") : "");
    }
  }, [user]);

  const executeUpdateProfile = async (profileData: any) => {
    if (!user) return;
    setUpdatingProfile(true);
    try {
      const response = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshUser();
        showToast("Profile details updated successfully!", "success");
        setShowEmailModal(false);
        setPendingProfileData(null);
      } else {
        showToast(data.error || "Failed to update profile", "error");
        if (showEmailModal) {
          setEmailCodeError(data.error || "Failed to update profile");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const skillsArray = skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const profileData = {
      name,
      email,
      phone,
      bio,
      skills: skillsArray,
      code: "",
    };

    const emailChanged = email.toLowerCase() !== (user.email || "").toLowerCase();

    if (emailChanged) {
      setUpdatingProfile(true);
      try {
        const res = await fetch("/api/auth/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          setDevPreviewUrl(data.previewUrl || "");
          setDevCode(data.devCode || "");
          setPendingProfileData(profileData);
          setEmailCode("");
          setEmailCodeError("");
          setShowEmailModal(true);
        } else {
          showToast(data.error || "Failed to request email verification code.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Network error requesting email verification code.", "error");
      } finally {
        setUpdatingProfile(false);
      }
      return;
    }

    await executeUpdateProfile(profileData);
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailCode) {
      setEmailCodeError("Please enter the verification code.");
      return;
    }
    setEmailCodeError("");
    if (pendingProfileData) {
      const verifiedProfileData = {
        ...pendingProfileData,
        code: emailCode,
      };
      await executeUpdateProfile(verifiedProfileData);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long.", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Password updated successfully!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(data.error || "Failed to update password", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", textAlign: "center" }}>
        Loading Settings...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Manage your account profile details, security credentials, and preferences.
        </p>
      </div>

      {/* Profile Details Form */}
      <form onSubmit={handleUpdateProfile} className={`${styles.section} glass-panel`}>
        <h2 className={styles.sectionTitle}>
          <i className="fa-solid fa-user-gear" style={{ color: "var(--color-primary)" }}></i> Account Profile
        </h2>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1-555-0199"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Skills / Tags (comma-separated)</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React, Next.js, Marketing"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.label}>Bio / Description</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className={`${styles.input} ${styles.textarea}`}
              style={{ minHeight: "100px", resize: "vertical" }}
            />
          </div>
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={updatingProfile}>
          {updatingProfile ? "Saving changes..." : "Save Profile Details"}
        </button>
      </form>

      {/* Security Form */}
      <form onSubmit={handleUpdatePassword} className={`${styles.section} glass-panel`}>
        <h2 className={styles.sectionTitle}>
          <i className="fa-solid fa-shield-halved" style={{ color: "var(--color-primary)" }}></i> Password & Security
        </h2>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Current Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={`${styles.input} ${styles.passwordInput}`}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                title={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? (
                  <i className="fa-solid fa-eye-slash"></i>
                ) : (
                  <i className="fa-solid fa-eye"></i>
                )}
              </button>
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }} />

          <div className={styles.formGroup}>
            <label className={styles.label}>New Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`${styles.input} ${styles.passwordInput}`}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowNewPassword(!showNewPassword)}
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <i className="fa-solid fa-eye-slash"></i>
                ) : (
                  <i className="fa-solid fa-eye"></i>
                )}
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm New Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`${styles.input} ${styles.passwordInput}`}
                required
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <i className="fa-solid fa-eye-slash"></i>
                ) : (
                  <i className="fa-solid fa-eye"></i>
                )}
              </button>
            </div>
          </div>
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={updatingPassword}>
          {updatingPassword ? "Updating password..." : "Change Password"}
        </button>
      </form>

      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          <i className={toast.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}></i>
          {toast.message}
        </div>
      )}
      {/* Email Verification Modal */}
      {showEmailModal && (
        <div className={styles.modalOverlay} onClick={() => !updatingProfile && setShowEmailModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              <i className="fa-solid fa-envelope" style={{ color: "var(--color-primary)" }}></i> Verify New Email
            </h3>
            
            <p className={styles.modalDesc}>
              To change your account email to <strong>{email}</strong>, please authorize this action by entering the simulated code.
            </p>

            {devPreviewUrl ? (
              <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid var(--color-primary-glow)", padding: "1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                <i className="fa-solid fa-envelope-circle-check" style={{ color: "#10b981", marginRight: "0.35rem" }}></i>
                Verification code sent successfully. Please check your inbox.
              </div>
            )}

            <form onSubmit={handleVerifyEmailCode} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {emailCodeError && (
                <div className={styles.toastError} style={{ padding: "0.5rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", color: "var(--color-danger)", border: "1px solid rgba(239, 68, 68, 0.15)", background: "rgba(239, 68, 68, 0.05)" }}>
                  {emailCodeError}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Verification Code</label>
                <input
                  type="text"
                  placeholder="e.g. 654321"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  className={styles.input}
                  maxLength={6}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setShowEmailModal(false)}
                  disabled={updatingProfile}
                  style={{ padding: "0.75rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={updatingProfile}
                  style={{ alignSelf: "unset", flex: 1, padding: "0.75rem" }}
                >
                  {updatingProfile ? "Updating Profile..." : "Verify & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
