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
  inviteUrl?: string | null;
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

export interface RegisterFromInvitationInput {
  token: string;
  displayName: string;
  password: string;
}

export interface AcceptInvitationResponse {
  organizationId?: string;
  organization?: {
    id: string;
    name?: string;
  };
}

export interface CreateInvitationResponse {
  invitation: Invitation;
  inviteUrl?: string | null;
  emailSent: boolean;
}

export interface InvitationPreview {
  organizationName: string;
  email: string;
  role: OrganizationRole | string;
  status?: InvitationStatus | null;
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
      inviteUrl?: string | null;
      emailSent?: boolean;
    };

type InvitationPreviewResponse =
  | InvitationPreview
  | {
      invitation?: Partial<Invitation> | null;
      organization?: {
        name?: string | null;
      } | null;
      data?: Partial<InvitationPreview> | null;
      organizationName?: string | null;
      email?: string | null;
      role?: OrganizationRole | string | null;
      status?: InvitationStatus | null;
    };

function unwrapInvitations(response: InvitationsResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.invitations ?? response.data ?? [];
}

function unwrapInvitation(response: InvitationResponse): CreateInvitationResponse {
  if ("id" in response) {
    return {
      invitation: response,
      inviteUrl: response.inviteUrl ?? null,
      emailSent: false,
    };
  }

  const invitation = response.invitation ?? response.data ?? null;
  const inviteUrl = response.inviteUrl ?? invitation?.inviteUrl ?? null;

  if (!invitation) {
    throw new Error("La API no devolvio la invitacion");
  }

  return {
    invitation: inviteUrl ? { ...invitation, inviteUrl } : invitation,
    inviteUrl,
    emailSent: Boolean(response.emailSent),
  };
}

function unwrapInvitationPreview(
  response: InvitationPreviewResponse,
): InvitationPreview {
  const record = response as {
    invitation?: Partial<Invitation> | null;
    organization?: { name?: string | null } | null;
    data?: Partial<InvitationPreview> | null;
    organizationName?: string | null;
    email?: string | null;
    role?: OrganizationRole | string | null;
    status?: InvitationStatus | null;
  };
  const data = record.data ?? null;
  const invitation = record.invitation ?? null;
  const organizationName =
    record.organizationName ?? record.organization?.name ?? data?.organizationName;
  const email = record.email ?? invitation?.email ?? data?.email;
  const role = record.role ?? invitation?.role ?? data?.role;
  const status = record.status ?? invitation?.status ?? data?.status ?? null;

  if (!organizationName || !email || !role) {
    throw new Error("La API no devolvio la vista previa de la invitacion");
  }

  return {
    organizationName,
    email,
    role,
    status,
  };
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

export async function getInvitationPreview(token: string) {
  const response = await apiFetch<InvitationPreviewResponse>(
    `/invitations/preview/${encodeURIComponent(token)}`,
  );

  return unwrapInvitationPreview(response);
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

export async function registerFromInvitation(input: RegisterFromInvitationInput) {
  return apiFetch<void>("/invitations/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
