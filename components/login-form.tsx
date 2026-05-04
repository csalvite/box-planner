"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { CheckCircle2, MailCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/components/providers/auth-provider";

type AuthMode = "login" | "register";

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("email not confirmed") ||
    normalizedMessage.includes("email_not_confirmed")
  ) {
    return "Tu email todavia no esta confirmado. Revisa tu correo y abre el enlace de confirmacion antes de iniciar sesion.";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "El email o la contrasena no son correctos.";
  }

  return message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    const confirmed = searchParams.get("confirmed");

    if (confirmed === "1") {
      setNotice("Email confirmado. Ya puedes iniciar sesion.");
      setMode("login");
    }
  }, [searchParams]);

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
      setError("Faltan las variables publicas de Supabase.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
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
        setError(getAuthErrorMessage(signInError.message));
        return;
      }

      router.replace("/");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(getAuthErrorMessage(signUpError.message));
      return;
    }

    if (data.session) {
      router.replace("/");
      return;
    }

    setNotice(
      "Cuenta creada. Revisa tu correo y confirma el email antes de iniciar sesion.",
    );
    setMode("login");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 rounded-lg border border-border/70 bg-background/60 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "login"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          iniciar sesion
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "register"
              ? "bg-primary text-primary-foreground shadow-sm"
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
          <Label htmlFor="password">contrasena</Label>
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
            <Label htmlFor="confirm-password">confirmar contrasena</Label>
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
          <div className="rounded-md border border-destructive/45 bg-destructive/10 px-3 py-3 text-sm text-destructive">
            <p>{error}</p>
            {error.includes("confirma") || error.includes("confirmado") ? (
              <p className="mt-2 text-xs text-destructive/85">
                Si no ves el correo, revisa spam o solicita un nuevo registro
                con el mismo email.
              </p>
            ) : null}
          </div>
        )}

        {notice && (
          <div className="flex gap-3 rounded-md border border-primary/35 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p>{notice}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Despues de confirmar, vuelve aqui para iniciar sesion.
              </p>
            </div>
          </div>
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

        {mode === "login" && (
          <div className="flex items-start gap-2 rounded-md border border-border/70 bg-background/45 px-3 py-3 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Si acabas de crear tu cuenta, confirma primero el email desde el
              correo de Supabase.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
