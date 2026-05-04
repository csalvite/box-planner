"use client";

import { Building2 } from "lucide-react";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { cn } from "@/lib/utils";

interface ActiveOrganizationDisplayProps {
  className?: string;
}

export function ActiveOrganizationDisplay({
  className,
}: ActiveOrganizationDisplayProps) {
  const { activeOrganization } = useActiveOrganization();

  if (!activeOrganization) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <Building2 className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{activeOrganization.name}</span>
    </div>
  );
}
