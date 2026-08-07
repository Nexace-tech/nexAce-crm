"use client";

import React, { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPasswordCriteria, generateSecurePassword, cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(registerAction, undefined);
  
  // Input states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  
  // Verification states
  const [codeSent, setCodeSent] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [devPreviewUrl, setDevPreviewUrl] = useState("");
  const [devCode, setDevCode] = useState("");
  
  // Timers
  const [redirectTimer, setRedirectTimer] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const usernameify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w]/g, "_")
      .replace(/_+/g, "_");
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    if (!isUsernameManuallyEdited) {
      setUsername(usernameify(val));
    }
  };

  const handleSendCode = async () => {
    if (!email || !email.includes("@")) {
      setVerificationError("Please enter a valid email address first.");
      return;
    }

    setVerificationError("");
    setSendingCode(true);

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
        setCodeSent(true);
        setResendCooldown(30);
      } else {
        if (data.userExists || (data.error && data.error.includes("already registered"))) {
          setVerificationError("An account with this email address already exists. Redirecting to Sign In...");
          
          let secondsLeft = 5;
          setRedirectTimer(secondsLeft);
          const interval = setInterval(() => {
            secondsLeft -= 1;
            if (secondsLeft <= 0) {
              clearInterval(interval);
              router.push(`/login?email=${encodeURIComponent(email)}&redirected=true`);
            } else {
              setRedirectTimer(secondsLeft);
            }
          }, 1000);
        } else {
          setVerificationError(data.error || "Failed to send verification code. Please try again.");
        }
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
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-lg border border-border shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl tracking-tight">
            <i className="fa-solid fa-wand-magic-sparkles text-primary" />
            <span>NexAce CRM</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Employee Registration
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Create your account to access your workspace.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-3.5">
            {(state?.message || verificationError) && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                {state?.message || verificationError}
              </div>
            )}

            {/* Developer Mode Sandbox Code Notification */}
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

            {/* 1. Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="adminName" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-user text-muted-foreground text-xs" /> Full Name
                </label>
                <Input
                  id="adminName"
                  name="adminName"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={handleFullNameChange}
                  required
                />
                {state?.errors?.adminName && (
                  <span className="text-[11px] text-destructive font-medium">{state.errors.adminName[0]}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-at text-muted-foreground text-xs" /> Unique Username
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="e.g. john_doe"
                  value={username}
                  onChange={(e) => {
                    setIsUsernameManuallyEdited(true);
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""));
                  }}
                  required
                />
                {state?.errors?.username && (
                  <span className="text-[11px] text-destructive font-medium">{state.errors.username[0]}</span>
                )}
              </div>
            </div>

            {/* 2. Email Address & Code Request Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="adminEmail" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-muted-foreground text-xs" /> Email Address
                </label>
                {codeSent && (
                  <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-circle-check" /> Code Sent
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  placeholder="e.g. john@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 h-10"
                  required
                />
                <Button
                  type="button"
                  color="primary"
                  onClick={handleSendCode}
                  disabled={sendingCode || resendCooldown > 0 || redirectTimer !== null}
                  className="whitespace-nowrap text-xs h-10 px-4 shrink-0 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {redirectTimer !== null ? (
                    `Redirecting (${redirectTimer}s)`
                  ) : sendingCode ? (
                    "Sending..."
                  ) : resendCooldown > 0 ? (
                    `Resend (${resendCooldown}s)`
                  ) : codeSent ? (
                    <>
                      <i className="fa-solid fa-rotate-right text-xs" /> Resend Code
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-xs" /> Send Code
                    </>
                  )}
                </Button>
              </div>
              {state?.errors?.adminEmail && (
                <span className="text-[11px] text-destructive font-medium">{state.errors.adminEmail[0]}</span>
              )}
            </div>

            {/* 3. 6-Digit OTP Verification Code */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="code" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-key text-muted-foreground text-xs" /> 6-Digit Email Verification Code
                </label>
                {codeSent && (
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || resendCooldown > 0}
                    className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-rotate-right text-[10px]" />
                    {sendingCode
                      ? "Resending..."
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend Code"}
                  </button>
                )}
              </div>
              <Input
                id="code"
                name="code"
                type="text"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder={codeSent ? "Enter 6-digit code received in email" : "Click 'Send Code' to receive OTP"}
                className="font-mono text-center tracking-widest text-base font-bold"
                required
              />
              {state?.errors?.code && (
                <span className="text-[11px] text-destructive font-medium">{state.errors.code[0]}</span>
              )}
            </div>

            {/* 4. Password with Eye Icon */}
            <div className="space-y-1.5">
              <label htmlFor="adminPassword" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-lock text-muted-foreground text-xs" /> Password
              </label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  name="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-16"
                  required
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateSecurePassword();
                      setPassword(generated);
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
                    className="hover:text-foreground transition-colors cursor-pointer p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                  </button>
                </div>
              </div>

              {/* Password Pattern Strength Checklist */}
              {password.length > 0 && (
                <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg text-[11px] grid grid-cols-2 gap-1.5 transition-all">
                  {(() => {
                    const criteria = getPasswordCriteria(password);
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

              {state?.errors?.adminPassword && (
                <span className="text-[11px] text-destructive font-medium">{state.errors.adminPassword[0]}</span>
              )}
            </div>

            {/* Submit Registration Button */}
            <Button
              color="primary"
              className="w-full gap-2 font-semibold pt-2"
              type="submit"
              disabled={isPending || redirectTimer !== null}
            >
              {redirectTimer !== null ? (
                `Redirecting to Sign In (${redirectTimer}s)...`
              ) : isPending ? (
                "Creating Account..."
              ) : (
                <>
                  <span>Complete Registration</span>
                  <i className="fa-solid fa-arrow-right text-xs" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline ml-1">
            Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
