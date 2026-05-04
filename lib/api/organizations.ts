import { apiFetch } from "@/lib/api/client";
import type {
  CreateOrganizationResponse,
  CreateOrganizationInput,
  Organization,
  OrganizationsResponse,
} from "@/lib/api/types";

export async function getOrganizations(accessToken?: string | null) {
  const response = await apiFetch<OrganizationsResponse>("/organizations", {
    accessToken,
  });

  if (Array.isArray(response)) {
    return response;
  }

  return response.organizations ?? response.data ?? [];
}

export async function createOrganization(
  input: CreateOrganizationInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<CreateOrganizationResponse>("/organizations", {
    accessToken,
    method: "POST",
    body: JSON.stringify(input),
  });

  if ("id" in response) {
    return response;
  }

  const organization = response.organization ?? response.data ?? null;

  if (!organization) {
    throw new Error("La API no devolvió la organización creada");
  }

  return organization;
}
