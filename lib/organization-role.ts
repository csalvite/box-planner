import type { Organization } from "@/lib/api/types";

export function getOrganizationRole(organization?: Organization | null) {
  const role =
    organization?.role ??
    organization?.membership?.role ??
    organization?.member?.role ??
    organization?.organizationUser?.role ??
    null;

  return typeof role === "string" ? role.toUpperCase() : null;
}

export function isViewerOrganization(organization?: Organization | null) {
  return getOrganizationRole(organization) === "VIEWER";
}

export function isStaffOrganization(organization?: Organization | null) {
  const role = getOrganizationRole(organization);

  return role === "OWNER" || role === "ADMIN" || role === "COACH";
}
