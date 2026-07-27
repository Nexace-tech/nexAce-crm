"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserCog, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Mail, 
  CheckCircle, 
  AlertCircle,
  Save,
  KeyRound,
  ExternalLink
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, generateSecurePassword } from "@/lib/utils";

export default function SettingsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

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

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

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

  const handleRequestEmailVerification = async () => {
    if (!user || !email || !email.includes("@")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

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

    setUpdatingProfile(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "change-email" }),
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
        body: JSON.stringify({ email: user.email }),
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
        headers: {
          "Content-Type": "application/json",
        },
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

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading User Settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
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
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Security</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your user profile details, email address, and security authentication credentials.
        </p>
      </div>

      {/* Account Profile Section */}
      <form onSubmit={handleUpdateProfile}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" /> Account Profile
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

            <Button color="primary" type="submit" disabled={updatingProfile} className="gap-2">
              <Save className="w-4 h-4" /> {updatingProfile ? "Saving Details..." : "Save Profile Details"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Security Section */}
      <form onSubmit={passwordStep === "details" ? handleRequestPasswordCode : handleUpdatePassword}>
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Password & Security
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
                  <Mail className="w-4 h-4" /> {sendingPasswordCode ? "Sending Code..." : "Send Verification Code"}
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
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> 6-Digit Email Verification Code
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
                    <ShieldCheck className="w-4 h-4" /> {updatingPassword ? "Verifying & Updating..." : "Verify & Change Password"}
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

      {/* Email Verification Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border shadow-2xl animate-in fade-in zoom-in-95">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Verify New Email Address
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                A 6-digit verification code was sent to <strong className="text-foreground">{pendingProfileData?.email}</strong>.
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
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> 6-Digit Email Verification Code
                </label>
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
                  <ShieldCheck className="w-4 h-4" /> {updatingProfile ? "Verifying..." : "Verify & Save Email"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
