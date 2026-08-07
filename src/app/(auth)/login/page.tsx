"use client";

import React, { useActionState, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email") || "";
  const isRedirected = searchParams.get("redirected") === "true";
  const isPendingApproval = searchParams.get("pending") === "true";

  const [state, formAction, isPending] = useActionState(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

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
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Sign In</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Enter your credentials to access your workspace.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4">
            {isPendingApproval && (
              <div className="p-3.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg font-medium space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <i className="fa-solid fa-clock text-amber-500" /> Account Pending Admin Approval
                </div>
                <p className="leading-relaxed">
                  Your employee registration was submitted successfully! An approval request has been sent to your administrator. You will be able to sign in once an admin approves your request.
                </p>
              </div>
            )}

            {isRedirected && !isPendingApproval && (
              <div className="p-3 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md font-medium flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-base" />
                <span>An account with this email address already exists. Please sign in below.</span>
              </div>
            )}

            {state?.step === "reset" && (
              <div className="p-3.5 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg font-medium space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <i className="fa-solid fa-circle-exclamation text-amber-500" /> Password Reset Required
                </div>
                <p className="leading-relaxed">{state.message}</p>
                <p className="leading-relaxed">
                  Use the <span className="text-primary font-semibold">Forgot?</span> link below to receive a
                  verification code and set a new password.
                </p>
              </div>
            )}

            {state?.message && state?.step !== "reset" && (
              <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                {state.message}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-envelope text-muted-foreground text-xs" /> Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                key={state?.enteredEmail ?? urlEmail}
                defaultValue={state?.enteredEmail ?? urlEmail}
                placeholder="e.g. admin@nexace.com"
                required
              />
              {state?.errors?.email && (
                <span className="text-[11px] text-destructive font-medium">{state.errors.email[0]}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-lock text-muted-foreground text-xs" /> Password
                </label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  key={state?.enteredPassword ?? "password-input"}
                  defaultValue={state?.enteredPassword ?? ""}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-xs`} />
                </button>
              </div>
              {state?.errors?.password && (
                <span className="text-[11px] text-destructive font-medium">{state.errors.password[0]}</span>
              )}
            </div>

            <Button color="primary" className="w-full gap-2 font-semibold" type="submit" disabled={isPending}>
              {isPending ? "Signing In..." : "Log In"}
              <i className="fa-solid fa-arrow-right text-xs" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t border-border pt-4 text-xs text-muted-foreground">
          Need a workspace for your company?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline ml-1">
            Create Account
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
