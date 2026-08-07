"use client";

import React, { useActionState, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { forgotPasswordAction, resetPasswordAction } from "@/app/actions/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPasswordCriteria, generateSecurePassword, cn } from "@/lib/utils";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email") || "";
  const urlCode = searchParams.get("code") || "";

  const [requestState, requestAction, isRequestPending] = useActionState(forgotPasswordAction, undefined);
  const [resetState, resetAction, isResetPending] = useActionState(resetPasswordAction, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const derivedCode = resetState?.enteredCode || urlCode || "";
  const [codeVal, setCodeVal] = useState(derivedCode);
  const [prevDerivedCode, setPrevDerivedCode] = useState(derivedCode);

  // Custom states for Resend OTP feature
  const [resendingCode, setResendingCode] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [localDevCode, setLocalDevCode] = useState<string | undefined>(undefined);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!devCode) return;
    navigator.clipboard.writeText(devCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sync state if derived props change without triggering cascading render warning
  if (derivedCode !== prevDerivedCode) {
    setPrevDerivedCode(derivedCode);
    setCodeVal(derivedCode);
  }

  // Resend countdown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const isResetStep = Boolean(urlCode && urlEmail) || requestState?.step === "reset" || resetState?.step === "reset";
  const isCompletedStep = resetState?.step === "completed";
  const emailVal = requestState?.resetEmail || resetState?.resetEmail || urlEmail;
  const devCode = localDevCode || requestState?.devCode || resetState?.devCode;
  const previewUrl = localPreviewUrl || requestState?.previewUrl || resetState?.previewUrl;

  const handleResendCode = async () => {
    if (resendingCode || resendCooldown > 0) return;
    setResendingCode(true);
    setResendMessage("");
    try {
      const formData = new FormData();
      formData.append("email", emailVal);
      const result = await forgotPasswordAction(undefined, formData);
      if (result?.message) {
        setResendMessage(result.message);
      }
      if (result?.devCode) {
        setLocalDevCode(result.devCode);
      }
      if (result?.previewUrl) {
        setLocalPreviewUrl(result.previewUrl);
      }
      setResendCooldown(30); // 30 seconds cooldown
    } catch (err) {
      console.error("Resend OTP error:", err);
      setResendMessage("Failed to resend verification code. Please try again.");
    } finally {
      setResendingCode(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border border-border shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl tracking-tight">
            <i className="fa-solid fa-wand-magic-sparkles text-primary" />
            <span>NexAce CRM</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {isCompletedStep ? "Password Reset Complete" : isResetStep ? "Reset Your Password" : "Forgot Password"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {isCompletedStep
              ? "Your password has been successfully updated."
              : isResetStep
              ? `Enter your new password for ${emailVal}`
              : "Enter your email address to receive a password reset link and code."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Developer Mode Banner if Ethereal Mailer was used */}
          {devCode && (
            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 rounded-xl text-xs space-y-3 text-amber-700 dark:text-amber-400 relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-flask text-xs animate-pulse text-amber-500" />
                  Developer Mode (No Live SMTP Configured)
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>

              <div className="flex items-center justify-between bg-background/50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-amber-500/20">
                <span>
                  Verification Code: <strong className="font-mono text-sm tracking-wider text-foreground select-all">{devCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors border border-amber-500/20 hover:border-amber-500/40 bg-background/80 px-2 py-1 rounded-md shadow-2xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <i className="fa-solid fa-circle-check text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-copy" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/20 transition-all cursor-pointer shadow-2xs"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  <span>View Ethereal Email Preview</span>
                </a>
              )}
            </div>
          )}

          {/* STEP 3: Completed */}
          {isCompletedStep ? (
            <div className="space-y-4 text-center animate-in fade-in">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-medium flex items-center justify-center gap-2">
                <i className="fa-solid fa-circle-check text-base" />
                <span>{resetState?.message || "Password reset successfully!"}</span>
              </div>
              <Button asChild color="primary" className="w-full gap-2 font-semibold">
                <Link href="/login">
                  <i className="fa-solid fa-arrow-left text-xs" /> Back to Sign In
                </Link>
              </Button>
            </div>
          ) : isResetStep ? (
            /* STEP 2: Enter Verification Code & New Password */
            <form action={resetAction} className="space-y-4 animate-in fade-in">
              {resetState?.message && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                  {resetState.message}
                </div>
              )}

              {requestState?.message && !resetState?.message && !resendMessage && (
                <div className="p-3 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md font-medium">
                  {requestState.message}
                </div>
              )}

              {resendMessage && (
                <div className="p-3 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md font-medium">
                  {resendMessage}
                </div>
              )}

              <input type="hidden" name="email" value={emailVal} />

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="code" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-key text-muted-foreground text-xs" /> 6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendingCode || resendCooldown > 0}
                    className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1"
                  >
                    <i className="fa-solid fa-rotate-right text-[10px]" />
                    {resendingCode
                      ? "Resending..."
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend Code"}
                  </button>
                </div>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  maxLength={6}
                  value={codeVal}
                  onChange={(e) => setCodeVal(e.target.value)}
                  placeholder="e.g. 123456"
                  className="font-mono text-center tracking-widest text-base font-bold"
                  required
                />
                {resetState?.errors?.code && (
                  <span className="text-[11px] text-destructive font-medium">{resetState.errors.code[0]}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-lock text-muted-foreground text-xs" /> New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    placeholder="••••••••"
                    className="pr-16"
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateSecurePassword();
                        setNewPasswordVal(generated);
                        setShowPassword(true);
                      }}
                      className="hover:text-primary transition-colors cursor-pointer p-1"
                      title="Generate Strong Secure Password"
                    >
                      <i className="fa-solid fa-key text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-foreground transition-colors p-1 text-xs cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                    </button>
                  </div>
                </div>

                {/* Password Pattern Strength Checklist */}
                {newPasswordVal.length > 0 && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Strength Meter Bar */}
                    {(() => {
                      const criteria = getPasswordCriteria(newPasswordVal);
                      const score = [
                        criteria.minLength,
                        criteria.hasUpper,
                        criteria.hasLower,
                        criteria.hasNumber,
                        criteria.hasSpecial,
                      ].filter(Boolean).length;

                      const strengthConfig = [
                        { label: "Very Weak", color: "bg-rose-500", text: "text-rose-500", pct: 20 },
                        { label: "Very Weak", color: "bg-rose-500", text: "text-rose-500", pct: 20 },
                        { label: "Weak", color: "bg-orange-500", text: "text-orange-500", pct: 40 },
                        { label: "Fair", color: "bg-amber-500", text: "text-amber-500", pct: 60 },
                        { label: "Good", color: "bg-sky-500", text: "text-sky-500", pct: 80 },
                        { label: "Strong!", color: "bg-emerald-500", text: "text-emerald-500", pct: 100 },
                      ];

                      const current = strengthConfig[score] || strengthConfig[0];

                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-muted-foreground uppercase">Password Strength</span>
                            <span className={current.text}>{current.label}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-500 rounded-full", current.color)}
                              style={{ width: `${current.pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Criteria Checklist Grid */}
                    <div className="p-3 bg-muted/40 border border-border/60 rounded-xl text-[11px] grid grid-cols-2 gap-2 transition-all">
                      {(() => {
                        const criteria = getPasswordCriteria(newPasswordVal);
                        return (
                          <>
                            <span className={cn("flex items-center gap-1.5 font-medium transition-colors duration-200", criteria.minLength ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                              <i className={`fa-solid ${criteria.minLength ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> 8+ Characters
                            </span>
                            <span className={cn("flex items-center gap-1.5 font-medium transition-colors duration-200", criteria.hasUpper ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                              <i className={`fa-solid ${criteria.hasUpper ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Uppercase (A-Z)
                            </span>
                            <span className={cn("flex items-center gap-1.5 font-medium transition-colors duration-200", criteria.hasLower ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                              <i className={`fa-solid ${criteria.hasLower ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Lowercase (a-z)
                            </span>
                            <span className={cn("flex items-center gap-1.5 font-medium transition-colors duration-200", criteria.hasNumber ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                              <i className={`fa-solid ${criteria.hasNumber ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Number (0-9)
                            </span>
                            <span className={cn("flex items-center gap-1.5 font-medium col-span-2 transition-colors duration-200", criteria.hasSpecial ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                              <i className={`fa-solid ${criteria.hasSpecial ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Special Character (!@#$%^&*)
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {resetState?.errors?.newPassword && (
                  <span className="text-[11px] text-destructive font-medium">{resetState.errors.newPassword[0]}</span>
                )}
              </div>

              <Button color="primary" className="w-full gap-2 font-semibold" type="submit" disabled={isResetPending}>
                {isResetPending ? "Updating Password..." : "Reset Password"}
                <i className="fa-solid fa-arrow-right text-xs" />
              </Button>
            </form>
          ) : (
            /* STEP 1: Request Password Reset Code */
            <form action={requestAction} className="space-y-4">
              {requestState?.message && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                  {requestState.message}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-muted-foreground text-xs" /> Account Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. admin@nexace.com"
                  defaultValue={urlEmail}
                  required
                />
                {requestState?.errors?.email && (
                  <span className="text-[11px] text-destructive font-medium">{requestState.errors.email[0]}</span>
                )}
              </div>

              <Button color="primary" className="w-full gap-2 font-semibold" type="submit" disabled={isRequestPending}>
                {isRequestPending ? "Sending Reset Link..." : "Send Reset Link"}
                <i className="fa-solid fa-arrow-right text-xs" />
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline ml-1">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
