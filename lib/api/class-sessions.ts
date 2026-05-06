import { apiFetch } from "@/lib/api/client";
import type { ApiTraining } from "@/lib/api/trainings";

export type ClassSessionStatus =
  | "SCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "scheduled"
  | "cancelled"
  | "completed"
  | string;

export interface ClassSession {
  id: string;
  organizationId?: string;
  title: string;
  trainingId?: string | null;
  training?: ApiTraining | null;
  startsAt: string | Date;
  endsAt?: string | Date | null;
  status?: ClassSessionStatus | null;
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
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface CreateClassSessionInput {
  title: string;
  trainingId: string;
  startsAt: string;
  endsAt?: string;
  notes?: string;
}

export type UpdateClassSessionInput = Partial<CreateClassSessionInput> & {
  status?: ClassSessionStatus;
};

type ClassSessionsResponse =
  | ClassSession[]
  | {
      classSessions?: ClassSession[];
      sessions?: ClassSession[];
      data?: ClassSession[];
      result?: ClassSession[];
    };

type ClassSessionResponse =
  | ClassSession
  | {
      classSession?: ClassSession;
      session?: ClassSession;
      data?: ClassSession;
    };

function unwrapClassSessions(response: ClassSessionsResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const nested = data as {
      classSessions?: ClassSession[];
      sessions?: ClassSession[];
    };

    return nested.classSessions ?? nested.sessions ?? [];
  }

  return response.classSessions ?? response.sessions ?? response.result ?? [];
}

function unwrapClassSession(response: ClassSessionResponse) {
  if ("id" in response) {
    return response;
  }

  const session = response.classSession ?? response.session ?? response.data ?? null;

  if (!session) {
    throw new Error("La API no devolvio la clase");
  }

  return session;
}

export async function getClassSessions(
  organizationId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionsResponse>(
    `/organizations/${organizationId}/class-sessions`,
    { accessToken },
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
  await apiFetch<void>(
    `/organizations/${organizationId}/class-sessions/${classSessionId}`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}

export async function markAttendance(
  organizationId: string,
  classSessionId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionResponse>(
    `/organizations/${organizationId}/class-sessions/${classSessionId}/attendance`,
    {
      accessToken,
      method: "POST",
    },
  );

  return unwrapClassSession(response);
}

export async function removeAttendance(
  organizationId: string,
  classSessionId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<ClassSessionResponse>(
    `/organizations/${organizationId}/class-sessions/${classSessionId}/attendance`,
    {
      accessToken,
      method: "DELETE",
    },
  );

  return unwrapClassSession(response);
}
