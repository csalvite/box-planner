"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMe } from "@/hooks/use-me";
import { getOrganizationRole } from "@/lib/organization-role";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, string> = {
  OWNER: "propietario",
  ADMIN: "administrador",
  COACH: "coach",
  VIEWER: "alumno",
};

interface UserNavSummaryProps {
  compact?: boolean;
  className?: string;
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "?";
}

export function UserNavSummary({
  compact = false,
  className,
}: UserNavSummaryProps) {
  const { user } = useAuth();
  const { activeOrganization } = useActiveOrganization();
  const meQuery = useMe();
  const me = meQuery.data;
  const profile =
    me && typeof me.profile === "object" && me.profile ? me.profile : null;
  const metadata = user?.user_metadata ?? {};
  const displayName =
    getStringValue(profile && "displayName" in profile ? profile.displayName : null) ??
    getStringValue(me?.name) ??
    getStringValue(metadata.displayName) ??
    getStringValue(metadata.name) ??
    getStringValue(metadata.full_name) ??
    getStringValue(user?.email) ??
    "usuario";
  const email = getStringValue(me?.email) ?? getStringValue(user?.email);
  const avatarUrl =
    getStringValue(profile && "avatarUrl" in profile ? profile.avatarUrl : null) ??
    getStringValue(metadata.avatar_url) ??
    getStringValue(metadata.picture);
  const role = getOrganizationRole(activeOrganization);
  const roleLabel = role ? roleLabels[role] ?? role.toLowerCase() : "sin rol";

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg border border-border/80 bg-background/55 p-3 text-left",
        compact && "gap-2 p-2",
        className,
      )}
    >
      <Avatar className={cn("size-10 ring-1 ring-border", compact && "size-9")}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
          {getInitial(displayName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-5 text-foreground">
          {displayName}
        </p>
        {!compact && email && email !== displayName ? (
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        ) : null}
        <p className="truncate text-xs text-muted-foreground">
          {roleLabel}
          {activeOrganization?.name ? ` en ${activeOrganization.name}` : ""}
        </p>
      </div>
    </div>
  );
}
