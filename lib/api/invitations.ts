import { apiFetch } from "@/lib/api/client";
import type { OrganizationRole } from "@/lib/api/types";

export type InvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "pending"
  | "accepted"
  | "expired"
  | string;

export interface Invitation {
  id: string;
  organizationId?: string;
  email: string;
  role: OrganizationRole | string;
  status?: InvitationStatus | null;
  token?: string | null;
  acceptedAt?: string | Date | null;
  expiresAt?: string | Date | null;
  createdAt?: string | Date | null;
}

export interface CreateInvitationInput {
  email: string;
  role: OrganizationRole | string;
}

export interface AcceptInvitationInput {
  token: string;
}

export interface AcceptInvitationResponse {
  organizationId?: string;
  organization?: {
    id: string;
    name?: string;
  };
}

type InvitationsResponse =
  | Invitation[]
  | {
      invitations?: Invitation[];
      data?: Invitation[];
    };

type InvitationResponse =
  | Invitation
  | {
      invitation?: Invitation;
      data?: Invitation;
    };

function unwrapInvitations(response: InvitationsResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.invitations ?? response.data ?? [];
}

function unwrapInvitation(response: InvitationResponse) {
  if ("id" in response) {
    return response;
  }

  const invitation = response.invitation ?? response.data ?? null;

  if (!invitation) {
    throw new Error("La API no devolvio la invitacion");
  }

  return invitation;
}

export async function getInvitations(
  organizationId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<InvitationsResponse>(
    `/organizations/${organizationId}/invitations`,
    { accessToken },
  );

  return unwrapInvitations(response);
}

export async function createInvitation(
  organizationId: string,
  input: CreateInvitationInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<InvitationResponse>(
    `/organizations/${organizationId}/invitations`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapInvitation(response);
}

export async function acceptInvitation(
  input: AcceptInvitationInput,
  accessToken?: string | null,
) {
  return apiFetch<AcceptInvitationResponse>("/invitations/accept", {
    accessToken,
    method: "POST",
    body: JSON.stringify(input),
  });
}
