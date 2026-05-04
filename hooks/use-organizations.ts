"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrganization,
  getOrganizations,
} from "@/lib/api/organizations";
import type { CreateOrganizationInput } from "@/lib/api/types";
import { useAuth } from "@/components/providers/auth-provider";

export const organizationsQueryKey = ["organizations"] as const;

export function useOrganizations(enabled = true) {
  const { accessToken, user } = useAuth();

  return useQuery({
    queryKey: [...organizationsQueryKey, user?.id],
    queryFn: () => getOrganizations(accessToken),
    enabled: Boolean(accessToken) && enabled,
  });
}

export function useCreateOrganization() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      createOrganization(input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
    },
  });
}
