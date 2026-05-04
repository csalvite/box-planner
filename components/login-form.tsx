"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/components/providers/auth-provider";

type AuthMode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const { loading: authLoading, session } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      router.replace("/");
    }
  }, [authLoading, router, session]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Faltan las variables públicas de Supabase.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setSubmitting(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace("/");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace("/");
      return;
    }

    setNotice("Cuenta creada. Revisa tu correo para confirmar el acceso.");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "register"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          crear cuenta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {mode === "register" && (
          <div className="space-y-2">
            <Label htmlFor="confirm-password">confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
        )}

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {notice && (
          <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? mode === "login"
              ? "entrando..."
              : "creando..."
            : mode === "login"
              ? "entrar"
              : "crear cuenta"}
        </Button>
      </form>
    </div>
  );
}
