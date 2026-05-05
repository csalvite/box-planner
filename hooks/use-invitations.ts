"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitation,
  createInvitation,
  getInvitations,
  type AcceptInvitationInput,
  type CreateInvitationInput,
  type Invitation,
} from "@/lib/api/invitations";
import { useAuth } from "@/components/providers/auth-provider";
import { organizationsQueryKey } from "@/hooks/use-organizations";

export const invitationsQueryKey = (organizationId?: string | null) =>
  ["invitations", organizationId] as const;

export function useInvitations(organizationId?: string | null) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: invitationsQueryKey(organizationId),
    queryFn: () => getInvitations(organizationId as string, accessToken),
    enabled: Boolean(accessToken && organizationId),
  });
}

export function useCreateInvitation(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      createInvitation(organizationId as string, input, accessToken),
    onSuccess: async (invitation) => {
      queryClient.setQueryData<Invitation[]>(
        invitationsQueryKey(organizationId),
        (invitations = []) => [invitation, ...invitations],
      );
      await queryClient.invalidateQueries({
        queryKey: invitationsQueryKey(organizationId),
      });
    },
  });
}

export function useAcceptInvitation() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AcceptInvitationInput) =>
      acceptInvitation(input, accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
    },
  });
}
