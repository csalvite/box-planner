"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMember,
  type UpdateOrganizationMemberInput,
} from "@/lib/api/members";

export const organizationMembersQueryKey = (organizationId?: string | null) =>
  ["organization-members", organizationId] as const;

export function useOrganizationMembers(organizationId?: string | null) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: organizationMembersQueryKey(organizationId),
    queryFn: () => getOrganizationMembers(organizationId as string, accessToken),
    enabled: Boolean(accessToken && organizationId),
  });
}

export function useUpdateOrganizationMember(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      memberId: string;
      input: UpdateOrganizationMemberInput;
    }) =>
      updateOrganizationMember(
        organizationId as string,
        memberId,
        input,
        accessToken,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMembersQueryKey(organizationId),
      });
    },
  });
}

export function useRemoveOrganizationMember(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      removeOrganizationMember(organizationId as string, memberId, accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationMembersQueryKey(organizationId),
      });
    },
  });
}
