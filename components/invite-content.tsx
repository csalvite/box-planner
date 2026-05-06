"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, LogOut, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { useAcceptInvitation } from "@/hooks/use-invitations";
import { organizationsQueryKey } from "@/hooks/use-organizations";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const token = searchParams.get("token");
  const { loading, session, user } = useAuth();
  const { refetch } = useActiveOrganization();
  const acceptInvitation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const invitePath = token
    ? `/invite?token=${encodeURIComponent(token)}`
    : "/invite";
  const loginHref = `/login?redirect=${encodeURIComponent(invitePath)}`;

  const handleUseOtherAccount = async () => {
    const supabase = getSupabaseBrowserClient();

    setSwitchingAccount(true);
    queryClient.clear();

    if (supabase) {
      await supabase.auth.signOut();
    }

    router.replace(loginHref);
  };

  const handleAccept = async () => {
    if (!token) {
      toast.error("falta el token de invitacion");
      return;
    }

    const acceptPromise = acceptInvitation.mutateAsync({ token });

    toast.promise(acceptPromise, {
      loading: "aceptando invitacion...",
      success: "invitación aceptada",
      error: "no se pudo aceptar",
    });

    try {
      await acceptPromise;
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
      await refetch();
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

        {token && !session && (
          <div className="mt-4 space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              inicia sesión o crea una cuenta para aceptar esta invitación.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href={loginHref}>iniciar sesión o crear cuenta</Link>
            </Button>
          </div>
        )}

        {token && session && (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-border/70 bg-background/55 px-3 py-3 text-left">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                cuenta actual
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-foreground">
                {user?.email ?? "email no disponible"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                vas a aceptar esta invitación con esta cuenta
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleAccept}
              disabled={acceptInvitation.isPending || switchingAccount || accepted}
            >
              {acceptInvitation.isPending ? "aceptando..." : "aceptar invitación"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full bg-transparent"
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
