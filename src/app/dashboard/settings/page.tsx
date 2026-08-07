"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Preloader } from "@/components/ui/Preloader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, generateSecurePassword } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { UserManagementTab } from "@/components/settings/UserManagementTab";
import { RoleDataControlTab } from "@/components/settings/RoleDataControlTab";
import { ShiftAndStatusTab } from "@/components/settings/ShiftAndStatusTab";

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { can, isAdmin, isOPS } = usePermissions();

  const [activeTab, setActiveTab] = useTabPersistence<"profile" | "security" | "users" | "shifts" | "subscription" | "permissions">(
    "settings_active_tab_v2",
    "profile",
    ["profile", "security", "users", "shifts", "subscription", "permissions"]
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeError, setEmailCodeError] = useState("");
  const [pendingProfileData, setPendingProfileData] = useState<any>(null);
  const [devPreviewUrl, setDevPreviewUrl] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resendEmailCooldown, setResendEmailCooldown] = useState(0);

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [subscription, setSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [settingsFileExts, setSettingsFileExts] = useState("png, jpg, jpeg, pdf, docx, xlsx, zip, csv, txt, svg, webp");
  const [updatingFileRestrictions, setUpdatingFileRestrictions] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [totalCompanyUsers, setTotalCompanyUsers] = useState<number | null>(null);
  const [updatingCompany, setUpdatingCompany] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setSkills(user.skills ? user.skills.join(", ") : "");
      setLinkedin(user.socialLinks?.linkedin || "");
      setTwitter(user.socialLinks?.twitter || "");
      setGithub(user.socialLinks?.github || "");
      setWebsite(user.socialLinks?.website || "");
      setInstagram(user.socialLinks?.instagram || "");
      setFacebook(user.socialLinks?.facebook || "");
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      if (activeTab === "permissions" && !can("manageRolePermissions") && !isAdmin && !isOPS) {
        setActiveTab("profile");
      }
      if (activeTab === "users" && !isAdmin) {
        setActiveTab("profile");
      }
      if (activeTab === "subscription" && !can("viewBillingSubscription") && !isAdmin && !isOPS) {
        setActiveTab("profile");
      }
    }
  }, [activeTab, authLoading, user, isAdmin, isOPS]);

  const fetchSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const res = await fetch("/api/settings/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchCompanyDetails = async () => {
    try {
      const res = await fetch("/api/settings/company");
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setCompanyName(data.company.name || "");
          setCompanySlug(data.company.slug || "");
          setTotalCompanyUsers(data.company.totalUsers ?? null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchFileSettings = async () => {
      try {
        const res = await fetch("/api/settings/allowed-files");
        if (res.ok) {
          const data = await res.json();
          if (data.allowedExtensions && data.allowedExtensions.length > 0) {
            setSettingsFileExts(data.allowedExtensions.join(", "));
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchFileSettings();
    fetchSubscription();
    fetchCompanyDetails();
  }, []);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      showToast("Company name cannot be empty.", "error");
      return;
    }
    setUpdatingCompany(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Company details updated successfully!", "success");
        await refreshUser();
        fetchCompanyDetails();
      } else {
        showToast(data.error || "Failed to update company details", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("An error occurred updating company details.", "error");
    } finally {
      setUpdatingCompany(false);
    }
  };

  const handleUpdatePlan = async (planName: string, maxSeats: number, amount: number) => {
    setUpdatingPlan(true);
    try {
      const res = await fetch("/api/settings/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName, maxSeats, amount }),
      });
      if (res.ok) {
        showToast(`Upgraded subscription to ${planName}!`, "success");
        await fetchSubscription();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update plan", "error");
      }
    } catch {
      showToast("Error updating subscription plan", "error");
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleSaveFileRestrictions = async () => {
    if (!settingsFileExts.trim()) {
      showToast("Please enter at least one allowed file extension.", "error");
      return;
    }
    setUpdatingFileRestrictions(true);
    try {
      const extsArray = settingsFileExts.split(",").map((e) => e.trim()).filter((e) => e.length > 0);
      const res = await fetch("/api/settings/allowed-files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedExtensions: extsArray }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsFileExts(data.allowedExtensions.join(", "));
        showToast("File upload restriction policy updated successfully!", "success");
      } else {
        showToast(data.error || "Failed to update file restrictions.", "error");
      }
    } catch {
      showToast("Error updating file restrictions.", "error");
    } finally {
      setUpdatingFileRestrictions(false);
    }
  };

  // Countdown timer for email resend cooldown
  useEffect(() => {
    if (resendEmailCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendEmailCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendEmailCooldown]);

  const handleResendEmailCode = async () => {
    if (!user || resendEmailCooldown > 0) return;
    setUpdatingProfile(true);
    setEmailCodeError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, type: "profile-update" }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevPreviewUrl(data.previewUrl || "");
        setDevCode(data.devCode || "");
        showToast("Verification code resent to your email.", "success");
        setResendEmailCooldown(30); // 30s cooldown
      } else {
        setEmailCodeError(data.error || "Failed to resend verification code.");
      }
    } catch (err) {
      console.error(err);
      setEmailCodeError("Network error resending verification code.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const executeUpdateProfile = async (profileData: any) => {
    if (!user) return;
    setUpdatingProfile(true);
    try {
      const response = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        if (showEmailModal) setEmailCodeError(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred. Please try again.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleRequestEmailVerification = async () => {
    if (!user || !email || !email.includes("@")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    const skillsArray = skills.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const profileData = {
      name,
      email,          // new email — sent to backend after verification
      phone,
      bio,
      skills: skillsArray,
      socialLinks: { linkedin, twitter, github, website, instagram, facebook },
      code: ""
    };

    setUpdatingProfile(true);
    try {
      // Send the OTP to the CURRENT email to verify ownership before switching
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, type: "profile-update" }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevPreviewUrl(data.previewUrl || "");
        setDevCode(data.devCode || "");
        setPendingProfileData(profileData);
        setEmailCode("");
        setEmailCodeError("");
        setShowEmailModal(true);
        setResendEmailCooldown(30); // Start 30s cooldown initially
      } else {
        showToast(data.error || "Failed to request email verification code.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error requesting email verification code.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const skillsArray = skills.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    const profileData = {
      name,
      email,
      phone,
      bio,
      skills: skillsArray,
      socialLinks: { linkedin, twitter, github, website, instagram, facebook },
      code: ""
    };
    const emailChanged = email.toLowerCase() !== (user.email || "").toLowerCase();

    if (emailChanged) {
      await handleRequestEmailVerification();
      return;
    }
    await executeUpdateProfile(profileData);
  };

  // Password email verification states
  const [passwordStep, setPasswordStep] = useState<"details" | "verify">("details");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordDevCode, setPasswordDevCode] = useState("");
  const [passwordDevPreviewUrl, setPasswordDevPreviewUrl] = useState("");
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);

  const handleRequestPasswordCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!currentPassword) {
      showToast("Current password is required.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long.", "error");
      return;
    }

    setSendingPasswordCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, type: "profile-update" }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordDevPreviewUrl(data.previewUrl || "");
        setPasswordDevCode(data.devCode || "");
        setPasswordStep("verify");
        showToast("Verification code sent to your email address.", "success");
      } else {
        showToast(data.error || "Failed to send verification code.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to request verification code.", "error");
    } finally {
      setSendingPasswordCode(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!passwordCode || passwordCode.length !== 6) {
      showToast("Please enter the 6-digit verification code sent to your email.", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          code: passwordCode,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast("Password updated successfully!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordCode("");
        setPasswordStep("details");
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

  if (authLoading) {
    return <Preloader label="Loading Settings & Profile..." />;
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return <Preloader label="Redirecting to Login..." />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-600"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          {toast.type === "success" ? <i className="fa-solid fa-circle-check text-base" /> : <i className="fa-solid fa-circle-exclamation text-base" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <i className="fa-solid fa-user-gear text-2xl text-primary" /> Settings & Platform Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage user profile details, multi-tenant role permissions, multi-tenant isolation, and billing subscription tiers.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "profile" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-user-gear text-sm text-primary" /> User Profile
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "security" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-shield-halved text-emerald-500 text-sm" /> Password & Security
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "users" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-users-gear text-purple-500 text-sm" /> User Management
          </button>
        )}

        {(can("manageShifts") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("shifts")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "shifts" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-clock-rotate-left text-amber-500 text-sm" /> Shifts &amp; Employment Types
          </button>
        )}

        {(can("manageRolePermissions") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "permissions" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-lock text-sky-500 text-sm" /> Roles & Multi-Tenant Security
          </button>
        )}

        {(can("viewBillingSubscription") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("subscription")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "subscription" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-credit-card text-amber-500 text-sm" /> SaaS Billing & Seats
          </button>
        )}
      </div>

      {/* Active Tab Content with Smooth Transition */}
      <div key={activeTab} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out transition-all">
        {/* TAB: USER MANAGEMENT */}
        {activeTab === "users" && isAdmin && <UserManagementTab />}

        {/* TAB: SHIFTS & EMPLOYMENT TYPES */}
        {activeTab === "shifts" && (can("manageShifts") || isAdmin || isOPS) && (
          <ShiftAndStatusTab isAdmin={isAdmin || isOPS} showToast={showToast} />
        )}

      {/* TAB 1: USER PROFILE & ORGANIZATION */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Company & Organization Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-building text-primary text-lg" /> Company & Organization Profile
              </CardTitle>
              <CardDescription>
                Workspace branding and organization details for your multi-tenant environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateCompany} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-foreground">Company / Organization Name</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. NexAce Technologies"
                      disabled={user?.role !== "Admin"}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Workspace Slug</label>
                    <Input
                      value={companySlug || "workspace"}
                      disabled
                      className="font-mono text-xs bg-muted/50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <i className="fa-solid fa-users text-primary" /> Active Accounts:{" "}
                      <strong className="text-foreground font-semibold">{totalCompanyUsers ?? "..."}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <i className="fa-solid fa-shield-halved text-emerald-500" /> Isolation Mode:{" "}
                      <strong className="text-foreground font-semibold">Tenant ID Strict</strong>
                    </span>
                  </div>

                  {user?.role === "Admin" ? (
                    <Button color="primary" type="submit" disabled={updatingCompany} className="gap-2">
                      <i className="fa-solid fa-floppy-disk text-xs" /> {updatingCompany ? "Saving Company..." : "Save Company Details"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <i className="fa-solid fa-lock" /> Admin access required to update company name
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <form onSubmit={handleUpdateProfile}>
            <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-user-gear text-primary text-lg" /> Account Profile
              </CardTitle>
              <CardDescription>Update your personal information and tenant display details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Full Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Email Address</label>
                    {email.toLowerCase() !== (user?.email || "").toLowerCase() && (
                      <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                        <i className="fa-solid fa-triangle-exclamation" /> Verification Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 h-10"
                      required
                    />
                    <Button
                      type="button"
                      color="primary"
                      onClick={handleRequestEmailVerification}
                      disabled={updatingProfile || email.toLowerCase() === (user?.email || "").toLowerCase()}
                      className={cn(
                        "whitespace-nowrap text-xs h-10 px-4 shrink-0 font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60",
                        email.toLowerCase() !== (user?.email || "").toLowerCase()
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <i className="fa-solid fa-paper-plane text-xs" />{" "}
                      {updatingProfile ? "Sending..." : "Change Email"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0199" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Skills / Tags (comma-separated)</label>
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Next.js, Management" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Bio / Description</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              </div>

              {/* Social Media Profiles Section */}
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-share-nodes text-primary text-sm" />
                  <h4 className="text-sm font-bold text-foreground">Social Media Profiles</h4>
                </div>
                <p className="text-xs text-muted-foreground">Add your profile URLs or social handles to connect with your team.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-brands fa-linkedin text-sky-600 text-sm" /> LinkedIn
                    </label>
                    <Input
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-brands fa-x-twitter text-foreground text-sm" /> Twitter / X
                    </label>
                    <Input
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="https://x.com/username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-brands fa-github text-foreground text-sm" /> GitHub
                    </label>
                    <Input
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-globe text-emerald-500 text-sm" /> Personal Website
                    </label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-brands fa-instagram text-pink-500 text-sm" /> Instagram
                    </label>
                    <Input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="https://instagram.com/username"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-brands fa-facebook text-blue-600 text-sm" /> Facebook
                    </label>
                    <Input
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="https://facebook.com/username"
                    />
                  </div>
                </div>
              </div>

              <Button color="primary" type="submit" disabled={updatingProfile} className="gap-2">
                <i className="fa-solid fa-floppy-disk text-xs" /> {updatingProfile ? "Saving Details..." : "Save Profile Details"}
              </Button>
            </CardContent>
          </Card>
        </form>
        </div>
      )}

      {/* TAB 2: PASSWORD & SECURITY */}
      {activeTab === "security" && (
        <form onSubmit={passwordStep === "details" ? handleRequestPasswordCode : handleUpdatePassword}>
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-emerald-500 text-lg" /> Password & Security
              </CardTitle>
              <CardDescription>
                {passwordStep === "details"
                  ? "Modify your security credentials with 2-Step Email Verification"
                  : `Enter the 6-digit verification code sent to ${user?.email}`}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {passwordDevCode && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs space-y-1 text-amber-600 dark:text-amber-400">
                  <div className="font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-flask text-xs" /> Developer Mode (No Live SMTP Configured)
                  </div>
                  <p>
                    Verification Code: <strong className="font-mono text-sm tracking-wider text-foreground">{passwordDevCode}</strong>
                  </p>
                  {passwordDevPreviewUrl && (
                    <a
                      href={passwordDevPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline flex items-center gap-1 text-primary hover:text-primary/80"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" /> View Ethereal Email Preview
                    </a>
                  )}
                </div>
              )}

              {passwordStep === "details" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Current Password</label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                        >
                          <i className={`fa-solid ${showCurrentPassword ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">New Password</label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-16"
                          required
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => {
                              const generated = generateSecurePassword();
                              setNewPassword(generated);
                              setConfirmPassword(generated);
                              setShowNewPassword(true);
                            }}
                            className="hover:text-primary transition-colors cursor-pointer p-1"
                            title="Generate Strong Secure Password"
                          >
                            <i className="fa-solid fa-key text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="hover:text-foreground transition-colors cursor-pointer p-1"
                          >
                            <i className={`fa-solid ${showNewPassword ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                        >
                          <i className={`fa-solid ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button color="primary" type="submit" disabled={sendingPasswordCode} className="gap-2 font-semibold">
                    <i className="fa-solid fa-paper-plane text-xs" /> {sendingPasswordCode ? "Sending Code..." : "Send Verification Code"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-primary text-base" />
                    <span>A 6-digit verification code has been sent to <strong>{user?.email}</strong>. Enter it below to confirm.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-key text-muted-foreground text-xs" /> 6-Digit Email Verification Code
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={passwordCode}
                      onChange={(e) => setPasswordCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="font-mono text-center tracking-widest text-base font-bold"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button color="primary" type="submit" disabled={updatingPassword} className="gap-2 font-semibold">
                      <i className="fa-solid fa-shield-check text-xs" /> {updatingPassword ? "Verifying & Updating..." : "Verify & Change Password"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setPasswordStep("details");
                        setPasswordCode("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      )}

      {/* TAB 3: ROLES & MULTI-TENANT SECURITY */}
      {activeTab === "permissions" && (can("manageRolePermissions") || isAdmin || isOPS) && (
        <div className="space-y-6">
          <RoleDataControlTab isAdmin={user?.role === "Admin" || user?.role === "OPS"} showToast={showToast} />

          {/* Admin File Restrictions Control Panel */}
          {user?.role === "Admin" && (
            <Card className="border border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-primary text-lg" /> Drive File Extension Restriction Policy
                </CardTitle>
                <CardDescription>
                  Control allowed file extensions across Drive & HR documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Allowed File Extensions (Comma Separated)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      value={settingsFileExts}
                      onChange={(e) => setSettingsFileExts(e.target.value)}
                      placeholder="e.g. png, jpg, pdf, docx, xlsx, zip, csv"
                      className="font-mono text-sm"
                    />
                    <Button
                      color="primary"
                      type="button"
                      onClick={handleSaveFileRestrictions}
                      disabled={updatingFileRestrictions}
                      className="gap-2 font-semibold shrink-0 cursor-pointer"
                    >
                      <i className="fa-solid fa-floppy-disk text-xs" /> {updatingFileRestrictions ? "Saving..." : "Save Policy"}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Supported example formats: <code className="text-primary font-mono font-bold">png, jpg, jpeg, pdf, docx, xlsx, zip, csv, txt, svg, webp</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: SAAS BILLING & SUBSCRIPTION */}
      {activeTab === "subscription" && (can("viewBillingSubscription") || isAdmin || isOPS) && (
        <div className="space-y-6">
          {/* Current Plan Overview */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
              <div>
                <Badge color="warning" variant="soft" className="mb-1">{subscription?.status || "Active"}</Badge>
                <CardTitle className="text-xl font-bold text-foreground">
                  {subscription?.planName || "Enterprise Team Tier"}
                </CardTitle>
                <CardDescription>
                  Multi-tenant billing layer managing seat counts and SaaS renewals.
                </CardDescription>
              </div>

              <div className="text-right">
                <p className="text-2xl font-extrabold text-foreground">${subscription?.amount || 299} / mo</p>
                <p className="text-xs text-muted-foreground">
                  Renews on: {subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : "Next Month"}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Active Seats Bar */}
              <div className="p-4 bg-accent/40 rounded-xl border border-border space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <i className="fa-solid fa-users text-primary text-xs" /> Active User Seats Utilized
                  </span>
                  <span className="text-primary font-mono">
                    {subscription?.activeSeats || 1} / {subscription?.maxSeats || 100} Seats
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((subscription?.activeSeats || 1) / (subscription?.maxSeats || 100)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Tier Upgrade Options */}
              {user?.role === "Admin" && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Available SaaS Subscription Tiers</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-sm text-foreground">Standard Team</p>
                        <p className="text-xl font-extrabold text-foreground mt-1">$149 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Up to 25 seats for small agile agencies.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingPlan || subscription?.planName === "Standard Team"}
                        onClick={() => handleUpdatePlan("Standard Team", 25, 149)}
                      >
                        {subscription?.planName === "Standard Team" ? "Current Tier" : "Select Tier"}
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-3 flex flex-col justify-between">
                      <div>
                        <Badge color="primary" className="mb-1">Recommended</Badge>
                        <p className="font-bold text-sm text-foreground">Enterprise Team Tier</p>
                        <p className="text-xl font-extrabold text-foreground mt-1">$299 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Up to 100 seats with multi-tenant isolation.</p>
                      </div>
                      <Button
                        color="primary"
                        size="sm"
                        disabled={updatingPlan || subscription?.planName === "Enterprise Team Tier"}
                        onClick={() => handleUpdatePlan("Enterprise Team Tier", 100, 299)}
                      >
                        {subscription?.planName === "Enterprise Team Tier" ? "Current Tier" : "Upgrade Plan"}
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-sm text-foreground">Scale & Growth (500 Seats)</p>
                        <p className="text-xl font-extrabold text-foreground mt-1">$799 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Up to 500 seats with custom SLAs.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingPlan || subscription?.planName === "Scale & Growth (500 Seats)"}
                        onClick={() => handleUpdatePlan("Scale & Growth (500 Seats)", 500, 799)}
                      >
                        {subscription?.planName === "Scale & Growth (500 Seats)" ? "Current Tier" : "Select Tier"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>

      {/* Email Verification Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border shadow-2xl animate-in fade-in zoom-in-95">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-primary text-base" /> Verify Your Identity
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                A 6-digit verification code was sent to your <strong className="text-foreground">current email ({user?.email})</strong> to confirm this change.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailCodeError && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                  {emailCodeError}
                </div>
              )}

              {devCode && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs space-y-1 text-amber-600 dark:text-amber-400">
                  <div className="font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-flask text-xs" /> Developer Mode (No Live SMTP Configured)
                  </div>
                  <p>
                    Verification Code: <strong className="font-mono text-sm tracking-wider text-foreground">{devCode}</strong>
                  </p>
                  {devPreviewUrl && (
                    <a
                      href={devPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] underline flex items-center gap-1 text-primary hover:text-primary/80"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" /> View Ethereal Email Preview
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-key text-muted-foreground text-xs" /> 6-Digit Email Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleResendEmailCode}
                    disabled={updatingProfile || resendEmailCooldown > 0}
                    className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
                  >
                    <i className="fa-solid fa-rotate-right text-[10px]" />
                    {updatingProfile && resendEmailCooldown === 0
                      ? "Resending..."
                      : resendEmailCooldown > 0
                      ? `Resend in ${resendEmailCooldown}s`
                      : "Resend Code"}
                  </button>
                </div>
                <Input
                  type="text"
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="e.g. 123456"
                  className="font-mono text-center tracking-widest text-base font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailCode("");
                    setEmailCodeError("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={async () => {
                    if (!emailCode || emailCode.length !== 6) {
                      setEmailCodeError("Please enter the complete 6-digit verification code.");
                      return;
                    }
                    if (pendingProfileData) {
                      await executeUpdateProfile({ ...pendingProfileData, code: emailCode });
                    }
                  }}
                  disabled={updatingProfile}
                  className="gap-2 font-semibold"
                >
                  <i className="fa-solid fa-shield-halved text-xs" /> {updatingProfile ? "Verifying..." : "Verify & Save Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
