"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { loginAction } from "@/lib/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full bg-sfx-red hover:bg-sfx-red/90 text-white font-medium mt-2"
      disabled={pending}
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useFormState(loginAction, { error: null });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo-primary.svg"
            alt="SFx Burger"
            width={80}
            height={80}
            priority
          />
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
            Unique Taste Everyday
          </p>
        </div>

        {/* Login card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              Sign in
            </CardTitle>
            <CardDescription>Order Management System</CardDescription>
          </CardHeader>

          <CardContent>
            <form action={formAction} className="space-y-4">

              {/* Server error */}
              {state.error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@sfxburger.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <SubmitButton />
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground font-mono">
          OMS v2.0
        </p>
      </div>
    </div>
  );
}
