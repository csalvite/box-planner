"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OrganizationOnboarding } from "@/components/organization-onboarding";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  getPendingInviteRedirect,
  isInviteRedirect,
} from "@/lib/invite-redirect";

export function OrganizationGate({ children }: { children: ReactNode }) {
  const { organizations, loading, error, refetch } = useActiveOrganization();
  const pathname = usePathname();
  const router = useRouter();
  const [pendingInviteRedirect, setPendingInviteRedirect] = useState<
    string | null
  >(() => getPendingInviteRedirect());

  useEffect(() => {
    setPendingInviteRedirect(getPendingInviteRedirect());
  }, []);

  useEffect(() => {
    if (
      !loading &&
      organizations.length === 0 &&
      isInviteRedirect(pendingInviteRedirect)
    ) {
      router.replace(pendingInviteRedirect);
    }
  }, [loading, organizations.length, pendingInviteRedirect, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        cargando organización...
      </div>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            no pudimos cargar tus organizaciones
          </h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <Button onClick={() => void refetch()}>reintentar</Button>
        </div>
      </main>
    );
  }

  if (
    organizations.length === 0 &&
    (pathname === "/invite" || isInviteRedirect(pendingInviteRedirect))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        cargando invitación...
      </div>
    );
  }

  if (organizations.length === 0) {
    return <OrganizationOnboarding />;
  }

  return children;
}
