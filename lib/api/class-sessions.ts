import { apiFetch } from "@/lib/api/client";
import type { ApiTraining } from "@/lib/api/trainings";
import type { Exercise } from "@/lib/api/exercises";

export type ClassSessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "scheduled"
  | "completed"
  | "cancelled"
  | string;

export type ClassSessionStatusCode = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type ClassSessionStatusFilterCode = ClassSessionStatusCode | "ALL";
export type ClassSessionEnabledFilterCode = "true" | "false" | "ALL";

export interface ClassSessionFilters {
  status?: ClassSessionStatusFilterCode;
  enabled?: ClassSessionEnabledFilterCode;
  trainingId?: string;
  search?: string;
}

export interface ClassSession {
  id: string;
  organizationId?: string;
  title: string;
  classTypeId?: string | null;
  classType?: ApiTraining | null;
  trainingId?: string | null;
  training?: ApiTraining | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  targetDurationMinutes?: number | null;
  estimatedDurationMinutes?: number | null;
  // Legacy API field kept only for reading older responses.
  durationMinutes?: number | null;
  status?: ClassSessionStatus | null;
  isEnabled?: boolean | null;
  notes?: string | null;
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
  sections?: ClassSessionSection[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface ClassSessionSection {
  id: string;
  classSessionId?: string;
  name: string;
  objective?: string | null;
  estimatedDurationMinutes?: number | null;
  // Legacy response fields kept only for reading older data.
  goal?: string | null;
  notes?: string | null;
  durationMinutes?: number | null;
  durationSec?: number | null;
  orderIndex: number;
  exercises?: ClassSessionSectionExercise[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface ClassSessionSectionExercise {
  id: string;
  sectionId?: string;
  classSessionSectionId?: string;
  exerciseId?: string | null;
  libraryExerciseId?: string | null;
  libraryExercise?: Exercise | null;
  name: string;
  description?: string | null;
  durationSec?: number | null;
  reps?: number | null;
  restSec?: number | null;
  notes?: string | null;
  orderIndex: number;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface CreateClassSessionInput {
  title: string;
  trainingId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  targetDurationMinutes?: number | null;
  notes?: string | null;
}

export type UpdateClassSessionInput = Partial<
  Omit<CreateClassSessionInput, "trainingId">
> & {
  trainingId?: string | null;
  status?: ClassSessionStatusCode;
  isEnabled?: boolean;
};

export interface ClassSessionSectionInput {
  name: string;
  objective?: string | null;
  notes?: string | null;
  estimatedDurationMinutes?: number | null;
}

export type UpdateClassSessionSectionInput = Partial<ClassSessionSectionInput>;

export interface ReorderClassSessionSectionsInput {
  order: Array<{
    sectionId: string;
    orderIndex: number;
  }>;
}

export interface ClassSessionSectionExerciseInput {
  exerciseId?: string;
  name?: string;
  description?: string | null;
  durationSec?: number | null;
  reps?: number | null;
  restSec?: number | null;
  notes?: string | null;
  orderIndex?: number;
}

export type UpdateClassSessionSectionExerciseInput =
  Partial<ClassSessionSectionExerciseInput>;

export interface ReorderClassSessionSectionExercisesInput {
  order: Array<{
    exerciseId: string;
    orderIndex: number;
  }>;
}

type ClassSessionsResponse =
  | ClassSession[]
  | {
      classSessions?: ClassSession[];
      classes?: ClassSession[];
      sessions?: ClassSession[];
      data?:
        | ClassSession[]
        | {
            classSessions?: ClassSession[];
            classes?: ClassSession[];
            sessions?: ClassSession[];
          };
      result?: ClassSession[];
    };

type ClassSessionResponse =
  | ClassSession
  | {
      classSession?: ClassSession;
      session?: ClassSession;
      data?: ClassSession;
    };

type ClassSessionSectionResponse =
  | ClassSessionSection
  | {
      section?: ClassSessionSection;
      classSessionSection?: ClassSessionSection;
      data?: ClassSessionSection;
    };

type ClassSessionSectionExerciseResponse =
  | ClassSessionSectionExercise
  | {
      exercise?: ClassSessionSectionExercise;
      sectionExercise?: ClassSessionSectionExercise;
      classSessionSectionExercise?: ClassSessionSectionExercise;
      data?: ClassSessionSectionExercise;
    };

export interface ClassSessionAttendanceResult {
  attendance?: unknown;
  classSession?: ClassSession | null;
  attendanceCount?: number | null;
  hasCurrentUserAttendance?: boolean | null;
}

type ClassSessionAttendanceResponse =
  | ClassSession
  | ClassSessionAttendanceResult
  | {
      data?:
        | ClassSession
        | ClassSessionAttendanceResult
        | {
            classSession?: ClassSession | null;
            session?: ClassSession | null;
            attendance?: unknown;
            attendanceCount?: number | null;
            hasCurrentUserAttendance?: boolean | null;
          }
        | null;
      classSession?: ClassSession | null;
      session?: ClassSession | null;
      attendance?: unknown;
      attendanceCount?: number | null;
      hasCurrentUserAttendance?: boolean | null;
    };

function unwrapClassSessions(response: ClassSessionsResponse) {
  if (Array.isArray(response)) {
    return sortClassSessions(response.map(normalizeClassSession));
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return sortClassSessions(data.map(normalizeClassSession));
  }

  if (data && typeof data === "object") {
    const nested = data as {
      classSessions?: ClassSession[];
      classes?: ClassSession[];
      sessions?: ClassSession[];
    };

    return sortClassSessions(
      (nested.classSessions ?? nested.classes ?? nested.sessions ?? []).map(
        normalizeClassSession,
      ),
    );
  }

  return sortClassSessions(
    (
      response.classSessions ??
      response.classes ??
      response.sessions ??
      response.result ??
      []
    ).map(normalizeClassSession),
  );
}

function unwrapClassSession(response: ClassSessionResponse) {
  if ("id" in response) {
    return normalizeClassSession(response);
  }

  const session =
    response.classSession ?? response.session ?? response.data ?? null;

  if (!session) {
    throw new Error("La API no devolvio la clase");
  }

  return normalizeClassSession(session);
}

function unwrapClassSessionSection(response: ClassSessionSectionResponse) {
  if ("id" in response) {
    return normalizeClassSessionSection(response);
  }

  const section =
    response.section ?? response.classSessionSection ?? response.data ?? null;

  if (!section) {
    throw new Error("La API no devolvio la seccion");
  }

  return normalizeClassSessionSection(section);
}

function unwrapClassSessionSectionExercise(
  response: ClassSessionSectionExerciseResponse,
) {
  if ("id" in response) {
    return normalizeClassSessionSectionExercise(response);
  }

  const exercise =
    response.exercise ??
    response.sectionExercise ??
    response.classSessionSectionExercise ??
    response.data ??
    null;

  if (!exercise) {
    throw new Error("La API no devolvio el ejercicio de la seccion");
  }

  return normalizeClassSessionSectionExercise(exercise);
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeClassSessionSectionExercise(
  exercise: ClassSessionSectionExercise,
): ClassSessionSectionExercise {
  return {
    ...exercise,
    durationSec: optionalNumber(exercise.durationSec),
    reps: optionalNumber(exercise.reps),
    restSec: optionalNumber(exercise.restSec),
    orderIndex: optionalNumber(exercise.orderIndex) ?? 0,
  };
}

function normalizeClassSessionSection(
  section: ClassSessionSection,
): ClassSessionSection {
  return {
    ...section,
    estimatedDurationMinutes: optionalNumber(section.estimatedDurationMinutes),
    durationMinutes: optionalNumber(section.durationMinutes),
    durationSec: optionalNumber(section.durationSec),
    orderIndex: optionalNumber(section.orderIndex) ?? 0,
    exercises: sortClassSessionSectionExercises(
      (section.exercises ?? []).map(normalizeClassSessionSectionExercise),
    ),
  };
}

function normalizeClassSession(session: ClassSession): ClassSession {
  return {
    ...session,
    targetDurationMinutes: optionalNumber(session.targetDurationMinutes),
    estimatedDurationMinutes: optionalNumber(session.estimatedDurationMinutes),
    durationMinutes: optionalNumber(session.durationMinutes),
    sections: sortClassSessionSections(
      (session.sections ?? []).map(normalizeClassSessionSection),
    ),
  };
}

function sortClassSessionSectionExercises(
  exercises: ClassSessionSectionExercise[],
) {
  return [...exercises].sort((firstExercise, secondExercise) => {
    const orderDiff = firstExercise.orderIndex - secondExercise.orderIndex;

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return firstExercise.id.localeCompare(secondExercise.id);
  });
}

function sortClassSessionSections(sections: ClassSessionSection[]) {
  return [...sections].sort((firstSection, secondSection) => {
    const orderDiff = firstSection.orderIndex - secondSection.orderIndex;

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return firstSection.id.localeCompare(secondSection.id);
  });
}

function sortClassSessions(sessions: ClassSession[]) {
  return sessions;
}

function organizationHeaders(organizationId?: string | null) {
  return organizationId ? { "x-organization-id": organizationId } : undefined;
}

function buildClassesPath(filters?: ClassSessionFilters) {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.set("status", filters.status);
  }

  if (filters?.enabled) {
    params.set("enabled", filters.enabled);
  }

  if (filters?.trainingId) {
    params.set("trainingId", filters.trainingId);
  }

  const search = filters?.search?.trim();

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();

  return query ? `/classes?${query}` : "/classes";
}

function getCountFromSession(session?: ClassSession | null) {
  return (
    session?.attendanceCount ??
    session?.attendeesCount ??
    session?.attendancesCount ??
    session?._count?.attendances ??
    session?._count?.attendees ??
    null
  );
}

function unwrapAttendanceResult(
  response: ClassSessionAttendanceResponse,
  hasCurrentUserAttendance: boolean,
): ClassSessionAttendanceResult {
  if (response && "id" in response) {
    return {
      classSession: response,
      attendanceCount: getCountFromSession(response),
      hasCurrentUserAttendance:
        response.hasCurrentUserAttendance ??
        response.isAttending ??
        response.attending ??
        hasCurrentUserAttendance,
    };
  }

  const wrapped = response as Extract<
    ClassSessionAttendanceResponse,
    { data?: unknown }
  >;
  const data = wrapped.data;
  const source =
    data && typeof data === "object" && !("id" in data)
      ? (data as ClassSessionAttendanceResult & {
          session?: ClassSession | null;
        })
      : (wrapped as ClassSessionAttendanceResult & {
          session?: ClassSession | null;
        });
  const classSession =
    (data && typeof data === "object" && "id" in data
      ? (data as ClassSession)
      : null) ??
    source.classSession ??
    source.session ??
    null;

  return {
    attendance: source.attendance,
    classSession,
    attendanceCount:
      source.attendanceCount ?? getCountFromSession(classSession),
    hasCurrentUserAttendance:
      source.hasCurrentUserAttendance ??
      classSession?.hasCurrentUserAttendance ??
      classSession?.isAttending ??
      classSession?.attending ??
      hasCurrentUserAttendance,
  };
}

export async function getClassSessions(
  organizationId: string,
  accessToken?: string | null,
  filters?: ClassSessionFilters,
) {
  const response = await apiFetch<ClassSessionsResponse>(
    buildClassesPath(filters),
    {
      accessToken,
      headers: { "x-organization-id": organizationId },
    },
  );

  return unwrapClassSessions(response);
}

export async function createClassSession(
  organizationId: string,
  input: CreateClassSessionInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionResponse>(
    `/organizations/${organizationId}/class-sessions`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapClassSession(response);
}

export async function updateClassSession(
  organizationId: string,
  classSessionId: string,
  input: UpdateClassSessionInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionResponse>(
    `/organizations/${organizationId}/class-sessions/${classSessionId}`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapClassSession(response);
}

export async function deleteClassSession(
  organizationId: string,
  classSessionId: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(`/classes/${classSessionId}`, {
    accessToken,
    headers: { "x-organization-id": organizationId },
    method: "DELETE",
  });
}

export async function updateClassSessionStatus(
  organizationId: string,
  classSessionId: string,
  status: ClassSessionStatusCode,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionResponse>(
    `/classes/${classSessionId}/status`,
    {
      accessToken,
      headers: { "x-organization-id": organizationId },
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  return unwrapClassSession(response);
}

export async function updateClassSessionEnabled(
  organizationId: string,
  classSessionId: string,
  isEnabled: boolean,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionResponse>(
    `/classes/${classSessionId}/status`,
    {
      accessToken,
      headers: { "x-organization-id": organizationId },
      method: "PATCH",
      body: JSON.stringify({ isEnabled }),
    },
  );

  return unwrapClassSession(response);
}

export async function createClassSessionSection(
  organizationId: string,
  classSessionId: string,
  input: ClassSessionSectionInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionSectionResponse>(
    `/class-sessions/${classSessionId}/sections`,
    {
      accessToken,
      headers: organizationHeaders(organizationId),
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapClassSessionSection(response);
}

export async function updateClassSessionSection(
  organizationId: string,
  sectionId: string,
  input: UpdateClassSessionSectionInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionSectionResponse>(
    `/class-session-sections/${sectionId}`,
    {
      accessToken,
      headers: organizationHeaders(organizationId),
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapClassSessionSection(response);
}

export async function deleteClassSessionSection(
  organizationId: string,
  sectionId: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(`/class-session-sections/${sectionId}`, {
    accessToken,
    headers: organizationHeaders(organizationId),
    method: "DELETE",
  });
}

export async function reorderClassSessionSections(
  organizationId: string,
  classSessionId: string,
  input: ReorderClassSessionSectionsInput,
  accessToken?: string | null,
) {
  await apiFetch<void>(`/class-sessions/${classSessionId}/sections/reorder`, {
    accessToken,
    headers: organizationHeaders(organizationId),
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addExerciseToClassSessionSection(
  organizationId: string,
  sectionId: string,
  input: ClassSessionSectionExerciseInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionSectionExerciseResponse>(
    `/class-session-sections/${sectionId}/exercises`,
    {
      accessToken,
      headers: organizationHeaders(organizationId),
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapClassSessionSectionExercise(response);
}

export async function updateClassSessionSectionExercise(
  organizationId: string,
  id: string,
  input: UpdateClassSessionSectionExerciseInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionSectionExerciseResponse>(
    `/class-session-section-exercises/${id}`,
    {
      accessToken,
      headers: organizationHeaders(organizationId),
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapClassSessionSectionExercise(response);
}

export async function deleteClassSessionSectionExercise(
  organizationId: string,
  id: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(`/class-session-section-exercises/${id}`, {
    accessToken,
    headers: organizationHeaders(organizationId),
    method: "DELETE",
  });
}

export async function reorderClassSessionSectionExercises(
  organizationId: string,
  sectionId: string,
  input: ReorderClassSessionSectionExercisesInput,
  accessToken?: string | null,
) {
  await apiFetch<void>(
    `/class-session-sections/${sectionId}/exercises/reorder`,
    {
      accessToken,
      headers: organizationHeaders(organizationId),
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function markAttendance(
  organizationId: string,
  classSessionId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionAttendanceResponse>(
    `/organizations/${organizationId}/class-sessions/${classSessionId}/attendance`,
    {
      accessToken,
      method: "POST",
    },
  );

  return unwrapAttendanceResult(response, true);
}

export async function removeAttendance(
  organizationId: string,
  classSessionId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionAttendanceResponse>(
    `/organizations/${organizationId}/class-sessions/${classSessionId}/attendance`,
    {
      accessToken,
      method: "DELETE",
    },
  );

  return unwrapAttendanceResult(response, false);
}
