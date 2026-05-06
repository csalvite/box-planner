"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, MailPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  useCreateInvitation,
  useInvitations,
} from "@/hooks/use-invitations";
import type { Invitation } from "@/lib/api/invitations";
import type { OrganizationRole } from "@/lib/api/types";
import { isStaffOrganization } from "@/lib/organization-role";
import { cn } from "@/lib/utils";

const roleOptions: Array<{ value: OrganizationRole; label: string }> = [
  { value: "VIEWER", label: "alumno" },
  { value: "COACH", label: "coach" },
  { value: "ADMIN", label: "admin" },
];

const statusLabels: Record<string, string> = {
  PENDING: "pendiente",
  ACCEPTED: "aceptada",
  EXPIRED: "caducada",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-primary/10 text-primary ring-primary/15",
  ACCEPTED: "bg-chart-2/15 text-chart-2 ring-chart-2/20",
  EXPIRED: "bg-destructive/10 text-destructive ring-destructive/20",
};

function normalizeStatus(status?: string | null) {
  return (status ?? "PENDING").toUpperCase();
}

function formatDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildInviteLink(token?: string | null) {
  if (!token) {
    return null;
  }

  const path = `/invite?token=${encodeURIComponent(token)}`;

  if (typeof window === "undefined") {
    return path;
  }

  return `${window.location.origin}${path}`;
}

function getInviteLink(invitation: Invitation) {
  return invitation.inviteUrl ?? buildInviteLink(invitation.token);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const status = normalizeStatus(invitation.status);
  const inviteLink = getInviteLink(invitation);
  const createdAt = formatDate(invitation.createdAt);
  const acceptedAt = formatDate(invitation.acceptedAt);

  const handleCopy = async () => {
    if (!inviteLink) {
      toast.error("esta invitacion no incluye token");
      return;
    }

    try {
      await copyText(inviteLink);
      toast.success("enlace copiado");
    } catch {
      toast.error("no se pudo copiar el enlace");
    }
  };

  return (
    <Card className="border-border/80 bg-card/70 p-5 shadow-md shadow-black/15">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1",
                statusColors[status] ?? statusColors.PENDING,
              )}
            >
              {statusLabels[status] ?? status.toLowerCase()}
            </span>
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
              {String(invitation.role).toLowerCase()}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {invitation.email}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {acceptedAt
                ? `aceptada el ${acceptedAt}`
                : createdAt
                  ? `creada el ${createdAt}`
                  : "sin fecha"}
            </p>
          </div>

          {inviteLink ? (
            <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2 text-xs text-muted-foreground break-all">
              {inviteLink}
            </div>
          ) : null}
        </div>

        <Button
          variant="outline"
          size="lg"
          className="bg-transparent"
          onClick={handleCopy}
          disabled={!inviteLink}
        >
          <Copy className="h-4 w-4" />
          copiar
        </Button>
      </div>
    </Card>
  );
}

export function MembersContent() {
  const { activeOrganization, activeOrganizationId } = useActiveOrganization();
  const invitationsQuery = useInvitations(activeOrganizationId);
  const createInvitation = useCreateInvitation(activeOrganizationId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("VIEWER");
  const [formError, setFormError] = useState<string | null>(null);

  if (!isStaffOrganization(activeOrganization)) {
    return (
      <EmptyState
        title="no tienes acceso a miembros"
        description="esta pantalla esta disponible para owners, admins y coaches."
        icon={UsersRound}
        className="min-h-[420px]"
      />
    );
  }

  const invitations = invitationsQuery.data ?? [];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    let createToastId: string | number | undefined;

    if (!email.trim()) {
      setFormError("El email es obligatorio.");
      return;
    }

    try {
      const createPromise = createInvitation.mutateAsync({
        email: email.trim(),
        role,
      });
      createToastId = toast.loading("creando invitacion...");
      const result = await createPromise;

      if (result.emailSent) {
        toast.success("invitación enviada por correo", { id: createToastId });
      } else {
        toast.warning("no se envió el correo, copia el enlace", {
          id: createToastId,
        });
      }

      setEmail("");
      setRole("VIEWER");
    } catch (error) {
      toast.error("no se pudo crear la invitacion", { id: createToastId });
      setFormError(
        error instanceof Error ? error.message : "No se pudo crear la invitacion.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Miembros
        </h1>
        <p className="mt-1 text-muted-foreground">
          invita alumnos y comparte enlaces de acceso a tu organizacion.
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
        <Card className="border-border/80 bg-card/70 p-5 shadow-md shadow-black/15">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  nueva invitacion
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  si el correo no llega, puedes copiar y enviar este enlace manualmente.
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MailPlus className="h-5 w-5" />
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="alumno@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">rol</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as OrganizationRole)}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={createInvitation.isPending}
            >
              <MailPlus className="h-4 w-4" />
              {createInvitation.isPending ? "creando..." : "crear invitacion"}
            </Button>
          </form>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              invitaciones
            </h2>
            <p className="text-sm text-muted-foreground">
              {invitations.length} invitaciones registradas
            </p>
          </div>

          {invitationsQuery.isLoading && (
            <LoadingState
              title="cargando invitaciones"
              description="estamos leyendo los enlaces creados."
              className="min-h-[320px]"
            />
          )}

          {invitationsQuery.error && (
            <ErrorState
              title="no pudimos cargar invitaciones"
              description={invitationsQuery.error.message}
              actionLabel="reintentar"
              onAction={() => void invitationsQuery.refetch()}
              className="min-h-[320px]"
            />
          )}

          {!invitationsQuery.isLoading &&
            !invitationsQuery.error &&
            invitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))}

          {!invitationsQuery.isLoading &&
            !invitationsQuery.error &&
            invitations.length === 0 && (
              <EmptyState
                title="todavia no hay invitaciones"
                description="crea una invitacion para copiar el enlace y compartirlo con un alumno."
                icon={UsersRound}
                className="min-h-[320px]"
              />
            )}
        </section>
      </div>
    </div>
  );
}
