"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getSafeRedirect,
  isInviteRedirect,
  setPendingInviteRedirect,
} from "@/lib/invite-redirect";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("confirmando tu email...");
  const redirectPath = getSafeRedirect(searchParams.get("redirect"));

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("faltan las variables publicas de Supabase.");
      return;
    }

    const code = searchParams.get("code");
    const loginPath = `/login?confirmed=1${
      isInviteRedirect(redirectPath)
        ? `&redirect=${encodeURIComponent(redirectPath)}`
        : ""
    }`;

    if (!code) {
      router.replace(loginPath);
      return;
    }

    if (isInviteRedirect(redirectPath)) {
      setPendingInviteRedirect(redirectPath);
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setMessage("no pudimos confirmar la sesion. vuelve a iniciar sesion.");
        router.replace(loginPath);
        return;
      }

      router.replace(redirectPath);
    });
  }, [redirectPath, router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-lg border border-border/80 bg-card/90 p-8 text-center shadow-2xl shadow-black/25">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          confirmacion de email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackContent />
    </Suspense>
  );
}
