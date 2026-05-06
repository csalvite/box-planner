"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, CheckCircle2, LogOut, MailCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  useAcceptInvitation,
  useInvitationPreview,
  useRegisterFromInvitation,
} from "@/hooks/use-invitations";
import { organizationsQueryKey } from "@/hooks/use-organizations";
import {
  clearPendingInviteRedirect,
  setPendingInviteRedirect,
} from "@/lib/invite-redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

function getInviteRoleLabel(role?: string | null) {
  const normalizedRole = role?.toUpperCase();

  if (normalizedRole === "VIEWER") {
    return "alumno";
  }

  if (normalizedRole === "COACH") {
    return "coach";
  }

  return normalizedRole?.toLowerCase() ?? "miembro";
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function getAcceptInvitationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("email") &&
    (message.includes("match") ||
      message.includes("mismatch") ||
      message.includes("coincid") ||
      message.includes("distint") ||
      message.includes("diferent"))
  ) {
    return "esta invitación pertenece a otra cuenta. usa la cuenta invitada para aceptarla";
  }

  return "no se pudo aceptar";
}

export function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const token = searchParams.get("token");
  const { loading, session, user } = useAuth();
  const { refetch } = useActiveOrganization();
  const acceptInvitation = useAcceptInvitation();
  const registerFromInvitation = useRegisterFromInvitation();
  const [accepted, setAccepted] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const invitePath = token
    ? `/invite?token=${encodeURIComponent(token)}`
    : "/invite";
  const loginHref = `/login?redirect=${encodeURIComponent(invitePath)}`;
  const previewQuery = useInvitationPreview(token);
  const preview = previewQuery.data;
  const roleLabel = getInviteRoleLabel(preview?.role);
  const invitationAccepted = preview?.status?.toUpperCase() === "ACCEPTED";
  const sessionEmail = user?.email ?? session?.user.email ?? null;
  const emailMismatch = Boolean(
    preview?.email &&
      sessionEmail &&
      normalizeEmail(preview.email) !== normalizeEmail(sessionEmail),
  );
  const mismatchMessage =
    preview?.email && sessionEmail && emailMismatch
      ? `esta invitación es para ${preview.email}, pero estás conectado como ${sessionEmail}`
      : null;

  useEffect(() => {
    if (token) {
      setPendingInviteRedirect(invitePath);
    }
  }, [invitePath, token]);

  useEffect(() => {
    if (invitationAccepted) {
      clearPendingInviteRedirect();
    }
  }, [invitationAccepted]);

  const handleUseOtherAccount = async () => {
    const supabase = getSupabaseBrowserClient();

    setSwitchingAccount(true);
    queryClient.clear();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.replace(loginHref);
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!token || !preview) {
      setFormError("No pudimos leer esta invitacion.");
      return;
    }

    if (!displayName.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    if (password.length < 8) {
      setFormError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Las contrasenas no coinciden.");
      return;
    }

    try {
      await registerFromInvitation.mutateAsync({
        token,
        displayName: displayName.trim(),
        password,
      });

      clearPendingInviteRedirect();
      toast.success("cuenta creada. inicia sesión para entrar a tu panel");
      router.replace(
        `/login?email=${encodeURIComponent(preview.email)}&registeredFromInvite=1`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la cuenta.";

      setFormError(message);
      toast.error("no se pudo crear la cuenta");
    }
  };

  const handleAccept = async () => {
    if (!token) {
      toast.error("falta el token de invitacion");
      return;
    }

    if (mismatchMessage) {
      toast.warning(mismatchMessage);
      return;
    }

    const acceptPromise = acceptInvitation.mutateAsync({ token });

    toast.promise(acceptPromise, {
      loading: "aceptando invitacion...",
      success: "invitación aceptada",
      error: getAcceptInvitationErrorMessage,
    });

    try {
      await acceptPromise;
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
      await refetch();
      clearPendingInviteRedirect();
      setAccepted(true);
      router.replace("/");
    } catch {
      // react query keeps the detailed error for the button state
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-sm text-muted-foreground">cargando invitacion...</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md border-border/80 bg-card/90 p-6 text-center shadow-2xl shadow-black/25 ring-1 ring-white/10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {accepted ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <MailCheck className="h-6 w-6" />
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold text-foreground">
          invitacion a Box Planner
        </h1>

        {!token && (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              este enlace no incluye token. pide a tu entrenador un enlace nuevo.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">ir a login</Link>
            </Button>
          </div>
        )}

        {token && previewQuery.isLoading && (
          <div className="mt-4 rounded-md border border-border/70 bg-background/55 px-3 py-4">
            <p className="text-sm text-muted-foreground">
              cargando datos de la invitación...
            </p>
          </div>
        )}

        {token && previewQuery.error && (
          <div className="mt-4 space-y-4">
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              no pudimos cargar esta invitación
            </p>
            <Button asChild className="w-full">
              <Link href="/login">ir a login</Link>
            </Button>
          </div>
        )}

        {token && preview && (
          <div className="mt-4 space-y-3 text-left">
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-3">
              <p className="text-sm font-semibold text-primary">
                {invitationAccepted
                  ? "esta invitación ya fue aceptada"
                  : `te han invitado como ${roleLabel}`}
              </p>
              {!session && !invitationAccepted ? (
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  crea tu cuenta para unirte a esta organización
                </p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border/70 bg-background/55 px-3 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  organización
                </div>
                <p className="mt-1 break-words text-sm font-semibold text-foreground">
                  {preview.organizationName}
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/55 px-3 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  invitado
                </div>
                <p className="mt-1 break-all text-sm font-semibold text-foreground">
                  {preview.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
          </div>
        )}

        {token && preview && invitationAccepted && (
          <div className="mt-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/">ir al inicio</Link>
            </Button>
          </div>
        )}

        {token && preview && !session && !invitationAccepted && (
          <form onSubmit={handleRegister} className="mt-4 space-y-4 text-left">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                crear cuenta para unirte
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                usa estos datos para crear tu acceso como {roleLabel}.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-register-email">email</Label>
              <Input
                id="invite-register-email"
                type="email"
                value={preview.email}
                readOnly
                className="bg-background/55"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-register-name">nombre</Label>
              <Input
                id="invite-register-name"
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-register-password">contrasena</Label>
              <Input
                id="invite-register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-register-confirm-password">
                confirmar contrasena
              </Label>
              <Input
                id="invite-register-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            {formError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={registerFromInvitation.isPending}
            >
              {registerFromInvitation.isPending
                ? "creando..."
                : "crear cuenta para unirte"}
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full bg-transparent"
            >
              <Link href={`${loginHref}&email=${encodeURIComponent(preview.email)}`}>
                ya tengo cuenta, iniciar sesión
              </Link>
            </Button>
          </form>
        )}

        {token && preview && session && !invitationAccepted && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-border/70 bg-background/55 px-3 py-3 text-left">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                cuenta actual
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-foreground">
                {sessionEmail ?? "email no disponible"}
              </p>
              {!emailMismatch ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  vas a aceptar esta invitación con esta cuenta
                </p>
              ) : null}
            </div>

            {mismatchMessage ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-left text-sm leading-6 text-destructive">
                {mismatchMessage}
              </p>
            ) : (
              <Button
                size="lg"
                className="w-full"
                onClick={handleAccept}
                disabled={acceptInvitation.isPending || switchingAccount || accepted}
              >
                {acceptInvitation.isPending ? "aceptando..." : "aceptar invitación"}
              </Button>
            )}

            <Button
              type="button"
              variant={emailMismatch ? "default" : "outline"}
              size="lg"
              className={cn("w-full", !emailMismatch && "bg-transparent")}
              onClick={handleUseOtherAccount}
              disabled={acceptInvitation.isPending || switchingAccount || accepted}
            >
              <LogOut className="h-4 w-4" />
              {switchingAccount ? "saliendo..." : "usar otra cuenta"}
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
