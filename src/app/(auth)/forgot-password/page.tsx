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

  const isResetStep = Boolean(urlCode && urlEmail) || requestState?.step === "reset" || resetState?.step === "reset";
  const isCompletedStep = resetState?.step === "completed";
  const emailVal = requestState?.resetEmail || resetState?.resetEmail || urlEmail;
  const devCode = requestState?.devCode || resetState?.devCode;
  const previewUrl = requestState?.previewUrl || resetState?.previewUrl;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border border-border shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl tracking-tight">
            <i className="fa-solid fa-sparkles text-primary" />
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
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs space-y-1 text-amber-600 dark:text-amber-400">
              <div className="font-bold flex items-center gap-1.5">
                <i className="fa-solid fa-flask text-xs" /> Developer Mode (No Live SMTP Configured)
              </div>
              <p>
                Verification Code: <strong className="font-mono text-sm tracking-wider text-foreground">{devCode}</strong>
              </p>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] underline flex items-center gap-1 text-primary hover:text-primary/80"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" /> View Ethereal Email Preview
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

              {requestState?.message && !resetState?.message && (
                <div className="p-3 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md font-medium">
                  {requestState.message}
                </div>
              )}

              <input type="hidden" name="email" value={emailVal} />

              <div className="space-y-1.5">
                <label htmlFor="code" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-key text-muted-foreground text-xs" /> 6-Digit Verification Code
                </label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  maxLength={6}
                  defaultValue={urlCode}
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
                  <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg text-[11px] grid grid-cols-2 gap-1.5 transition-all">
                    {(() => {
                      const criteria = getPasswordCriteria(newPasswordVal);
                      return (
                        <>
                          <span className={cn("flex items-center gap-1 font-medium", criteria.minLength ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                            <i className={`fa-solid ${criteria.minLength ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> 8+ Characters
                          </span>
                          <span className={cn("flex items-center gap-1 font-medium", criteria.hasUpper ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                            <i className={`fa-solid ${criteria.hasUpper ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Uppercase (A-Z)
                          </span>
                          <span className={cn("flex items-center gap-1 font-medium", criteria.hasLower ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                            <i className={`fa-solid ${criteria.hasLower ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Lowercase (a-z)
                          </span>
                          <span className={cn("flex items-center gap-1 font-medium", criteria.hasNumber ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                            <i className={`fa-solid ${criteria.hasNumber ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Number (0-9)
                          </span>
                          <span className={cn("flex items-center gap-1 font-medium col-span-2", criteria.hasSpecial ? "text-emerald-500 font-semibold" : "text-muted-foreground")}>
                            <i className={`fa-solid ${criteria.hasSpecial ? "fa-circle-check text-emerald-500" : "fa-circle-notch opacity-40"}`} /> Special Character (!@#$%^&*)
                          </span>
                        </>
                      );
                    })()}
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
