"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Sparkles, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, undefined);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Dynamic Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border border-border shadow-2xl relative z-10 animate-in fade-in zoom-in-95">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Sparkles className="w-6 h-6 fill-primary text-primary" />
            <span>NexAce CRM</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Reset Password</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Enter your email to receive a temporary password reset link.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state?.success ? (
            <div className="space-y-4 text-center animate-in fade-in">
              <div className="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-medium">
                {state.message}
              </div>
              <Button asChild color="primary" className="w-full gap-2">
                <Link href="/login">
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </Link>
              </Button>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              {state?.message && (
                <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md font-medium">
                  {state.message}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="e.g. admin@nex.com"
                  required
                />
                {state?.errors?.email && (
                  <span className="text-[11px] text-destructive font-medium">{state.errors.email[0]}</span>
                )}
              </div>

              <Button color="primary" className="w-full gap-2 font-semibold" type="submit" disabled={isPending}>
                {isPending ? "Sending Link..." : "Send Reset Link"}
                <ArrowRight className="w-4 h-4" />
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
