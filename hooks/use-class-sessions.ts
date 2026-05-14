"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addExerciseToClassSessionSection,
  createClassSession,
  createClassSessionSection,
  deleteClassSession,
  deleteClassSessionSection,
  deleteClassSessionSectionExercise,
  getClassSessions,
  markAttendance,
  removeAttendance,
  reorderClassSessionSectionExercises,
  reorderClassSessionSections,
  updateClassSession,
  updateClassSessionEnabled,
  updateClassSessionSection,
  updateClassSessionSectionExercise,
  updateClassSessionStatus,
  type ClassSessionSectionExerciseInput,
  type ClassSessionSectionInput,
  type ClassSessionAttendanceResult,
  type ClassSession,
  type ClassSessionFilters,
  type ClassSessionStatusCode,
  type CreateClassSessionInput,
  type ReorderClassSessionSectionExercisesInput,
  type ReorderClassSessionSectionsInput,
  type UpdateClassSessionSectionExerciseInput,
  type UpdateClassSessionSectionInput,
  type UpdateClassSessionInput,
} from "@/lib/api/class-sessions";
import {
  studentNextSessionQueryKey,
  studentStatsQueryKey,
} from "@/hooks/use-student";
import type { StudentNextSession } from "@/lib/api/student";
import { useAuth } from "@/components/providers/auth-provider";

export const classSessionsBaseQueryKey = (organizationId?: string | null) =>
  ["class-sessions", organizationId] as const;

export const classSessionsQueryKey = (
  organizationId?: string | null,
  filters?: ClassSessionFilters,
) =>
  [
    ...classSessionsBaseQueryKey(organizationId),
    filters?.status ?? "all",
    filters?.enabled ?? "all",
    filters?.trainingId ?? "all",
    filters?.search ?? "",
  ] as const;

export function useClassSessions(
  organizationId?: string | null,
  filters?: ClassSessionFilters,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: classSessionsQueryKey(organizationId, filters),
    queryFn: () =>
      getClassSessions(organizationId as string, accessToken, filters),
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
        queryKey: classSessionsBaseQueryKey(organizationId),
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
      queryClient.setQueriesData<ClassSession[]>(
        { queryKey: classSessionsBaseQueryKey(organizationId) },
        (sessions = []) =>
          sessions.map((currentSession) =>
            currentSession.id === session.id ? session : currentSession,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsBaseQueryKey(organizationId),
      });
    },
  });
}

export function useUpdateClassSessionStatus(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classSessionId,
      status,
    }: {
      classSessionId: string;
      status: ClassSessionStatusCode;
    }) =>
      updateClassSessionStatus(
        organizationId as string,
        classSessionId,
        status,
        accessToken,
      ),
    onSuccess: async (session) => {
      queryClient.setQueriesData<ClassSession[]>(
        { queryKey: classSessionsBaseQueryKey(organizationId) },
        (sessions = []) =>
          sessions.map((currentSession) =>
            currentSession.id === session.id ? session : currentSession,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsBaseQueryKey(organizationId),
      });
      await queryClient.refetchQueries({
        queryKey: classSessionsBaseQueryKey(organizationId),
        type: "active",
      });
    },
  });
}

export function useUpdateClassSessionEnabled(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classSessionId,
      isEnabled,
    }: {
      classSessionId: string;
      isEnabled: boolean;
    }) =>
      updateClassSessionEnabled(
        organizationId as string,
        classSessionId,
        isEnabled,
        accessToken,
      ),
    onSuccess: async (session) => {
      queryClient.setQueriesData<ClassSession[]>(
        { queryKey: classSessionsBaseQueryKey(organizationId) },
        (sessions = []) =>
          sessions.map((currentSession) =>
            currentSession.id === session.id ? session : currentSession,
          ),
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsBaseQueryKey(organizationId),
      });
      await queryClient.refetchQueries({
        queryKey: classSessionsBaseQueryKey(organizationId),
        type: "active",
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
      queryClient.setQueriesData<ClassSession[]>(
        { queryKey: classSessionsBaseQueryKey(organizationId) },
        (sessions = []) =>
          sessions.filter((session) => session.id !== classSessionId),
      );
      await queryClient.invalidateQueries({
        queryKey: classSessionsBaseQueryKey(organizationId),
      });
    },
  });
}

async function refreshClassSessions(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId?: string | null,
) {
  await queryClient.invalidateQueries({
    queryKey: classSessionsBaseQueryKey(organizationId),
  });
  await queryClient.refetchQueries({
    queryKey: classSessionsBaseQueryKey(organizationId),
    type: "active",
  });
}

export function useCreateClassSessionSection(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classSessionId,
      input,
    }: {
      classSessionId: string;
      input: ClassSessionSectionInput;
    }) => createClassSessionSection(classSessionId, input, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useUpdateClassSessionSection(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      input,
    }: {
      sectionId: string;
      input: UpdateClassSessionSectionInput;
    }) => updateClassSessionSection(sectionId, input, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useDeleteClassSessionSection(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sectionId: string) =>
      deleteClassSessionSection(sectionId, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useReorderClassSessionSections(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      classSessionId,
      input,
    }: {
      classSessionId: string;
      input: ReorderClassSessionSectionsInput;
    }) => reorderClassSessionSections(classSessionId, input, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useAddExerciseToClassSessionSection(
  organizationId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      input,
    }: {
      sectionId: string;
      input: ClassSessionSectionExerciseInput;
    }) => addExerciseToClassSessionSection(sectionId, input, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useUpdateClassSessionSectionExercise(
  organizationId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exerciseId,
      input,
    }: {
      exerciseId: string;
      input: UpdateClassSessionSectionExerciseInput;
    }) => updateClassSessionSectionExercise(exerciseId, input, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useDeleteClassSessionSectionExercise(
  organizationId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: string) =>
      deleteClassSessionSectionExercise(exerciseId, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
  });
}

export function useReorderClassSessionSectionExercises(
  organizationId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      input,
    }: {
      sectionId: string;
      input: ReorderClassSessionSectionExercisesInput;
    }) => reorderClassSessionSectionExercises(sectionId, input, accessToken),
    onSuccess: async () => refreshClassSessions(queryClient, organizationId),
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
    session.hasCurrentUserAttendance ??
    session.isAttending ??
    session.attending,
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
    attendanceCount: resolveAttendanceCount(
      updatedSession,
      result,
      nextAttendance,
    ),
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
      queryKey: classSessionsBaseQueryKey(organizationId),
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
