"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Preloader } from "@/components/ui/Preloader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BrokenPhotoPlaceholder, BrokenPhotoBanner } from "@/components/ui/BrokenPhotoPlaceholder";
import { cn, generateSecurePassword } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { RoleDataControlTab } from "@/components/settings/RoleDataControlTab";
import { AccessRestricted } from "@/components/ui/AccessRestricted";
import { removeSignatureBackground } from "@/lib/signature";

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { can, isAdmin, isOPS, canAccessModule, loading: permLoading } = usePermissions();

  const [activeTab, setActiveTab] = useTabPersistence<"profile" | "security" | "subscription" | "permissions" | "organization">(
    "settings_active_tab_v3",
    "profile",
    ["profile", "security", "subscription", "permissions", "organization"]
  );

  // Sync tab with URL searchParams and handle redirection for moved tabs
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return;

    if (tabParam === "all-invoices" || tabParam === "invoices") {
      const invNo = searchParams.get("invoiceNo");
      const invId = searchParams.get("invoiceId");
      router.replace(`/dashboard/finance?tab=invoices${invNo ? `&invoiceNo=${encodeURIComponent(invNo)}` : ""}${invId ? `&invoiceId=${encodeURIComponent(invId)}` : ""}`);
      return;
    }

    // Invoices and Generate My Invoice moved to Finance Portal
    if (tabParam === "self-invoices" || tabParam === "invoice") {
      router.replace("/dashboard/finance?tab=invoices");
      return;
    }

    // Users and Shifts have been moved to OPS Portal
    if (tabParam === "users" || tabParam === "shifts") {
      router.replace(`/dashboard/clients?tab=${tabParam}`);
      return;
    }

    if (["profile", "security", "subscription", "permissions", "organization"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams, router, setActiveTab]);

  // Sync tab with custom event from banners
  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail && e.detail !== activeTab && ["profile", "security", "invoice", "subscription", "permissions", "organization"].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("switch-settings-tab", handleTabSwitch);
    return () => window.removeEventListener("switch-settings-tab", handleTabSwitch);
  }, [activeTab, setActiveTab]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoBroken, setPhotoBroken] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeFileSize, setResumeFileSize] = useState<number>(0);
  const [resumeUpdatedAt, setResumeUpdatedAt] = useState<string | Date | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [showRemoveResumeModal, setShowRemoveResumeModal] = useState(false);
  const fileResumeRef = React.useRef<HTMLInputElement | null>(null);

  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");

  // Signature state
  const [signatureUrl, setSignatureUrl] = useState("");
  const [signatureSavedAt, setSignatureSavedAt] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [sigMode, setSigMode] = useState<"draw" | "type" | "upload">("draw");
  // Draw mode
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigColor] = useState("#000000");
  const [sigLineWidth, setSigLineWidth] = useState(2.5);
  const [sigBg, setSigBg] = useState<"blank" | "lined" | "grid">("lined");
  const signatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const signatureLastPos = React.useRef<{ x: number; y: number } | null>(null);
  // Type mode
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureFont, setSignatureFont] = useState("'Dancing Script', cursive");
  const [sigFontSize, setSigFontSize] = useState(72);
  const [sigFontColor] = useState("#000000");
  const typeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  // Upload mode
  const signatureUploadRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadedSigPreview, setUploadedSigPreview] = useState("");
  const [rawUploadedSig, setRawUploadedSig] = useState("");
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);
  const [processingSigImage, setProcessingSigImage] = useState(false);

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
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companyTagline, setCompanyTagline] = useState("");
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [companyEntityType, setCompanyEntityType] = useState("Private Limited Company");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyBillingEmail, setCompanyBillingEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyTollFreePhone, setCompanyTollFreePhone] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("IT & Software Services");
  const [companyCurrency, setCompanyCurrency] = useState("INR");
  const [companyTimezone, setCompanyTimezone] = useState("Asia/Kolkata (IST +05:30)");
  const [companyDateFormat, setCompanyDateFormat] = useState("YYYY-MM-DD");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyCity, setCompanyCity] = useState("");
  const [companyState, setCompanyState] = useState("");
  const [companyCountry, setCompanyCountry] = useState("India");
  const [companyPostalCode, setCompanyPostalCode] = useState("");
  const [companyBankName, setCompanyBankName] = useState("");
  const [companyAccountName, setCompanyAccountName] = useState("");
  const [companyAccountNo, setCompanyAccountNo] = useState("");
  const [companyIfscCode, setCompanyIfscCode] = useState("");
  const [companyBranch, setCompanyBranch] = useState("");
  const [companyUpiId, setCompanyUpiId] = useState("");
  const [companyLinkedin, setCompanyLinkedin] = useState("");
  const [companyTwitter, setCompanyTwitter] = useState("");
  const [companyGithub, setCompanyGithub] = useState("");
  const [companyFacebook, setCompanyFacebook] = useState("");
  const [companyYoutube, setCompanyYoutube] = useState("");

  // ── Organization Signature (Admin/OPS only) ──
  const [companySignatureUrl, setCompanySignatureUrl] = useState("");
  const [companySignatureSavedAt, setCompanySignatureSavedAt] = useState<string | null>(null);
  const [showOrgSignaturePad, setShowOrgSignaturePad] = useState(false);
  const [savingOrgSignature, setSavingOrgSignature] = useState(false);
  const [orgSigMode, setOrgSigMode] = useState<"draw" | "type" | "upload">("draw");
  const [orgIsDrawing, setOrgIsDrawing] = useState(false);
  const [orgSigLineWidth, setOrgSigLineWidth] = useState(2.5);
  const [orgSigBg, setOrgSigBg] = useState<"blank" | "lined" | "grid">("lined");
  const orgSignatureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const orgSignatureLastPos = React.useRef<{ x: number; y: number } | null>(null);
  const [orgTypedSignature, setOrgTypedSignature] = useState("");
  const [orgSignatureFont, setOrgSignatureFont] = useState("'Dancing Script', cursive");
  const [orgSigFontSize, setOrgSigFontSize] = useState(72);
  const orgSignatureUploadRef = React.useRef<HTMLInputElement | null>(null);
  const [orgUploadedSigPreview, setOrgUploadedSigPreview] = useState("");
  const [orgRawUploadedSig, setOrgRawUploadedSig] = useState("");
  const [orgAutoRemoveBg, setOrgAutoRemoveBg] = useState(true);
  const [orgProcessingSigImage, setOrgProcessingSigImage] = useState(false);

  const [totalCompanyUsers, setTotalCompanyUsers] = useState<number | null>(null);
  const [updatingCompany, setUpdatingCompany] = useState(false);
  const [uploadingCompanyLogo, setUploadingCompanyLogo] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const companyLogoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [showRemovePhotoModal, setShowRemovePhotoModal] = useState(false);
  const [isHRIsoActive, setIsHRIsoActive] = useState<boolean>(false);
  const [togglingHRIso, setTogglingHRIso] = useState<boolean>(false);

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
      setBankName(user.bankDetails?.bankName || "");
      setAccountNo(user.bankDetails?.accountNo || "");
      setIfscCode(user.bankDetails?.ifscCode || "");
      setUpiId(user.bankDetails?.upiId || "");
      setResumeUrl(user.resumeUrl || "");
      setResumeFileName(user.resumeFileName || "");
      setResumeFileSize(user.resumeFileSize || 0);
      setResumeUpdatedAt(user.resumeUpdatedAt || null);
      // Only load user-level signature for non-admin/non-OPS users
      if (user.role?.toLowerCase() !== "admin" && user.role?.toLowerCase() !== "ops") {
        setSignatureUrl((user as any).signatureUrl || "");
        setSignatureSavedAt((user as any).signatureUrl ? ((user as any).updatedAt ? new Date((user as any).updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Saved") : null);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      if (activeTab === "organization" && !isAdmin && !isOPS) {
        setActiveTab("profile");
      }
      if (activeTab === "permissions" && !can("manageRolePermissions") && !isAdmin) {
        setActiveTab("profile");
      }
      if (activeTab === "subscription" && !can("viewBillingSubscription") && !isAdmin) {
        setActiveTab("profile");
      }
    }
  }, [activeTab, authLoading, user, isAdmin, isOPS, can]);

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
          const c = data.company;
          setCompanyName(c.name || "");
          setCompanySlug(c.slug || "");
          setCompanyLogoUrl(c.logoUrl || "");
          setCompanyTagline(c.tagline || "");
          setCompanyLegalName(c.legalName || "");
          setCompanyRegistrationNumber(c.registrationNumber || "");
          setCompanyEntityType(c.entityType || "Private Limited Company");
          setCompanyEmail(c.email || "");
          setCompanyBillingEmail(c.billingEmail || "");
          setCompanyPhone(c.phone || "");
          setCompanyTollFreePhone(c.tollFreePhone || "");
          setCompanyWebsite(c.website || "");
          setCompanyTaxId(c.taxId || "");
          setCompanyIndustry(c.industry || "IT & Software Services");
          setCompanyCurrency(c.currency || "INR");
          setCompanyTimezone(c.timezone || "Asia/Kolkata (IST +05:30)");
          setCompanyDateFormat(c.dateFormat || "YYYY-MM-DD");
          setCompanyAddress(c.address || "");
          setCompanyCity(c.city || "");
          setCompanyState(c.state || "");
          setCompanyCountry(c.country || "India");
          setCompanyPostalCode(c.postalCode || "");
          setCompanyBankName(c.bankDetails?.bankName || "");
          setCompanyAccountName(c.bankDetails?.accountName || "");
          setCompanyAccountNo(c.bankDetails?.accountNo || "");
          setCompanyIfscCode(c.bankDetails?.ifscCode || "");
          setCompanyBranch(c.bankDetails?.branch || "");
          setCompanyUpiId(c.bankDetails?.upiId || "");
          setCompanyLinkedin(c.socialLinks?.linkedin || "");
          setCompanyTwitter(c.socialLinks?.twitter || "");
          setCompanyGithub(c.socialLinks?.github || "");
          setCompanyFacebook(c.socialLinks?.facebook || "");
          setCompanyYoutube(c.socialLinks?.youtube || "");
          setTotalCompanyUsers(c.totalUsers ?? null);
          setCompanySignatureUrl(c.signatureUrl || "");
          setCompanySignatureSavedAt(c.signatureUrl ? new Date(c.updatedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null);
        }
      }
      try {
        const hrRes = await fetch("/api/settings/hr-isolation");
        if (hrRes.ok) {
          const hrData = await hrRes.json();
          setIsHRIsoActive(Boolean(hrData.isolateHRData));
        }
      } catch {
        // quiet fallback
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleHRIso = async () => {
    try {
      setTogglingHRIso(true);
      const nextVal = !isHRIsoActive;
      const res = await fetch("/api/settings/hr-isolation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isolateHRData: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update Multi-HR isolation");
      setIsHRIsoActive(nextVal);
      showToast(data.message || (nextVal ? "Multi-HR Data Isolation enabled" : "Multi-HR Data Isolation disabled"), "success");
    } catch (err: any) {
      showToast(err.message || "Failed to toggle Multi-HR isolation", "error");
    } finally {
      setTogglingHRIso(false);
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

  const handleCopySlug = () => {
    if (!companySlug) return;
    navigator.clipboard.writeText(companySlug);
    setCopiedSlug(true);
    showToast(`Workspace slug "${companySlug}" copied to clipboard!`, "success");
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const handleUploadCompanyLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please upload a valid image file (PNG, JPG, SVG, WebP).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Logo image size should be less than 5MB.", "error");
      return;
    }

    setUploadingCompanyLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCompanyLogoUrl(base64);
      setUploadingCompanyLogo(false);
      showToast("Company logo updated! Click 'Save Company Details' to persist.", "success");
    };
    reader.onerror = () => {
      setUploadingCompanyLogo(false);
      showToast("Failed to process logo file.", "error");
    };
    reader.readAsDataURL(file);
  };

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
        body: JSON.stringify({
          name: companyName,
          logoUrl: companyLogoUrl,
          tagline: companyTagline,
          legalName: companyLegalName,
          registrationNumber: companyRegistrationNumber,
          entityType: companyEntityType,
          email: companyEmail,
          billingEmail: companyBillingEmail,
          phone: companyPhone,
          tollFreePhone: companyTollFreePhone,
          website: companyWebsite,
          taxId: companyTaxId,
          industry: companyIndustry,
          currency: companyCurrency,
          timezone: companyTimezone,
          dateFormat: companyDateFormat,
          address: companyAddress,
          city: companyCity,
          state: companyState,
          country: companyCountry,
          postalCode: companyPostalCode,
          bankDetails: {
            bankName: companyBankName,
            accountName: companyAccountName,
            accountNo: companyAccountNo,
            ifscCode: companyIfscCode,
            branch: companyBranch,
            upiId: companyUpiId,
          },
          socialLinks: {
            linkedin: companyLinkedin,
            twitter: companyTwitter,
            github: companyGithub,
            facebook: companyFacebook,
            youtube: companyYoutube,
          },
          signatureUrl: companySignatureUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Company & organization details saved successfully!", "success");
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

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (PNG, JPG, WebP, GIF).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Profile image must be smaller than 5MB.", "error");
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/team/upload-photo", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.photoUrl) {
        throw new Error(uploadData.error || "Failed to upload photo");
      }

      // Save photoUrl to user profile
      const updateRes = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: uploadData.photoUrl }),
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || "Failed to update profile picture");
      }

      await refreshUser();
      showToast("Profile picture updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload profile photo", "error");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !user.photoUrl) return;

    setUploadingPhoto(true);
    try {
      const updateRes = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: "" }),
      });

      if (!updateRes.ok) {
        const updateData = await updateRes.json();
        throw new Error(updateData.error || "Failed to remove profile picture");
      }

      await refreshUser();
      setShowRemovePhotoModal(false);
      showToast("Profile photo removed.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to remove profile photo", "error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const formatResumeBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleUploadResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      showToast("Please upload a valid document (PDF, DOC, or DOCX).", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Resume file must be smaller than 10MB.", "error");
      return;
    }

    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/team/upload-resume", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload resume");
      }

      setResumeUrl(data.resumeUrl);
      setResumeFileName(data.resumeFileName);
      setResumeFileSize(data.resumeFileSize);
      setResumeUpdatedAt(data.resumeUpdatedAt);

      await refreshUser();
      showToast("Resume uploaded successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload resume", "error");
    } finally {
      setUploadingResume(false);
      if (fileResumeRef.current) fileResumeRef.current.value = "";
    }
  };

  const handleRemoveResume = async () => {
    if (!user) return;

    setUploadingResume(true);
    try {
      const res = await fetch("/api/team/upload-resume", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove resume");
      }

      setResumeUrl("");
      setResumeFileName("");
      setResumeFileSize(0);
      setResumeUpdatedAt(null);

      await refreshUser();
      setShowRemoveResumeModal(false);
      showToast("Resume removed successfully.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to remove resume", "error");
    } finally {
      setUploadingResume(false);
    }
  };

  const executeUpdateProfile = async (profileData: any) => {
    if (!user) return;
    // Capture final canvas signature if pad is open
    let finalSig = signatureUrl;
    if (showSignaturePad && signatureCanvasRef.current) {
      finalSig = signatureCanvasRef.current.toDataURL("image/png");
      setSignatureUrl(finalSig);
    }
    setUpdatingProfile(true);
    try {
      const response = await fetch(`/api/team/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profileData, signatureUrl: finalSig }),
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
    let finalSig = signatureUrl;
    if (showSignaturePad && signatureCanvasRef.current) {
      finalSig = signatureCanvasRef.current.toDataURL("image/png");
      setSignatureUrl(finalSig);
    }
    const profileData = {
      name,
      email,          // new email — sent to backend after verification
      phone,
      bio,
      skills: skillsArray,
      signatureUrl: finalSig,
      socialLinks: { linkedin, twitter, github, website, instagram, facebook },
      bankDetails: {
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: upiId.trim(),
      },
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
    let finalSig = signatureUrl;
    if (showSignaturePad && signatureCanvasRef.current) {
      finalSig = signatureCanvasRef.current.toDataURL("image/png");
      setSignatureUrl(finalSig);
    }
    const profileData = {
      name,
      email,
      phone,
      bio,
      skills: skillsArray,
      signatureUrl: finalSig,
      socialLinks: { linkedin, twitter, github, website, instagram, facebook },
      bankDetails: {
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        upiId: upiId.trim(),
      },
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
  const [resendPasswordCooldown, setResendPasswordCooldown] = useState(0);

  // Countdown timer for password email resend cooldown
  useEffect(() => {
    if (resendPasswordCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendPasswordCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendPasswordCooldown]);

  const handleResendPasswordCode = async () => {
    if (!user || resendPasswordCooldown > 0) return;
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
        showToast("Verification code resent to your email.", "success");
        setResendPasswordCooldown(30); // 30s cooldown
      } else {
        showToast(data.error || "Failed to resend verification code.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error resending verification code.", "error");
    } finally {
      setSendingPasswordCode(false);
    }
  };

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
        setResendPasswordCooldown(30); // Start 30s cooldown
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
        await refreshUser();
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

  if (!permLoading && !canAccessModule("settings")) {
    return <AccessRestricted moduleName="Settings" icon="fa-solid fa-gear" />;
  }

  return (
    <div className="space-y-6 w-full">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-[99999] px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
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
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 mt-0.5">
          <i className="fa-solid fa-user-gear text-lg" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Settings & Platform Administration
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage user profile details, multi-tenant role permissions, multi-tenant isolation, and billing subscription tiers.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 dark:bg-muted/20 rounded-xl border border-border/80 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 sm:shrink",
            activeTab === "profile"
              ? "bg-background text-primary shadow-xs font-bold border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <i className="fa-solid fa-user-gear text-sm text-primary" /> User Profile
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={cn(
            "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 sm:shrink",
            activeTab === "security"
              ? "bg-background text-primary shadow-xs font-bold border border-border"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <i className="fa-solid fa-shield-halved text-emerald-500 text-sm" /> Password &amp; Security
        </button>

        {(isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("organization")}
            className={cn(
              "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 sm:shrink",
              activeTab === "organization"
                ? "bg-background text-primary shadow-xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className="fa-solid fa-building text-sky-500 text-sm" /> Organization Details
          </button>
        )}


        {(can("manageRoles") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("permissions")}
            className={cn(
              "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 sm:shrink",
              activeTab === "permissions"
                ? "bg-background text-primary shadow-xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className="fa-solid fa-shield-halved text-rose-500 text-sm" /> Permissions
          </button>
        )}

        {(can("manageBilling") || isAdmin || isOPS) && (
          <button
            onClick={() => setActiveTab("subscription")}
            className={cn(
              "px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 sm:shrink",
              activeTab === "subscription"
                ? "bg-background text-primary shadow-xs font-bold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className="fa-solid fa-credit-card text-emerald-500 text-sm" /> Subscription &amp; Plan
          </button>
        )}
      </div>

      {/* Active Tab Content with Smooth Transition */}
      <div key={activeTab} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out transition-all">
        {/* TAB: ORGANIZATION DETAILS (Admin & OPS only) */}
        {activeTab === "organization" && (isAdmin || isOPS) && (
          <div className="space-y-6">
            {/* Enhanced Company & Organization Details Card */}
            <Card className="border border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 border-b border-border/60 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold flex items-center gap-2.5 text-foreground">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <i className="fa-solid fa-building text-base" />
                    </div>
                    Company &amp; Organization Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Enterprise workspace branding, legal registration, corporate headquarters, and remittance configuration
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-muted-foreground shadow-2xs">
                    <i className="fa-solid fa-shield-check text-emerald-500" />
                    <span>Isolation:</span>
                    <strong className="text-foreground font-semibold">Tenant Strict</strong>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-muted-foreground shadow-2xs">
                    <i className="fa-solid fa-users text-primary" />
                    <span>Users:</span>
                    <strong className="text-foreground font-semibold">{totalCompanyUsers ?? "..."}</strong>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleUpdateCompany} className="space-y-8">
                {/* BRAND IDENTITY & LOGO HERO BANNER */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-muted/30 to-background border border-border/80 flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Logo Display & Uploader */}
                  <div className="relative group shrink-0">
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleUploadCompanyLogo}
                      className="hidden"
                    />
                    
                    <div
                      onClick={() => companyLogoInputRef.current?.click()}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-primary/40 bg-background flex flex-col items-center justify-center cursor-pointer overflow-hidden relative shadow-sm hover:border-primary transition-all group/logo"
                      title="Click to upload or update company logo"
                    >
                      {companyLogoUrl ? (
                        <img
                          src={companyLogoUrl}
                          alt={companyName || "Company Logo"}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground text-center p-2">
                          <i className="fa-solid fa-building-circle-arrow-right text-2xl text-primary/70 mb-1 group-hover/logo:scale-110 transition-transform" />
                          <span className="text-[10px] font-semibold text-primary">Upload Logo</span>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 backdrop-blur-2xs">
                        <i className="fa-solid fa-cloud-arrow-up text-sm" />
                        <span>Change</span>
                      </div>

                      {uploadingCompanyLogo && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white">
                          <i className="fa-solid fa-spinner fa-spin text-lg text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Brand Overview & Quick Actions */}
                  <div className="flex-1 text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
                          {companyName || "Organization Name"}
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                            {companyIndustry}
                          </Badge>
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {companyTagline || "Set your organization's official mission tagline and brand identity"}
                        </p>
                      </div>

                      {/* Copy Workspace Slug Badge */}
                      <div className="flex items-center justify-center md:justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopySlug}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-lg bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
                          title="Click to copy workspace identifier"
                        >
                          <i className={cn("text-xs", copiedSlug ? "fa-solid fa-check text-emerald-500" : "fa-solid fa-copy text-primary")} />
                          <span>{companySlug || "workspace"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => companyLogoInputRef.current?.click()}
                        className="gap-2 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer shadow-xs"
                      >
                        <i className="fa-solid fa-cloud-arrow-up text-xs" />
                        {companyLogoUrl ? "Change Logo" : "Upload Brand Logo"}
                      </Button>

                      {companyLogoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCompanyLogoUrl("")}
                          className="gap-1.5 text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-200 dark:border-rose-900/40 cursor-pointer"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                          Remove
                        </Button>
                      )}

                      <span className="text-[11px] text-muted-foreground italic ml-1">
                        Recommended: Transparent PNG or SVG (square or horizontal, max 5MB)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. GENERAL IDENTITY & BRANDING */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/70">
                    <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center text-sky-500 text-xs">
                      <i className="fa-solid fa-id-card" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      1. Organization Identity &amp; Branding
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Company / Organization Display Name *</label>
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. NexAce Technologies Pvt Ltd"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Workspace Identifier (Slug)</label>
                      <Input
                        value={companySlug || "workspace"}
                        disabled
                        className="font-mono text-xs bg-muted/50 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Organization Tagline / Mission</label>
                      <Input
                        value={companyTagline}
                        onChange={(e) => setCompanyTagline(e.target.value)}
                        placeholder="e.g. Empowering Modern Digital Transformation & Enterprise Intelligence"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Entity Legal Type</label>
                      <select
                        value={companyEntityType}
                        onChange={(e) => setCompanyEntityType(e.target.value)}
                        className="w-full h-9.5 px-3 text-xs bg-background border border-default-200 rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer font-medium"
                      >
                        <option value="Private Limited Company">Private Limited Company (Pvt Ltd)</option>
                        <option value="Public Limited Company">Public Limited Company (Ltd)</option>
                        <option value="Limited Liability Company">Limited Liability Company (LLC)</option>
                        <option value="Corporation">Corporation (Inc. / Corp.)</option>
                        <option value="Partnership / LLP">Partnership / LLP</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Non-Profit / NGO">Non-Profit / NGO</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Industry Vertical</label>
                      <select
                        value={companyIndustry}
                        onChange={(e) => setCompanyIndustry(e.target.value)}
                        className="w-full h-9.5 px-3 text-xs bg-background border border-default-200 rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer font-medium"
                      >
                        <option value="IT & Software Services">IT &amp; Software Services</option>
                        <option value="Consulting & Advisory">Consulting &amp; Advisory</option>
                        <option value="Finance & Banking">Finance &amp; Banking</option>
                        <option value="Healthcare & Life Sciences">Healthcare &amp; Life Sciences</option>
                        <option value="Real Estate & Infrastructure">Real Estate &amp; Infrastructure</option>
                        <option value="Manufacturing & Logistics">Manufacturing &amp; Logistics</option>
                        <option value="E-Commerce & Retail">E-Commerce &amp; Retail</option>
                        <option value="Education & EdTech">Education &amp; EdTech</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Official Website URL</label>
                      <Input
                        type="url"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="e.g. https://nexace.com"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. OFFICIAL COMMUNICATIONS & CONTACT */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/70">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs">
                      <i className="fa-solid fa-headset" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      2. Communication &amp; Contact Channels
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Primary Corporate Email</label>
                      <Input
                        type="email"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="e.g. contact@nexace.com"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Dedicated Billing &amp; Invoices Email</label>
                      <Input
                        type="email"
                        value={companyBillingEmail}
                        onChange={(e) => setCompanyBillingEmail(e.target.value)}
                        placeholder="e.g. finance@nexace.com"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Primary Phone Number</label>
                      <Input
                        type="tel"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Toll-Free / Support Hotline</label>
                      <Input
                        type="tel"
                        value={companyTollFreePhone}
                        onChange={(e) => setCompanyTollFreePhone(e.target.value)}
                        placeholder="e.g. 1800-123-4567"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. HEADQUARTERS & REGIONAL PREFERENCES */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/70">
                    <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-500 text-xs">
                      <i className="fa-solid fa-location-dot" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      3. Headquarters &amp; Regional Settings
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 sm:col-span-2 md:col-span-4">
                      <label className="text-xs font-semibold text-foreground">Registered Office / Street Address</label>
                      <Input
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="e.g. 100 Innovation Way, Suite 400, Tech Park Phase 2"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">City</label>
                      <Input
                        type="text"
                        value={companyCity}
                        onChange={(e) => setCompanyCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">State / Province</label>
                      <Input
                        type="text"
                        value={companyState}
                        onChange={(e) => setCompanyState(e.target.value)}
                        placeholder="e.g. Karnataka"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Country</label>
                      <Input
                        type="text"
                        value={companyCountry}
                        onChange={(e) => setCompanyCountry(e.target.value)}
                        placeholder="e.g. India"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Postal / Zip Code</label>
                      <Input
                        type="text"
                        value={companyPostalCode}
                        onChange={(e) => setCompanyPostalCode(e.target.value)}
                        placeholder="e.g. 560100"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Operating Timezone</label>
                      <select
                        value={companyTimezone}
                        onChange={(e) => setCompanyTimezone(e.target.value)}
                        className="w-full h-9.5 px-3 text-xs bg-background border border-default-200 rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer font-medium"
                      >
                        <option value="Asia/Kolkata (IST +05:30)">Asia/Kolkata (IST +05:30)</option>
                        <option value="America/New_York (EST -05:00)">America/New_York (EST -05:00)</option>
                        <option value="America/Los_Angeles (PST -08:00)">America/Los_Angeles (PST -08:00)</option>
                        <option value="America/Chicago (CST -06:00)">America/Chicago (CST -06:00)</option>
                        <option value="Europe/London (GMT +00:00)">Europe/London (GMT +00:00)</option>
                        <option value="Europe/Paris (CET +01:00)">Europe/Paris (CET +01:00)</option>
                        <option value="Asia/Dubai (GST +04:00)">Asia/Dubai (GST +04:00)</option>
                        <option value="Asia/Singapore (SGT +08:00)">Asia/Singapore (SGT +08:00)</option>
                        <option value="Australia/Sydney (AEST +10:00)">Australia/Sydney (AEST +10:00)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Standard Date Format</label>
                      <select
                        value={companyDateFormat}
                        onChange={(e) => setCompanyDateFormat(e.target.value)}
                        className="w-full h-9.5 px-3 text-xs bg-background border border-default-200 rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer font-medium"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-01)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 01/09/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/01/2026)</option>
                        <option value="DD MMM YYYY">DD MMM YYYY (e.g. 01 Sep 2026)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. LEGAL ENTITY & TAX REGISTRATIONS */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/70">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs">
                      <i className="fa-solid fa-gavel" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      4. Legal Entity &amp; Tax Registrations
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Legal Registered Name</label>
                      <Input
                        type="text"
                        value={companyLegalName}
                        onChange={(e) => setCompanyLegalName(e.target.value)}
                        placeholder="e.g. NexAce Technologies Private Limited"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Corporate Registration / CIN No.</label>
                      <Input
                        type="text"
                        value={companyRegistrationNumber}
                        onChange={(e) => setCompanyRegistrationNumber(e.target.value)}
                        placeholder="e.g. U72200KA2024PTC123456"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Tax ID / GSTIN / VAT Registration No.</label>
                      <Input
                        type="text"
                        value={companyTaxId}
                        onChange={(e) => setCompanyTaxId(e.target.value)}
                        placeholder="e.g. 29ABCDE1234F1Z5"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground">Base Accounting Currency</label>
                      <select
                        value={companyCurrency}
                        onChange={(e) => setCompanyCurrency(e.target.value)}
                        className="w-full h-9.5 px-3 text-xs bg-background border border-default-200 rounded-md text-foreground focus:outline-none focus:border-primary cursor-pointer font-medium"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                        <option value="AED">AED (Dh - UAE Dirham)</option>
                        <option value="CAD">CAD (C$ - Canadian Dollar)</option>
                        <option value="AUD">AUD (A$ - Australian Dollar)</option>
                        <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 5. REMITTANCE & BANK DETAILS */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/70">
                    <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-xs">
                      <i className="fa-solid fa-building-columns" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        5. Remittance &amp; Bank Details (Auto-Synced with Client Invoices)
                      </h4>
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        Printed on invoice receipts &amp; wire transfers
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Beneficiary / Account Name</label>
                      <Input
                        type="text"
                        value={companyAccountName}
                        onChange={(e) => setCompanyAccountName(e.target.value)}
                        placeholder="e.g. NexAce Technologies Pvt Ltd"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Bank Name</label>
                      <Input
                        type="text"
                        value={companyBankName}
                        onChange={(e) => setCompanyBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank Ltd"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Account Number</label>
                      <Input
                        type="text"
                        value={companyAccountNo}
                        onChange={(e) => setCompanyAccountNo(e.target.value)}
                        placeholder="e.g. 50200012345678"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">IFSC / SWIFT / BIC Code</label>
                      <Input
                        type="text"
                        value={companyIfscCode}
                        onChange={(e) => setCompanyIfscCode(e.target.value)}
                        placeholder="e.g. HDFC0000123"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Branch / Location</label>
                      <Input
                        type="text"
                        value={companyBranch}
                        onChange={(e) => setCompanyBranch(e.target.value)}
                        placeholder="e.g. Koramangala 4th Block, Bengaluru"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">UPI / Instant Payment ID (VPA)</label>
                      <Input
                        type="text"
                        value={companyUpiId}
                        onChange={(e) => setCompanyUpiId(e.target.value)}
                        placeholder="e.g. nexace@hdfcbank"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. ORGANIZATION DIGITAL SIGNATURE */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/70">
                    <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center text-violet-500 text-xs">
                      <i className="fa-solid fa-signature" />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      6. Official Organization Signature
                    </h4>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline ml-auto">
                      Auto-applied to invoices &amp; official documents
                    </span>
                  </div>

                  {/* Load handwriting Google Fonts */}
                  <link rel="preconnect" href="https://fonts.googleapis.com" />
                  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Caveat:wght@700&family=Sacramento&family=Great+Vibes&display=swap" />

                  <div className="rounded-2xl overflow-hidden border border-border/80 shadow-sm">
                    <div className="bg-gradient-to-r from-violet-500/8 via-primary/4 to-transparent px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-border/60">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0">
                          <i className="fa-solid fa-file-signature text-base" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Organization Signature
                            {companySignatureUrl && !showOrgSignaturePad && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                                <i className="fa-solid fa-shield-check text-[9px]" /> Active
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {companySignatureUrl && companySignatureSavedAt ? `Last updated ${companySignatureSavedAt} · Used on all invoices & documents` : "Draw, type, or upload the authorized signatory's signature"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {companySignatureUrl && !showOrgSignaturePad && (
                          <a href={companySignatureUrl} download="org-signature.png"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs">
                            <i className="fa-solid fa-arrow-down-to-line text-xs text-primary" /> Download
                          </a>
                        )}
                        <Button type="button" size="sm"
                          variant={showOrgSignaturePad ? "outline" : "default"}
                          onClick={() => {
                            setShowOrgSignaturePad((v) => !v);
                            if (!showOrgSignaturePad && companySignatureUrl && orgSigMode === "draw") {
                              setTimeout(() => {
                                const canvas = orgSignatureCanvasRef.current;
                                if (!canvas) return;
                                const ctx = canvas.getContext("2d");
                                if (!ctx) return;
                                const img = new Image();
                                img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
                                img.src = companySignatureUrl;
                              }, 60);
                            }
                          }}
                          className="gap-2 text-xs h-8 font-semibold cursor-pointer">
                          <i className={`fa-solid ${showOrgSignaturePad ? "fa-xmark" : (companySignatureUrl ? "fa-pen-to-square" : "fa-pen-nib")} text-xs`} />
                          {showOrgSignaturePad ? "Cancel" : companySignatureUrl ? "Edit" : "Add Signature"}
                        </Button>
                        {companySignatureUrl && (
                          <Button type="button" size="sm" variant="outline"
                            onClick={async () => {
                              setCompanySignatureUrl(""); setCompanySignatureSavedAt(null);
                              setShowOrgSignaturePad(false); setOrgUploadedSigPreview(""); setOrgRawUploadedSig(""); setOrgTypedSignature("");
                              await fetch("/api/settings/company", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: companyName, signatureUrl: "" }) });
                              showToast("Organization signature removed.", "success");
                            }}
                            className="gap-1.5 text-xs h-8 text-rose-500 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer">
                            <i className="fa-solid fa-trash-can text-xs" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Saved org signature preview */}
                    {companySignatureUrl && !showOrgSignaturePad && (
                      <div className="px-5 py-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/3 via-background to-background">
                        <div className="inline-flex flex-col items-start gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Organization Signature</span>
                          <div className="p-4 sm:p-5 rounded-xl bg-white text-zinc-950 border border-border/60 shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #64748b 27px, #64748b 28px)", backgroundPosition: "0 12px" }} />
                            <img src={companySignatureUrl} alt="Organization signature" className="relative max-h-24 max-w-[280px] sm:max-w-sm object-contain" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!companySignatureUrl && !showOrgSignaturePad && (
                      <div className="px-5 py-6 flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/40 mb-1">
                          <i className="fa-solid fa-file-signature text-2xl" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">No organization signature yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Add the authorized signatory's signature to auto-apply it to all invoices and official documents.</p>
                        <Button type="button" size="sm" onClick={() => setShowOrgSignaturePad(true)} className="gap-2 text-xs mt-2 cursor-pointer">
                          <i className="fa-solid fa-plus text-xs" /> Add Signature
                        </Button>
                      </div>
                    )}

                    {/* ═══ Org Signature Editor ═══ */}
                    {showOrgSignaturePad && (
                      <div className="p-4 sm:p-5 space-y-5">
                        {/* Mode tabs */}
                        <div className="flex gap-0 rounded-xl overflow-hidden border border-border bg-muted/30 w-fit text-xs font-semibold">
                          {(["draw", "type", "upload"] as const).map((m) => (
                            <button key={m} type="button" onClick={() => setOrgSigMode(m)}
                              className={cn(
                                "flex items-center gap-1.5 px-4 py-2 transition-all cursor-pointer border-r border-border last:border-r-0",
                                orgSigMode === m ? "bg-primary text-primary-foreground shadow-inner" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                              )}>
                              <i className={`fa-solid ${ m === "draw" ? "fa-pen-nib" : m === "type" ? "fa-font" : "fa-image" } text-[11px]`} />
                              {m === "draw" ? "Draw" : m === "type" ? "Type" : "Upload"}
                            </button>
                          ))}
                        </div>

                        {/* ── DRAW MODE ── */}
                        {orgSigMode === "draw" && (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/70 text-foreground border border-border/60">
                                <span className="w-2.5 h-2.5 rounded-full bg-black ring-1 ring-border" /> Black Ink
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size</label>
                                <div className="flex items-center gap-1.5">
                                  {[1.2, 2.5, 4, 6].map((w) => (
                                    <button key={w} type="button" onClick={() => setOrgSigLineWidth(w)}
                                      className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer", orgSigLineWidth === w ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-background")}>
                                      <div style={{ width: Math.min(w * 3, 18), height: Math.min(w, 4), backgroundColor: "#000000", borderRadius: 99 }} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paper</label>
                                <div className="flex gap-1">
                                  {(["blank", "lined", "grid"] as const).map((bg) => (
                                    <button key={bg} type="button" onClick={() => setOrgSigBg(bg)}
                                      className={cn("px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer capitalize", orgSigBg === bg ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50 bg-background")}>
                                      {bg}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="relative rounded-xl overflow-hidden border-2 border-border/60 shadow-inner touch-none select-none"
                              style={{
                                background: orgSigBg === "lined"
                                  ? "repeating-linear-gradient(white, white 27px, #e2e8f0 27px, #e2e8f0 28px)"
                                  : orgSigBg === "grid"
                                  ? "repeating-linear-gradient(white, white 27px, #e2e8f0 27px, #e2e8f0 28px), repeating-linear-gradient(90deg, white, white 27px, #e2e8f0 27px, #e2e8f0 28px)"
                                  : "white",
                              }}>
                              <canvas ref={orgSignatureCanvasRef} width={800} height={200}
                                className="w-full h-[170px] sm:h-[200px] cursor-crosshair block"
                                style={{ touchAction: "none", background: "transparent" }}
                                onMouseDown={(e) => {
                                  const canvas = orgSignatureCanvasRef.current; if (!canvas) return;
                                  setOrgIsDrawing(true);
                                  const rect = canvas.getBoundingClientRect();
                                  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                                  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                                  orgSignatureLastPos.current = { x, y };
                                  const ctx = canvas.getContext("2d"); if (!ctx) return;
                                  ctx.beginPath(); ctx.moveTo(x, y);
                                  ctx.strokeStyle = "#000000"; ctx.lineWidth = orgSigLineWidth;
                                  ctx.lineCap = "round"; ctx.lineJoin = "round";
                                }}
                                onMouseMove={(e) => {
                                  if (!orgIsDrawing || !orgSignatureLastPos.current) return;
                                  const canvas = orgSignatureCanvasRef.current; if (!canvas) return;
                                  const ctx = canvas.getContext("2d"); if (!ctx) return;
                                  const rect = canvas.getBoundingClientRect();
                                  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                                  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                                  ctx.lineTo(x, y); ctx.stroke();
                                  orgSignatureLastPos.current = { x, y };
                                }}
                                onMouseUp={() => { setOrgIsDrawing(false); orgSignatureLastPos.current = null; }}
                                onMouseLeave={() => { setOrgIsDrawing(false); orgSignatureLastPos.current = null; }}
                                onTouchStart={(e) => {
                                  e.preventDefault();
                                  const canvas = orgSignatureCanvasRef.current; if (!canvas) return;
                                  setOrgIsDrawing(true);
                                  const t = e.touches[0]; const rect = canvas.getBoundingClientRect();
                                  const x = (t.clientX - rect.left) * (canvas.width / rect.width);
                                  const y = (t.clientY - rect.top) * (canvas.height / rect.height);
                                  orgSignatureLastPos.current = { x, y };
                                  const ctx = canvas.getContext("2d"); if (!ctx) return;
                                  ctx.beginPath(); ctx.moveTo(x, y);
                                  ctx.strokeStyle = "#000000"; ctx.lineWidth = orgSigLineWidth;
                                  ctx.lineCap = "round"; ctx.lineJoin = "round";
                                }}
                                onTouchMove={(e) => {
                                  e.preventDefault();
                                  if (!orgIsDrawing || !orgSignatureLastPos.current) return;
                                  const canvas = orgSignatureCanvasRef.current; if (!canvas) return;
                                  const ctx = canvas.getContext("2d"); if (!ctx) return;
                                  const t = e.touches[0]; const rect = canvas.getBoundingClientRect();
                                  const x = (t.clientX - rect.left) * (canvas.width / rect.width);
                                  const y = (t.clientY - rect.top) * (canvas.height / rect.height);
                                  ctx.lineTo(x, y); ctx.stroke();
                                  orgSignatureLastPos.current = { x, y };
                                }}
                                onTouchEnd={(e) => { e.preventDefault(); setOrgIsDrawing(false); orgSignatureLastPos.current = null; }}
                              />
                              <div className="absolute bottom-[26%] left-5 right-5 border-t border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />
                              <span className="absolute bottom-2 left-5 text-[10px] text-slate-400 pointer-events-none select-none font-medium">Sign above this line</span>
                              <button type="button"
                                onClick={() => { const c = orgSignatureCanvasRef.current; if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height); }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:border-rose-300 transition-all cursor-pointer" title="Clear canvas">
                                <i className="fa-solid fa-eraser text-[10px]" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── TYPE MODE ── */}
                        {orgSigMode === "type" && (
                          <div className="space-y-4">
                            <div className="relative">
                              <i className="fa-solid fa-font absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs" />
                              <input type="text" value={orgTypedSignature} onChange={(e) => setOrgTypedSignature(e.target.value)}
                                placeholder="Type the signatory's full name…" maxLength={60}
                                className="w-full pl-8 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/70 text-foreground border border-border/60">
                                <span className="w-2.5 h-2.5 rounded-full bg-black ring-1 ring-border" /> Black Ink
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size</label>
                                <input type="range" min={40} max={100} value={orgSigFontSize} onChange={(e) => setOrgSigFontSize(Number(e.target.value))} className="w-24 accent-primary cursor-pointer" />
                                <span className="text-[11px] text-muted-foreground w-8">{orgSigFontSize}px</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {([
                                { label: "Dancing Script", value: "'Dancing Script', cursive" },
                                { label: "Pacifico", value: "'Pacifico', cursive" },
                                { label: "Caveat", value: "'Caveat', cursive" },
                                { label: "Sacramento", value: "'Sacramento', cursive" },
                                { label: "Great Vibes", value: "'Great Vibes', cursive" },
                              ]).map((f) => (
                                <button key={f.value} type="button" onClick={() => setOrgSignatureFont(f.value)}
                                  style={{ fontFamily: f.value }}
                                  className={cn("px-3 py-1.5 text-base rounded-xl border transition-all cursor-pointer",
                                    orgSignatureFont === f.value ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border text-foreground hover:border-primary/50 bg-background hover:bg-muted/30")}>
                                  {f.label}
                                </button>
                              ))}
                            </div>
                            <div className="relative rounded-xl border-2 border-dashed flex items-center justify-center min-h-[130px] overflow-hidden transition-all"
                              style={{ borderColor: orgTypedSignature ? "rgb(var(--primary) / 0.3)" : "rgb(var(--border) / 0.5)", background: "repeating-linear-gradient(white, white 29px, #e2e8f0 29px, #e2e8f0 30px)" }}>
                              {orgTypedSignature ? (
                                <span style={{ fontFamily: orgSignatureFont, fontSize: `${orgSigFontSize}px`, color: "#000000", lineHeight: 1.15, padding: "8px 20px", display: "block" }}>
                                  {orgTypedSignature}
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                                  <i className="fa-solid fa-i-cursor text-2xl" />
                                  <span className="text-xs">Live preview appears here</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── UPLOAD MODE ── */}
                        {orgSigMode === "upload" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">Upload a scan of the authorized signatory's handwritten signature. Background will be automatically removed.</p>
                            <input ref={orgSignatureUploadRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 4 * 1024 * 1024) { showToast("Signature image must be under 4MB.", "error"); return; }
                                setOrgProcessingSigImage(true);
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const raw = ev.target?.result as string;
                                  setOrgRawUploadedSig(raw);
                                  try {
                                    const processed = await removeSignatureBackground(raw);
                                    setOrgUploadedSigPreview(processed); setOrgAutoRemoveBg(true);
                                  } catch {
                                    setOrgUploadedSigPreview(raw);
                                  } finally { setOrgProcessingSigImage(false); }
                                };
                                reader.readAsDataURL(file);
                              }} />
                            {orgProcessingSigImage ? (
                              <div className="p-8 rounded-xl flex flex-col items-center justify-center min-h-[140px] border border-border bg-muted/20 gap-2.5">
                                <i className="fa-solid fa-spinner fa-spin text-primary text-xl" />
                                <span className="text-xs font-semibold text-foreground">Auto-removing background &amp; enhancing ink…</span>
                              </div>
                            ) : (orgUploadedSigPreview || orgRawUploadedSig) ? (
                              <div className="space-y-3">
                                <div className="p-5 rounded-xl flex items-center justify-center min-h-[140px] border-2 border-primary/25 shadow-inner relative overflow-hidden"
                                  style={{ backgroundColor: "#ffffff", backgroundImage: orgAutoRemoveBg ? "linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)" : "none", backgroundSize: "16px 16px", backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px" }}>
                                  <img src={orgAutoRemoveBg ? orgUploadedSigPreview : (orgRawUploadedSig || orgUploadedSigPreview)} alt="Org signature upload" className="max-h-24 max-w-full object-contain drop-shadow-sm" />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={orgAutoRemoveBg} onChange={(e) => setOrgAutoRemoveBg(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer" />
                                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                      <i className="fa-solid fa-wand-magic-sparkles text-emerald-500 text-xs" /> Auto-remove background &amp; sharpen
                                    </span>
                                  </label>
                                  <button type="button" onClick={() => { setOrgUploadedSigPreview(""); setOrgRawUploadedSig(""); if (orgSignatureUploadRef.current) orgSignatureUploadRef.current.value = ""; }}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                                    <i className="fa-solid fa-arrows-rotate text-xs" /> Choose a different image
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div onClick={() => orgSignatureUploadRef.current?.click()}
                                className="border-2 border-dashed border-border/70 hover:border-primary/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                                <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-3 text-primary group-hover:scale-105 transition-transform">
                                  <i className="fa-solid fa-image text-xl" />
                                </div>
                                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Click or drag &amp; drop your signature</p>
                                <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, SVG, WebP · max 4 MB · Auto background removal</p>
                                <div className="mt-4 px-4 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-xs text-primary font-semibold">
                                  <i className="fa-solid fa-cloud-arrow-up text-xs mr-1.5" /> Browse Files
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer save button */}
                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-lock text-[10px] text-emerald-500" />
                            Stored securely · auto-applied to all invoices &amp; contracts
                          </p>
                          <Button type="button" size="sm" disabled={savingOrgSignature}
                            onClick={async () => {
                              let dataUrl = "";
                              if (orgSigMode === "draw") {
                                const canvas = orgSignatureCanvasRef.current;
                                if (!canvas) return;
                                dataUrl = canvas.toDataURL("image/png");
                              } else if (orgSigMode === "type") {
                                if (!orgTypedSignature.trim()) { showToast("Please type the signatory's name first.", "error"); return; }
                                const offCanvas = document.createElement("canvas");
                                offCanvas.width = 800; offCanvas.height = 200;
                                const ctx = offCanvas.getContext("2d")!;
                                ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
                                ctx.font = `${orgSigFontSize}px ${orgSignatureFont}`;
                                ctx.fillStyle = "#000000";
                                ctx.textBaseline = "middle"; ctx.textAlign = "center";
                                ctx.fillText(orgTypedSignature, offCanvas.width / 2, offCanvas.height / 2);
                                dataUrl = offCanvas.toDataURL("image/png");
                              } else if (orgSigMode === "upload") {
                                const chosen = (orgAutoRemoveBg && orgUploadedSigPreview) ? orgUploadedSigPreview : (orgRawUploadedSig || orgUploadedSigPreview);
                                if (!chosen) { showToast("Please upload a signature image first.", "error"); return; }
                                dataUrl = chosen;
                              }
                              setSavingOrgSignature(true);
                              try {
                                const res = await fetch("/api/settings/company", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ name: companyName, signatureUrl: dataUrl }),
                                });
                                if (res.ok) {
                                  setCompanySignatureUrl(dataUrl);
                                  setCompanySignatureSavedAt(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
                                  setShowOrgSignaturePad(false);
                                  setOrgUploadedSigPreview("");
                                  showToast("Organization signature saved successfully!", "success");
                                } else {
                                  const d = await res.json();
                                  showToast(d.error || "Failed to save signature", "error");
                                }
                              } catch { showToast("Error saving signature.", "error"); }
                              finally { setSavingOrgSignature(false); }
                            }}
                            className="gap-2 h-9 px-5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-md">
                            <i className={`fa-solid ${savingOrgSignature ? "fa-spinner fa-spin" : "fa-floppy-disk"} text-xs`} />
                            {savingOrgSignature ? "Saving…" : "Save Signature"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FOOTER ACTIONS BAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border/80">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <i className="fa-solid fa-circle-info text-primary" />
                    <span>All changes update organization branding and invoice details across the system.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchCompanyDetails}
                      disabled={updatingCompany}
                      className="gap-2 h-10 px-4 text-xs font-semibold cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-left text-xs" />
                      Discard / Reload
                    </Button>

                    <Button
                      color="primary"
                      type="submit"
                      disabled={updatingCompany}
                      className="gap-2 h-10 px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <i className={cn("text-xs", updatingCompany ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-floppy-disk")} />
                      {updatingCompany ? "Saving Company Profile..." : "Save Company Details"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Multi-HR Data Isolation & Governance Card */}
          <Card className="border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="bg-muted/15 border-b border-border/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <i className="fa-solid fa-users-viewfinder text-sm" />
                    </div>
                    Multi-HR Option &amp; Partner Isolation
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Control organizational visibility for Human Resources officers and employee portfolio partitioning
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isHRIsoActive ? "default" : "outline"}
                    size="sm"
                    disabled={togglingHRIso}
                    onClick={handleToggleHRIso}
                    className={cn(
                      "h-8 text-xs px-3 font-bold cursor-pointer transition-all gap-1.5",
                      isHRIsoActive
                        ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                        : "border-muted-foreground/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {togglingHRIso ? (
                      <i className="fa-solid fa-spinner fa-spin text-xs" />
                    ) : isHRIsoActive ? (
                      <><i className="fa-solid fa-lock text-[11px]" /> Isolated Mode Active</>
                    ) : (
                      <><i className="fa-solid fa-lock-open text-[11px]" /> Shared Mode Active</>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  isHRIsoActive ? "border-purple-500/30 bg-purple-500/5 ring-1 ring-purple-500/20" : "border-border/60 bg-muted/20 opacity-75"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="fa-solid fa-user-lock text-sm" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Partitioned Portfolios (Isolated)</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Each HR specialist only accesses, approves leaves, reviews appraisals, and manages onboarding for employees specifically assigned to them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  !isHRIsoActive ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/20 opacity-75"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <i className="fa-solid fa-users text-sm" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-foreground">Company-Wide Access (Shared)</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        All authorized HR personnel have global visibility and can manage employee directories, leaves, policies, and records across every department.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 1: USER ACCOUNT PROFILE (Personal) */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <form onSubmit={handleUpdateProfile}>
            <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-user-gear text-primary text-lg" /> Account Profile
              </CardTitle>
              <CardDescription>Update your personal information and tenant display details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Avatar Upload Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-muted/30 border border-border/80">
                <div
                  className="relative group/avatar cursor-pointer shrink-0"
                  onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                  title="Click to upload/change photo"
                >
                  {/* Show broken placeholder if photo failed to load */}
                  {photoBroken ? (
                    <BrokenPhotoPlaceholder
                      size="xl"
                      showReuploadHint
                      onReuploadClick={() => fileInputRef.current?.click()}
                    />
                  ) : (
                    <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-md">
                      {user?.photoUrl ? (
                        <AvatarImage
                          src={user.photoUrl}
                          alt={user.name}
                          onBroken={() => setPhotoBroken(true)}
                        />
                      ) : (
                        <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                          {user?.name ? user.name.substring(0, 2).toUpperCase() : "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}

                  {/* Hover overlay — only when photo is valid */}
                  {!photoBroken && (
                    <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1 backdrop-blur-2xs">
                      <i className="fa-solid fa-camera text-sm" />
                      <span>Change</span>
                    </div>
                  )}

                  {uploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/65 flex items-center justify-center text-white">
                      <i className="fa-solid fa-spinner fa-spin text-lg text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
                      Profile Picture
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                        {user?.role || "Member"}
                      </Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upload a portrait or avatar photo. Supported: PNG, JPG, WebP, GIF (max 5MB).
                    </p>
                  </div>

                  {/* Broken photo warning banner */}
                  {photoBroken && (
                    <BrokenPhotoBanner
                      onReuploadClick={() => fileInputRef.current?.click()}
                    />
                  )}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <i className={cn("text-xs", uploadingPhoto ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-cloud-arrow-up")} />
                      {uploadingPhoto ? "Uploading Photo..." : "Upload New Photo"}
                    </Button>

                    {user?.photoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingPhoto}
                        onClick={() => setShowRemovePhotoModal(true)}
                        className="gap-1.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                      >
                        <i className="fa-solid fa-trash-can text-xs" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

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


              {/* ═══ Digital Signature Section (non-admins only — admins use org signature) ═══ */}
              {!isAdmin && !isOPS && (
              <>
              {/* Load handwriting Google Fonts for the Type mode */}
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Pacifico&family=Caveat:wght@700&family=Sacramento&family=Great+Vibes&display=swap" />

              <div className="pt-4 border-t border-border">
                {/* Premium header card */}
                <div className="rounded-2xl overflow-hidden border border-border/80 shadow-sm">
                  <div className="bg-gradient-to-r from-primary/8 via-primary/4 to-transparent px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <i className="fa-solid fa-signature text-base" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          Digital Signature
                          {signatureUrl && !showSignaturePad && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                              <i className="fa-solid fa-shield-check text-[9px]" /> Verified
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {signatureUrl && signatureSavedAt ? `Last saved ${signatureSavedAt} · Used on invoices & documents` : "Draw, type, or upload — used on invoices & official documents"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Download saved signature */}
                      {signatureUrl && !showSignaturePad && (
                        <a
                          href={signatureUrl}
                          download="my-signature.png"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs"
                        >
                          <i className="fa-solid fa-arrow-down-to-line text-xs text-primary" /> Download
                        </a>
                      )}
                      <Button
                        type="button" size="sm"
                        variant={showSignaturePad ? "outline" : "default"}
                        onClick={() => {
                          setShowSignaturePad((v) => !v);
                          if (!showSignaturePad && signatureUrl && sigMode === "draw") {
                            setTimeout(() => {
                              const canvas = signatureCanvasRef.current;
                              if (!canvas) return;
                              const ctx = canvas.getContext("2d");
                              if (!ctx) return;
                              const img = new Image();
                              img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); };
                              img.src = signatureUrl;
                            }, 60);
                          }
                        }}
                        className="gap-2 text-xs h-8 font-semibold cursor-pointer"
                      >
                        <i className={`fa-solid ${showSignaturePad ? "fa-xmark" : (signatureUrl ? "fa-pen-to-square" : "fa-pen-nib")} text-xs`} />
                        {showSignaturePad ? "Cancel" : signatureUrl ? "Edit" : "Create Signature"}
                      </Button>
                      {signatureUrl && (
                        <Button type="button" size="sm" variant="outline"
                          onClick={async () => {
                            setSignatureUrl(""); setSignatureSavedAt(null);
                            setShowSignaturePad(false); setUploadedSigPreview(""); setRawUploadedSig(""); setTypedSignature("");
                            if (!user) return;
                            await fetch(`/api/team/${user._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signatureUrl: "" }) });
                            showToast("Signature removed.", "success");
                          }}
                          className="gap-1.5 text-xs h-8 text-rose-500 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Saved signature preview */}
                  {signatureUrl && !showSignaturePad && (
                    <div className="px-5 py-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/3 via-background to-background">
                      <div className="inline-flex flex-col items-start gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Your Signature</span>
                        <div className="p-4 sm:p-5 rounded-xl bg-white text-zinc-950 border border-border/60 shadow-sm relative overflow-hidden">
                          {/* subtle lined background */}
                          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #64748b 27px, #64748b 28px)", backgroundPosition: "0 12px" }} />
                          <img src={signatureUrl} alt="Digital signature" className="relative max-h-24 max-w-[280px] sm:max-w-sm object-contain" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!signatureUrl && !showSignaturePad && (
                    <div className="px-5 py-6 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/40 mb-1">
                        <i className="fa-solid fa-pen-nib text-2xl" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">No signature yet</p>
                      <p className="text-xs text-muted-foreground max-w-xs">Create your digital signature to auto-populate invoices, contracts, and official documents.</p>
                      <Button type="button" size="sm" onClick={() => setShowSignaturePad(true)} className="gap-2 text-xs mt-2 cursor-pointer">
                        <i className="fa-solid fa-plus text-xs" /> Create Signature
                      </Button>
                    </div>
                  )}

                  {/* ═══ Editor panel ═══ */}
                  {showSignaturePad && (
                    <div className="p-4 sm:p-5 space-y-5">

                      {/* Mode tab strip */}
                      <div className="flex gap-0 rounded-xl overflow-hidden border border-border bg-muted/30 w-fit text-xs font-semibold">
                        {(["draw", "type", "upload"] as const).map((m, idx) => (
                          <button key={m} type="button" onClick={() => setSigMode(m)}
                            className={cn(
                              "flex items-center gap-1.5 px-4 py-2 transition-all cursor-pointer border-r border-border last:border-r-0",
                              sigMode === m
                                ? "bg-primary text-primary-foreground shadow-inner"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                          >
                            <i className={`fa-solid ${ m === "draw" ? "fa-pen-nib" : m === "type" ? "fa-font" : "fa-image" } text-[11px]`} />
                            {m === "draw" ? "Draw" : m === "type" ? "Type" : "Upload"}
                          </button>
                        ))}
                      </div>

                      {/* ── DRAW MODE ── */}
                      {sigMode === "draw" && (
                        <div className="space-y-4">
                          {/* Toolbar row */}
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Ink badge - standard black */}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/70 text-foreground border border-border/60">
                                <span className="w-2.5 h-2.5 rounded-full bg-black ring-1 ring-border" />
                                Black Ink
                              </span>
                            </div>

                            {/* Stroke width */}
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size</label>
                              <div className="flex items-center gap-1.5">
                                {[1.2, 2.5, 4, 6].map((w) => (
                                  <button key={w} type="button" onClick={() => setSigLineWidth(w)}
                                    className={cn("w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer", sigLineWidth === w ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-background")}
                                    title={`${w}px`}
                                  >
                                    <div style={{ width: Math.min(w * 3, 18), height: Math.min(w, 4), backgroundColor: "#000000", borderRadius: 99 }} />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Background */}
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Paper</label>
                              <div className="flex gap-1">
                                {(["blank", "lined", "grid"] as const).map((bg) => (
                                  <button key={bg} type="button" onClick={() => setSigBg(bg)}
                                    className={cn("px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer capitalize", sigBg === bg ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50 bg-background")}
                                  >
                                    {bg}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Canvas */}
                          <div className="relative rounded-xl overflow-hidden border-2 border-border/60 shadow-inner touch-none select-none"
                            style={{
                              background:
                                sigBg === "lined"
                                  ? "repeating-linear-gradient(white, white 27px, #e2e8f0 27px, #e2e8f0 28px)"
                                  : sigBg === "grid"
                                  ? "repeating-linear-gradient(white, white 27px, #e2e8f0 27px, #e2e8f0 28px), repeating-linear-gradient(90deg, white, white 27px, #e2e8f0 27px, #e2e8f0 28px)"
                                  : "white",
                            }}
                          >
                            <canvas
                              ref={signatureCanvasRef}
                              width={800} height={200}
                              className="w-full h-[170px] sm:h-[200px] cursor-crosshair block"
                              style={{ touchAction: "none", background: "transparent" }}
                              onMouseDown={(e) => {
                                const canvas = signatureCanvasRef.current; if (!canvas) return;
                                setIsDrawing(true);
                                const rect = canvas.getBoundingClientRect();
                                const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                                const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                                signatureLastPos.current = { x, y };
                                // Start a fresh open path for this stroke
                                const ctx = canvas.getContext("2d"); if (!ctx) return;
                                ctx.beginPath();
                                ctx.moveTo(x, y);
                                ctx.strokeStyle = sigColor;
                                ctx.lineWidth = sigLineWidth;
                                ctx.lineCap = "round";
                                ctx.lineJoin = "round";
                              }}
                              onMouseMove={(e) => {
                                if (!isDrawing || !signatureLastPos.current) return;
                                const canvas = signatureCanvasRef.current; if (!canvas) return;
                                const ctx = canvas.getContext("2d"); if (!ctx) return;
                                const rect = canvas.getBoundingClientRect();
                                const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                                const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                                ctx.lineTo(x, y);
                                ctx.stroke();
                                signatureLastPos.current = { x, y };
                              }}
                              onMouseUp={() => { setIsDrawing(false); signatureLastPos.current = null; }}
                              onMouseLeave={() => { setIsDrawing(false); signatureLastPos.current = null; }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                const canvas = signatureCanvasRef.current; if (!canvas) return;
                                setIsDrawing(true);
                                const t = e.touches[0]; const rect = canvas.getBoundingClientRect();
                                const x = (t.clientX - rect.left) * (canvas.width / rect.width);
                                const y = (t.clientY - rect.top) * (canvas.height / rect.height);
                                signatureLastPos.current = { x, y };
                                // Start a fresh open path for this touch stroke
                                const ctx = canvas.getContext("2d"); if (!ctx) return;
                                ctx.beginPath();
                                ctx.moveTo(x, y);
                                ctx.strokeStyle = sigColor;
                                ctx.lineWidth = sigLineWidth;
                                ctx.lineCap = "round";
                                ctx.lineJoin = "round";
                              }}
                              onTouchMove={(e) => {
                                e.preventDefault();
                                if (!isDrawing || !signatureLastPos.current) return;
                                const canvas = signatureCanvasRef.current; if (!canvas) return;
                                const ctx = canvas.getContext("2d"); if (!ctx) return;
                                const t = e.touches[0]; const rect = canvas.getBoundingClientRect();
                                const x = (t.clientX - rect.left) * (canvas.width / rect.width);
                                const y = (t.clientY - rect.top) * (canvas.height / rect.height);
                                ctx.lineTo(x, y);
                                ctx.stroke();
                                signatureLastPos.current = { x, y };
                              }}
                              onTouchEnd={(e) => { e.preventDefault(); setIsDrawing(false); signatureLastPos.current = null; }}
                            />
                            {/* Baseline */}
                            <div className="absolute bottom-[26%] left-5 right-5 border-t border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />
                            <span className="absolute bottom-2 left-5 text-[10px] text-slate-400 pointer-events-none select-none font-medium">Sign above this line</span>
                            {/* Clear button overlay */}
                            <button type="button"
                              onClick={() => { const c = signatureCanvasRef.current; if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:border-rose-300 transition-all cursor-pointer"
                              title="Clear canvas"
                            >
                              <i className="fa-solid fa-eraser text-[10px]" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── TYPE MODE ── */}
                      {sigMode === "type" && (
                        <div className="space-y-4">
                          {/* Input row */}
                          <div className="relative">
                            <i className="fa-solid fa-font absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 text-xs" />
                            <input
                              type="text"
                              value={typedSignature}
                              onChange={(e) => setTypedSignature(e.target.value)}
                              placeholder="Type your full name…"
                              maxLength={60}
                              className="w-full pl-8 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                          </div>

                          {/* Controls row */}
                          <div className="flex flex-wrap items-center gap-4">
                            {/* Ink badge */}
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted/70 text-foreground border border-border/60">
                                <span className="w-2.5 h-2.5 rounded-full bg-black ring-1 ring-border" />
                                Black Ink
                              </span>
                            </div>

                            {/* Font size */}
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Size</label>
                              <input type="range" min={40} max={100} value={sigFontSize} onChange={(e) => setSigFontSize(Number(e.target.value))}
                                className="w-24 accent-primary cursor-pointer"
                              />
                              <span className="text-[11px] text-muted-foreground w-8">{sigFontSize}px</span>
                            </div>
                          </div>

                          {/* Font picker */}
                          <div className="flex flex-wrap gap-2">
                            {([
                              { label: "Dancing Script", value: "'Dancing Script', cursive" },
                              { label: "Pacifico", value: "'Pacifico', cursive" },
                              { label: "Caveat", value: "'Caveat', cursive" },
                              { label: "Sacramento", value: "'Sacramento', cursive" },
                              { label: "Great Vibes", value: "'Great Vibes', cursive" },
                            ]).map((f) => (
                              <button
                                key={f.value} type="button" onClick={() => setSignatureFont(f.value)}
                                style={{ fontFamily: f.value }}
                                className={cn(
                                  "px-3 py-1.5 text-base rounded-xl border transition-all cursor-pointer",
                                  signatureFont === f.value
                                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                                    : "border-border text-foreground hover:border-primary/50 bg-background hover:bg-muted/30"
                                )}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>

                          {/* Live preview */}
                          <div
                            className="relative rounded-xl border-2 border-dashed flex items-center justify-center min-h-[130px] overflow-hidden transition-all"
                            style={{
                              borderColor: typedSignature ? "rgb(var(--primary) / 0.3)" : "rgb(var(--border) / 0.5)",
                              background: "repeating-linear-gradient(white, white 29px, #e2e8f0 29px, #e2e8f0 30px)",
                            }}
                          >
                            {typedSignature ? (
                              <span
                                style={{ fontFamily: signatureFont, fontSize: `${sigFontSize}px`, color: sigFontColor, lineHeight: 1.15, padding: "8px 20px", display: "block" }}
                              >
                                {typedSignature}
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
                                <i className="fa-solid fa-i-cursor text-2xl" />
                                <span className="text-xs">Live preview appears here</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── UPLOAD MODE ── */}
                      {sigMode === "upload" && (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">Upload a photo or scan of your handwritten signature. Background will be automatically removed and strokes sharpened to solid black ink.</p>
                          <input
                            ref={signatureUploadRef} type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 4 * 1024 * 1024) { showToast("Signature image must be under 4MB.", "error"); return; }
                              setProcessingSigImage(true);
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                const raw = ev.target?.result as string;
                                setRawUploadedSig(raw);
                                try {
                                  const processed = await removeSignatureBackground(raw);
                                  setUploadedSigPreview(processed);
                                  setAutoRemoveBg(true);
                                } catch {
                                  setUploadedSigPreview(raw);
                                } finally {
                                  setProcessingSigImage(false);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />

                          {processingSigImage ? (
                            <div className="p-8 rounded-xl flex flex-col items-center justify-center min-h-[140px] border border-border bg-muted/20 gap-2.5">
                              <i className="fa-solid fa-spinner fa-spin text-primary text-xl" />
                              <span className="text-xs font-semibold text-foreground">Auto-removing background & enhancing ink…</span>
                              <span className="text-[11px] text-muted-foreground">Detecting paper lighting and converting to crisp black ink</span>
                            </div>
                          ) : (uploadedSigPreview || rawUploadedSig) ? (
                            <div className="space-y-3">
                              {/* Signature preview on paper/transparent checkerboard */}
                              <div
                                className="p-5 rounded-xl flex items-center justify-center min-h-[140px] border-2 border-primary/25 shadow-inner relative overflow-hidden"
                                style={{
                                  backgroundColor: "#ffffff",
                                  backgroundImage: autoRemoveBg
                                    ? "linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)"
                                    : "none",
                                  backgroundSize: "16px 16px",
                                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px"
                                }}
                              >
                                <img
                                  src={autoRemoveBg ? uploadedSigPreview : (rawUploadedSig || uploadedSigPreview)}
                                  alt="Uploaded signature"
                                  className="max-h-24 max-w-full object-contain drop-shadow-sm"
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                {/* Auto-remove toggle */}
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={autoRemoveBg}
                                    onChange={(e) => setAutoRemoveBg(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                    <i className="fa-solid fa-wand-magic-sparkles text-emerald-500 text-xs" />
                                    Auto-remove background & sharpen black ink
                                  </span>
                                </label>

                                <button type="button"
                                  onClick={() => {
                                    setUploadedSigPreview("");
                                    setRawUploadedSig("");
                                    if (signatureUploadRef.current) signatureUploadRef.current.value = "";
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                >
                                  <i className="fa-solid fa-arrows-rotate text-xs" /> Choose a different image
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => signatureUploadRef.current?.click()}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const file = e.dataTransfer.files?.[0];
                                if (!file) return;
                                if (file.size > 4 * 1024 * 1024) { showToast("Signature image must be under 4MB.", "error"); return; }
                                setProcessingSigImage(true);
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const raw = ev.target?.result as string;
                                  setRawUploadedSig(raw);
                                  try {
                                    const processed = await removeSignatureBackground(raw);
                                    setUploadedSigPreview(processed);
                                    setAutoRemoveBg(true);
                                  } catch {
                                    setUploadedSigPreview(raw);
                                  } finally {
                                    setProcessingSigImage(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="border-2 border-dashed border-border/70 hover:border-primary/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                            >
                              <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mb-3 text-primary group-hover:scale-105 transition-transform">
                                <i className="fa-solid fa-image text-xl" />
                              </div>
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Click or drag & drop your signature</p>
                              <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG, SVG, WebP · max 4 MB · Auto background removal</p>
                              <div className="mt-4 px-4 py-1.5 rounded-lg bg-primary/8 border border-primary/20 text-xs text-primary font-semibold">
                                <i className="fa-solid fa-cloud-arrow-up text-xs mr-1.5" /> Browse Files
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Footer: Save button ── */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-lock text-[10px] text-emerald-500" />
                          Stored securely · appears on invoices & contracts
                        </p>
                        <Button
                          type="button" size="sm"
                          disabled={savingSignature}
                          onClick={async () => {
                            if (!user) return;
                            let dataUrl = "";

                            if (sigMode === "draw") {
                              const canvas = signatureCanvasRef.current;
                              if (!canvas) return;
                              dataUrl = canvas.toDataURL("image/png");
                            } else if (sigMode === "type") {
                              if (!typedSignature.trim()) { showToast("Please type your name first.", "error"); return; }
                              const offCanvas = document.createElement("canvas");
                              offCanvas.width = 800; offCanvas.height = 200;
                              const ctx = offCanvas.getContext("2d")!;
                              ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
                              ctx.font = `${sigFontSize}px ${signatureFont}`;
                              ctx.fillStyle = sigFontColor || "#000000";
                              ctx.textBaseline = "middle";
                              ctx.textAlign = "center";
                              ctx.fillText(typedSignature, offCanvas.width / 2, offCanvas.height / 2);
                              dataUrl = offCanvas.toDataURL("image/png");
                            } else if (sigMode === "upload") {
                              const chosenSig = (autoRemoveBg && uploadedSigPreview) ? uploadedSigPreview : (rawUploadedSig || uploadedSigPreview);
                              if (!chosenSig) { showToast("Please upload a signature image first.", "error"); return; }
                              dataUrl = chosenSig;
                            }

                            setSavingSignature(true);
                            try {
                              const res = await fetch(`/api/team/${user._id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ signatureUrl: dataUrl }),
                              });
                              if (res.ok) {
                                setSignatureUrl(dataUrl);
                                setSignatureSavedAt(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
                                setShowSignaturePad(false);
                                setUploadedSigPreview("");
                                await refreshUser();
                                showToast("Signature saved successfully!", "success");
                              } else {
                                const d = await res.json();
                                showToast(d.error || "Failed to save signature", "error");
                              }
                            } catch { showToast("Error saving signature.", "error"); }
                            finally { setSavingSignature(false); }
                          }}
                          className="gap-2 h-9 px-5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer shadow-md"
                        >
                          <i className={`fa-solid ${savingSignature ? "fa-spinner fa-spin" : "fa-floppy-disk"} text-xs`} />
                          {savingSignature ? "Saving…" : "Save Signature"}
                        </Button>
                      </div>

                    </div>
                  )}
                </div>
              </div>
              </>
              )}

              {/* Resume / CV Upload Section — Employees & non-admin roles only */}
              {!isAdmin && !isOPS && (
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-file-lines text-primary text-sm" /> Resume / Curriculum Vitae (CV)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Upload your latest resume or CV. Supported formats: PDF, DOC, DOCX (max 10MB).
                    </p>
                  </div>
                  {resumeUrl && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1.5 font-medium">
                      <i className="fa-solid fa-circle-check text-[10px]" /> Uploaded
                    </Badge>
                  )}
                </div>

                <input
                  ref={fileResumeRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleUploadResume}
                  className="hidden"
                />

                {resumeUrl ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border/80 hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                        {resumeFileName.toLowerCase().endsWith(".doc") || resumeFileName.toLowerCase().endsWith(".docx") ? (
                          <i className="fa-solid fa-file-word text-blue-500 text-2xl" />
                        ) : (
                          <i className="fa-solid fa-file-pdf text-rose-500 text-2xl" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground truncate" title={resumeFileName || "My_Resume.pdf"}>
                          {resumeFileName || "My_Resume.pdf"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          {resumeFileSize > 0 && <span>{formatResumeBytes(resumeFileSize)}</span>}
                          {resumeFileSize > 0 && <span>•</span>}
                          <span>
                            {resumeUpdatedAt
                              ? `Uploaded on ${new Date(resumeUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                              : "Uploaded"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      <a
                        href={resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={resumeFileName || "Resume"}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs font-semibold cursor-pointer border-border hover:border-primary/50 text-foreground"
                        >
                          <i className="fa-solid fa-arrow-down-to-line text-xs text-primary" />
                          Download / View
                        </Button>
                      </a>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingResume}
                        onClick={() => fileResumeRef.current?.click()}
                        className="gap-1.5 text-xs font-semibold cursor-pointer border-border hover:border-primary/50 text-foreground"
                      >
                        <i className={cn("text-xs", uploadingResume ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-arrows-rotate text-primary")} />
                        {uploadingResume ? "Replacing..." : "Replace"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingResume}
                        onClick={() => setShowRemoveResumeModal(true)}
                        className="gap-1.5 text-xs font-semibold text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                      >
                        <i className="fa-solid fa-trash-can text-xs" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => !uploadingResume && fileResumeRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all duration-200 group",
                      uploadingResume && "pointer-events-none opacity-70"
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2.5 text-primary group-hover:scale-105 transition-transform">
                      {uploadingResume ? (
                        <i className="fa-solid fa-spinner fa-spin text-xl text-primary" />
                      ) : (
                        <i className="fa-solid fa-cloud-arrow-up text-xl text-primary" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {uploadingResume ? "Uploading your resume..." : "Click to upload your Resume or CV"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports PDF, DOC, DOCX files up to 10MB
                    </p>
                  </div>
                )}
              </div>
              )}

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

              {/* Salary Disbursement & Bank Details */}
              <div className="pt-4 border-t border-border space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-building-columns text-emerald-500" /> Salary Disbursement &amp; Bank Details
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your personal banking details used for salary credit, monthly disbursements, and self-service invoices.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Bank Name</label>
                    <Input
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, State Bank of India"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Account Number</label>
                    <Input
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      placeholder="e.g. 501002345678"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">IFSC / Routing Code</label>
                    <Input
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">UPI ID (Optional)</label>
                    <Input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. username@okhdfcbank"
                      className="font-mono"
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
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-key text-muted-foreground text-xs" /> 6-Digit Email Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={handleResendPasswordCode}
                        disabled={sendingPasswordCode || resendPasswordCooldown > 0}
                        className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
                      >
                        <i className="fa-solid fa-rotate-right text-[10px]" />
                        {sendingPasswordCode
                          ? "Resending..."
                          : resendPasswordCooldown > 0
                          ? `Resend in ${resendPasswordCooldown}s`
                          : "Resend Code"}
                      </button>
                    </div>
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
                <p className="text-2xl font-extrabold text-foreground">₹{Number(subscription?.amount || 24999).toLocaleString("en-IN")} / mo</p>
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
                        <p className="text-xl font-extrabold text-foreground mt-1">₹12,499 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Up to 25 seats for small agile agencies.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingPlan || subscription?.planName === "Standard Team"}
                        onClick={() => handleUpdatePlan("Standard Team", 25, 12499)}
                      >
                        {subscription?.planName === "Standard Team" ? "Current Tier" : "Select Tier"}
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-3 flex flex-col justify-between">
                      <div>
                        <Badge color="primary" className="mb-1">Recommended</Badge>
                        <p className="font-bold text-sm text-foreground">Enterprise Team Tier</p>
                        <p className="text-xl font-extrabold text-foreground mt-1">₹24,999 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Up to 100 seats with multi-tenant isolation.</p>
                      </div>
                      <Button
                        color="primary"
                        size="sm"
                        disabled={updatingPlan || subscription?.planName === "Enterprise Team Tier"}
                        onClick={() => handleUpdatePlan("Enterprise Team Tier", 100, 24999)}
                      >
                        {subscription?.planName === "Enterprise Team Tier" ? "Current Tier" : "Upgrade Plan"}
                      </Button>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-sm text-foreground">Scale & Growth (500 Seats)</p>
                        <p className="text-xl font-extrabold text-foreground mt-1">₹64,999 <span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">Up to 500 seats with custom SLAs.</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingPlan || subscription?.planName === "Scale & Growth (500 Seats)"}
                        onClick={() => handleUpdatePlan("Scale & Growth (500 Seats)", 500, 64999)}
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

      {/* Remove Profile Photo Confirmation Modal */}
      {showRemovePhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Remove Profile Photo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to remove your profile photo? Your avatar will revert to your name initials.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemovePhotoModal(false)}
                disabled={uploadingPhoto}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto}
                className="gap-2 font-semibold cursor-pointer"
              >
                {uploadingPhoto ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Removing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Remove Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Resume Confirmation Modal — non-admin/OPS only */}
      {!isAdmin && !isOPS && showRemoveResumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-trash-can text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Remove Resume</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to remove your resume (<span className="font-medium text-foreground">{resumeFileName || "Resume"}</span>)? You can upload a new one at any time.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveResumeModal(false)}
                disabled={uploadingResume}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleRemoveResume}
                disabled={uploadingResume}
                className="gap-2 font-semibold cursor-pointer"
              >
                {uploadingResume ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Removing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Remove Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Preloader label="Loading Settings & Profile..." />}>
      <SettingsPageContent />
    </Suspense>
  );
}
