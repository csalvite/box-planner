import { apiFetch } from "@/lib/api/client";
import type { OrganizationRole } from "@/lib/api/types";

export type OrganizationMemberStatus =
  | "ACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "REMOVED"
  | "active"
  | "invited"
  | "suspended"
  | "removed"
  | string;

export interface OrganizationMember {
  id: string;
  userId?: string | null;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  role?: OrganizationRole | string | null;
  status?: OrganizationMemberStatus | null;
  joinedAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  user?: {
    email?: string | null;
    name?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
    profile?: {
      displayName?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
  profile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  membership?: {
    role?: OrganizationRole | string | null;
    status?: OrganizationMemberStatus | null;
    joinedAt?: string | Date | null;
    createdAt?: string | Date | null;
  } | null;
}

export interface UpdateOrganizationMemberInput {
  role?: OrganizationRole | string;
  status?: OrganizationMemberStatus;
}

type OrganizationMembersResponse =
  | OrganizationMember[]
  | {
      members?: OrganizationMember[];
      data?: OrganizationMember[];
    };

function unwrapMembers(response: OrganizationMembersResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.members ?? response.data ?? [];
}

export async function getOrganizationMembers(
  organizationId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<OrganizationMembersResponse>(
    `/organizations/${organizationId}/members`,
    { accessToken },
  );

  return unwrapMembers(response);
}

export async function updateOrganizationMember(
  organizationId: string,
  memberId: string,
  input: UpdateOrganizationMemberInput,
  accessToken?: string | null,
) {
  return apiFetch<OrganizationMember>(
    `/organizations/${organizationId}/members/${memberId}`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function removeOrganizationMember(
  organizationId: string,
  memberId: string,
  accessToken?: string | null,
) {
  return apiFetch<void>(`/organizations/${organizationId}/members/${memberId}`, {
    accessToken,
    method: "DELETE",
  });
}
