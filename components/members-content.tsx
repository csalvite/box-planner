"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, MailPlus, UserMinus, UsersRound } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  useOrganizationMembers,
  useRemoveOrganizationMember,
} from "@/hooks/use-members";
import type { Invitation } from "@/lib/api/invitations";
import type { OrganizationMember } from "@/lib/api/members";
import type { OrganizationRole } from "@/lib/api/types";
import { getOrganizationRole, isStaffOrganization } from "@/lib/organization-role";
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

const memberRoleLabels: Record<string, string> = {
  OWNER: "propietario",
  ADMIN: "administrador",
  COACH: "coach",
  VIEWER: "alumno",
};

const memberStatusLabels: Record<string, string> = {
  ACTIVE: "activo",
  INVITED: "invitado",
  SUSPENDED: "suspendido",
  REMOVED: "eliminado",
};

const memberStatusColors: Record<string, string> = {
  ACTIVE: "bg-chart-2/15 text-chart-2 ring-chart-2/20",
  INVITED: "bg-primary/10 text-primary ring-primary/15",
  SUSPENDED: "bg-chart-5/15 text-chart-5 ring-chart-5/20",
  REMOVED: "bg-muted text-muted-foreground ring-border",
};

type MemberFilter = "active" | "all" | "students" | "coaches";

const memberFilterOptions: Array<{ value: MemberFilter; label: string }> = [
  { value: "active", label: "activos" },
  { value: "all", label: "todos" },
  { value: "students", label: "alumnos" },
  { value: "coaches", label: "coaches" },
];

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

function getMemberRole(member: OrganizationMember) {
  return String(member.role ?? member.membership?.role ?? "VIEWER").toUpperCase();
}

function getMemberStatus(member: OrganizationMember) {
  return String(
    member.status ?? member.membership?.status ?? "ACTIVE",
  ).toUpperCase();
}

function getMemberName(member: OrganizationMember) {
  return (
    member.displayName ??
    member.profile?.displayName ??
    member.user?.profile?.displayName ??
    member.name ??
    member.user?.displayName ??
    member.user?.name ??
    member.email ??
    member.user?.email ??
    "miembro"
  );
}

function getMemberEmail(member: OrganizationMember) {
  return member.email ?? member.user?.email ?? null;
}

function getMemberAvatar(member: OrganizationMember) {
  return (
    member.avatarUrl ??
    member.profile?.avatarUrl ??
    member.user?.profile?.avatarUrl ??
    member.user?.avatarUrl ??
    null
  );
}

