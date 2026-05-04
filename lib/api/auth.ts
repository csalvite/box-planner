import { apiFetch } from "@/lib/api/client";
import type { ApiUser, MeResponse } from "@/lib/api/types";

export async function getMe(accessToken?: string | null) {
  const response = await apiFetch<MeResponse>("/auth/me", { accessToken });

  if ("id" in response) {
    return response;
  }

  return response.user ?? response.data ?? null;
}
