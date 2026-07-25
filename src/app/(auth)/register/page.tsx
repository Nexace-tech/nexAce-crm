"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Sparkles, Eye, EyeOff, Mail, Lock, Building, User, KeyRound, ArrowRight, ArrowLeft, Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
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
    
    const companyNameVal = (document.getElementById("companyName") as HTMLInputElement)?.value;
    const companySlugVal = (document.getElementById("companySlug") as HTMLInputElement)?.value;
    const adminNameVal = (document.getElementById("adminName") as HTMLInputElement)?.value;
    const adminEmailVal = (document.getElementById("adminEmail") as HTMLInputElement)?.value;
    const adminPasswordVal = (document.getElementById("adminPassword") as HTMLInputElement)?.value;

    if (!companyNameVal || !companySlugVal || !adminNameVal || !adminEmailVal || !adminPasswordVal) {
      setVerificationError("Please fill out all fields first.");
      return;
    }

    if (!adminEmailVal.includes("@")) {
      setVerificationError("Please enter a valid email address.");
      return;
    }

    if (adminPasswordVal.length < 6) {
      setVerificationError("Password must be at least 6 characters long.");
      return;
    }

    setVerificationError("");
    setSendingCode(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmailVal }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevPreviewUrl(data.previewUrl || "");
        setDevCode(data.devCode || "");
        setEmailForVerification(adminEmailVal);
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-lg border border-border shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Sparkles className="w-6 h-6 fill-primary text-primary" />
            <span>NexAce CRM</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {step === "details" ? "Create Workspace" : "Verify Admin Email"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {step === "details"
              ? "Register your client company tenant account."
              : `We've sent a verification code to ${emailForVerification}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="code" value={verificationCode} />
            
            {(state?.message || verificationError) && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                {state?.message || verificationError}
              </div>
            )}

            {/* STEP 1: Details Section */}
            {step === "details" && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="companyName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-muted-foreground" /> Company Name
                    </label>
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={companyName}
                      onChange={handleCompanyNameChange}
                      required
                    />
                    {state?.errors?.companyName && (
                      <span className="text-[11px] text-destructive font-medium">{state.errors.companyName[0]}</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="companySlug" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-muted-foreground" /> Workspace Slug
                    </label>
                    <Input
                      id="companySlug"
                      name="companySlug"
                      type="text"
                      placeholder="e.g. acme-corp"
                      value={companySlug}
                      onChange={handleSlugChange}
                      required
                    />
                    {state?.errors?.companySlug && (
                      <span className="text-[11px] text-destructive font-medium">{state.errors.companySlug[0]}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adminName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" /> Administrator Name
                  </label>
                  <Input
                    id="adminName"
                    name="adminName"
                    type="text"
                    placeholder="e.g. John Doe"
                    required
                  />
                  {state?.errors?.adminName && (
                    <span className="text-[11px] text-destructive font-medium">{state.errors.adminName[0]}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adminEmail" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Admin Email
                  </label>
                  <Input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    placeholder="e.g. john@acme.com"
                    required
                  />
                  {state?.errors?.adminEmail && (
                    <span className="text-[11px] text-destructive font-medium">{state.errors.adminEmail[0]}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="adminPassword" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Password
                  </label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      name="adminPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {state?.errors?.adminPassword && (
                    <span className="text-[11px] text-destructive font-medium">{state.errors.adminPassword[0]}</span>
                  )}
                </div>

                <Button color="primary" className="w-full gap-2 font-semibold mt-2" type="button" onClick={handleNextStep} disabled={sendingCode}>
                  {sendingCode ? "Sending Code..." : "Send Verification Code"}
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: Email Verification Code Section */}
            {step === "verify" && (
              <div className="space-y-4 animate-in fade-in">
                {devCode && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs space-y-1 text-center">
                    <p className="font-semibold text-primary">Developer SMTP Sandbox Code:</p>
                    <code className="text-sm font-bold bg-background px-2 py-0.5 rounded border border-border text-foreground">
                      {devCode}
                    </code>
                    {devPreviewUrl && (
                      <p>
                        <a href={devPreviewUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
                          Open Ethereal Mail Inbox ↗
                        </a>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="code" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-muted-foreground" /> Verification Code
                  </label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="e.g. 123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" type="button" onClick={() => { setStep("details"); setVerificationError(""); }} className="flex-1 gap-1">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </Button>
                  <Button color="primary" type="submit" className="flex-2 gap-2 font-semibold" disabled={isPending}>
                    {isPending ? "Creating Workspace..." : "Verify & Register"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Already have a workspace?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline ml-1">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
