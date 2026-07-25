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
import { cn } from "@/lib/utils";

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
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
      <form onSubmit={handleUpdatePassword}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" /> Password & Security
            </CardTitle>
            <CardDescription>Modify your security credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">Current Password</label>
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button color="primary" type="submit" disabled={updatingPassword} className="gap-2">
              <KeyRound className="w-4 h-4" /> {updatingPassword ? "Updating Password..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
