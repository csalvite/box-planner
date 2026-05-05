"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClassSession,
  deleteClassSession,
  getClassSessions,
  updateClassSession,
  type ClassSession,
  type CreateClassSessionInput,
  type UpdateClassSessionInput,
} from "@/lib/api/class-sessions";
import { useAuth } from "@/components/providers/auth-provider";

export const classSessionsQueryKey = (organizationId?: string | null) =>
  ["class-sessions", organizationId] as const;

export function useClassSessions(organizationId?: string | null) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: classSessionsQueryKey(organizationId),
    queryFn: () => getClassSessions(organizationId as string, accessToken),
    enabled: Boolean(accessToken && organizationId),
  });
}

export function useCreateClassSession(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClassSessionInput) =>
      createClassSession(organizationId as string, input, accessToken),
    onSuccess: async (session) => {
      queryClient.setQueryData<ClassSession[]>(
        classSessionsQueryKey(organizationId),
        (sessions = []) => [session, ...sessions],
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsQueryKey(organizationId),
      });
    },
  });
}

export function useUpdateClassSession(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classSessionId,
      input,
    }: {
      classSessionId: string;
      input: UpdateClassSessionInput;
    }) =>
      updateClassSession(
        organizationId as string,
        classSessionId,
        input,
        accessToken,
      ),
    onSuccess: async (session) => {
      queryClient.setQueryData<ClassSession[]>(
        classSessionsQueryKey(organizationId),
        (sessions = []) =>
          sessions.map((currentSession) =>
            currentSession.id === session.id ? session : currentSession,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsQueryKey(organizationId),
      });
    },
  });
}

export function useDeleteClassSession(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classSessionId: string) =>
      deleteClassSession(organizationId as string, classSessionId, accessToken),
    onSuccess: async (_response, classSessionId) => {
      queryClient.setQueryData<ClassSession[]>(
        classSessionsQueryKey(organizationId),
        (sessions = []) =>
          sessions.filter((session) => session.id !== classSessionId),
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsQueryKey(organizationId),
      });
    },
  });
}
