"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createClassSession,
  deleteClassSession,
  getClassSessions,
  markAttendance,
  removeAttendance,
  updateClassSession,
  type ClassSessionAttendanceResult,
  type ClassSession,
  type CreateClassSessionInput,
  type UpdateClassSessionInput,
} from "@/lib/api/class-sessions";
import {
  studentNextSessionQueryKey,
  studentStatsQueryKey,
} from "@/hooks/use-student";
import type { StudentNextSession } from "@/lib/api/student";
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

type AttendanceSessionShape = {
  id?: string;
  attendanceCount?: number | null;
  attendeesCount?: number | null;
  attendancesCount?: number | null;
  hasCurrentUserAttendance?: boolean | null;
  isAttending?: boolean | null;
  attending?: boolean | null;
  _count?: {
    attendances?: number;
    attendees?: number;
  };
};

function getAttendanceCount(session: AttendanceSessionShape) {
  return (
    session.attendanceCount ??
    session.attendeesCount ??
    session.attendancesCount ??
    session._count?.attendances ??
    session._count?.attendees ??
    0
  );
}

function isAttending(session: AttendanceSessionShape) {
  return Boolean(
    session.hasCurrentUserAttendance ?? session.isAttending ?? session.attending,
  );
}

function resolveAttendanceCount<T extends AttendanceSessionShape>(
  session: T,
  result: ClassSessionAttendanceResult,
  attending: boolean,
) {
  if (typeof result.attendanceCount === "number") {
    return result.attendanceCount;
  }

  const currentCount = getAttendanceCount(session);
  const wasAttending = isAttending(session);

  if (attending && !wasAttending) {
    return currentCount + 1;
  }

  if (!attending && wasAttending) {
    return Math.max(0, currentCount - 1);
  }

  return currentCount;
}

function applyAttendanceToSession<T extends AttendanceSessionShape>(
  session: T,
  result: ClassSessionAttendanceResult,
  classSessionId: string,
  attending: boolean,
) {
  if (session.id !== classSessionId) {
    return session;
  }

  const updatedSession = result.classSession
    ? { ...session, ...result.classSession }
    : session;
  const nextAttendance = result.hasCurrentUserAttendance ?? attending;

  return {
    ...updatedSession,
    attendanceCount: resolveAttendanceCount(updatedSession, result, nextAttendance),
    hasCurrentUserAttendance: nextAttendance,
    isAttending: nextAttendance,
    attending: nextAttendance,
  };
}

async function refreshAttendanceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId?: string | null,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: studentNextSessionQueryKey(organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: studentStatsQueryKey(organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: classSessionsQueryKey(organizationId),
    }),
  ]);
}

export function useMarkAttendance(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classSessionId: string) =>
      markAttendance(organizationId as string, classSessionId, accessToken),
    onSuccess: async (result, classSessionId) => {
      queryClient.setQueryData<StudentNextSession | null>(
        studentNextSessionQueryKey(organizationId),
        (session) =>
          session
            ? applyAttendanceToSession(session, result, classSessionId, true)
            : session,
      );
      queryClient.setQueryData<ClassSession[]>(
        classSessionsQueryKey(organizationId),
        (sessions = []) =>
          sessions.map((session) =>
            applyAttendanceToSession(session, result, classSessionId, true),
          ),
      );
      await refreshAttendanceQueries(queryClient, organizationId);
    },
  });
}

export function useRemoveAttendance(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classSessionId: string) =>
      removeAttendance(organizationId as string, classSessionId, accessToken),
    onSuccess: async (result, classSessionId) => {
      queryClient.setQueryData<StudentNextSession | null>(
        studentNextSessionQueryKey(organizationId),
        (session) =>
          session
            ? applyAttendanceToSession(session, result, classSessionId, false)
            : session,
      );
      queryClient.setQueryData<ClassSession[]>(
        classSessionsQueryKey(organizationId),
        (sessions = []) =>
          sessions.map((session) =>
            applyAttendanceToSession(session, result, classSessionId, false),
          ),
      );
      await refreshAttendanceQueries(queryClient, organizationId);
    },
  });
}