function getMemberJoinedAt(member: OrganizationMember) {
  return member.joinedAt ?? member.membership?.joinedAt ?? member.createdAt ?? null;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

function filterMembers(members: OrganizationMember[], filter: MemberFilter) {
  return members.filter((member) => {
    const role = getMemberRole(member);
    const status = getMemberStatus(member);

    if (filter !== "all" && status === "REMOVED") {
      return false;
    }

    if (filter === "students") {
      return role === "VIEWER";
    }

    if (filter === "coaches") {
      return role === "COACH";
    }

    if (filter === "active") {
      return status === "ACTIVE";
    }

    return true;
  });
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

function MemberCard({
  member,
  canManageMembers,
  onRemove,
  removing,
}: {
  member: OrganizationMember;
  canManageMembers: boolean;
  onRemove: (member: OrganizationMember) => void;
  removing: boolean;
}) {
  const name = getMemberName(member);
  const email = getMemberEmail(member);
  const avatar = getMemberAvatar(member);
  const role = getMemberRole(member);
  const status = getMemberStatus(member);
  const joinedAt = formatDate(getMemberJoinedAt(member));
  const canRemoveMember =
    canManageMembers && role === "VIEWER" && status !== "REMOVED";

  return (
    <Card className="border-border/80 bg-card/70 p-4 shadow-md shadow-black/10 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-11 ring-1 ring-border">
            {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
            <AvatarFallback className="bg-primary/15 font-semibold text-primary">
              {getInitial(name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-2">
            <div>
              <h3 className="truncate text-base font-semibold text-foreground">
                {name}
              </h3>
              {email && email !== name ? (
                <p className="truncate text-sm text-muted-foreground">{email}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
                {memberRoleLabels[role] ?? role.toLowerCase()}
              </span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium ring-1",
                  memberStatusColors[status] ?? memberStatusColors.ACTIVE,
                )}
              >
                {memberStatusLabels[status] ?? status.toLowerCase()}
              </span>
              <span className="rounded-full bg-background/55 px-3 py-1 text-xs text-muted-foreground ring-1 ring-border/70">
                {joinedAt ? `alta ${joinedAt}` : "alta sin fecha"}
              </span>
            </div>
          </div>
        </div>

        {canRemoveMember ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full bg-transparent text-destructive hover:text-destructive md:w-auto"
                disabled={removing}
              >
                <UserMinus className="h-4 w-4" />
                desactivar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>desactivar alumno</AlertDialogTitle>
                <AlertDialogDescription>
                  este alumno dejara de aparecer como activo en la organizacion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onRemove(member)}
                >
                  desactivar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </Card>
  );
}

export function MembersContent() {
  const { activeOrganization, activeOrganizationId } = useActiveOrganization();
  const canAccessMembers = isStaffOrganization(activeOrganization);
  const membersOrganizationId = canAccessMembers ? activeOrganizationId : null;
  const membersQuery = useOrganizationMembers(membersOrganizationId);
  const removeMember = useRemoveOrganizationMember(membersOrganizationId);
  const invitationsQuery = useInvitations(membersOrganizationId);
  const createInvitation = useCreateInvitation(membersOrganizationId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("VIEWER");
  const [formError, setFormError] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("active");
  const invitations = invitationsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const filteredMembers = useMemo(
    () => filterMembers(members, memberFilter),
    [memberFilter, members],
  );
  const currentRole = getOrganizationRole(activeOrganization);
  const canManageMembers = currentRole === "OWNER" || currentRole === "ADMIN";

  if (!canAccessMembers) {
    return (
      <EmptyState
        title="no tienes acceso a miembros"
        description="esta pantalla esta disponible para owners, admins y coaches."
        icon={UsersRound}
        className="min-h-[420px]"
      />
    );
  }

  const handleRemoveMember = (member: OrganizationMember) => {
    const removePromise = removeMember.mutateAsync(member.id);

    toast.promise(removePromise, {
      loading: "desactivando alumno...",
      success: "alumno desactivado",
      error: "no se pudo desactivar el alumno",
    });
  };

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
          revisa alumnos y coaches, y comparte invitaciones cuando haga falta.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">miembros</h2>
            <p className="text-sm text-muted-foreground">
              {filteredMembers.length} de {members.length} miembros visibles
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {memberFilterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={memberFilter === option.value ? "default" : "outline"}
                size="sm"
                className={cn(
                  "shrink-0",
                  memberFilter !== option.value && "bg-transparent",
                )}
                onClick={() => setMemberFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {membersQuery.isLoading && (
          <LoadingState
            title="cargando miembros"
            description="estamos leyendo los miembros de la organizacion."
            className="min-h-[320px]"
          />
        )}

        {membersQuery.error && (
          <ErrorState
            title="no pudimos cargar miembros"
            description={membersQuery.error.message}
            actionLabel="reintentar"
            onAction={() => void membersQuery.refetch()}
            className="min-h-[320px]"
          />
        )}

        {!membersQuery.isLoading &&
          !membersQuery.error &&
          filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              canManageMembers={canManageMembers}
              onRemove={handleRemoveMember}
              removing={removeMember.isPending}
            />
          ))}

        {!membersQuery.isLoading &&
          !membersQuery.error &&
          filteredMembers.length === 0 && (
            <EmptyState
              title="no hay miembros en este filtro"
              description="prueba con otro filtro o crea una invitacion."
              icon={UsersRound}
              className="min-h-[320px]"
            />
          )}
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
