import { apiFetch } from "@/lib/api/client";

export interface StudentExercise {
  id: string;
  name: string;
  description?: string | null;
  durationSec?: number | null;
  reps?: number | null;
  restSec?: number | null;
  orderIndex?: number | null;
  notes?: string | null;
}

export interface StudentBlockSource {
  id?: string;
  name?: string | null;
  description?: string | null;
  category?: {
    key?: string | null;
    name?: string | null;
  } | null;
  estimatedDurationSec?: number | null;
  exercises?: StudentExercise[];
}

export interface StudentSessionBlock {
  id: string;
  blockId?: string | null;
  orderIndex?: number | null;
  customDurationSec?: number | null;
  notes?: string | null;
  block?: StudentBlockSource | null;
}

export interface StudentTraining {
  id?: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  totalDurationSec?: number | null;
  blocks?: StudentSessionBlock[];
}

export interface StudentNextSession {
  id?: string;
  title?: string | null;
  startsAt?: string | Date | null;
  startAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  date?: string | Date | null;
  training?: StudentTraining | null;
  blocks?: StudentSessionBlock[];
  attendanceCount?: number | null;
  attendeesCount?: number | null;
  attendancesCount?: number | null;
  isAttending?: boolean | null;
  attending?: boolean | null;
  _count?: {
    attendances?: number;
    attendees?: number;
  };
}

export interface StudentStats {
  attendanceStreak: number;
  totalAttendances: number;
}

type StudentNextSessionResponse =
  | StudentNextSession
  | null
  | {
      session?: StudentNextSession | null;
      nextSession?: StudentNextSession | null;
      data?: StudentNextSession | null;
    };

type StudentStatsResponse =
  | (Partial<StudentStats> & {
      currentStreak?: number;
      streak?: number;
      totalAttendance?: number;
      attendanceCount?: number;
    })
  | {
      stats?: Partial<StudentStats> & {
        currentStreak?: number;
        streak?: number;
        totalAttendance?: number;
        attendanceCount?: number;
      };
      data?: Partial<StudentStats> & {
        currentStreak?: number;
        streak?: number;
        totalAttendance?: number;
        attendanceCount?: number;
      };
    };

function unwrapNextSession(
  response: StudentNextSessionResponse,
): StudentNextSession | null {
  if (!response) {
    return null;
  }

  if ("session" in response || "nextSession" in response || "data" in response) {
    const wrapped = response as {
      session?: StudentNextSession | null;
      nextSession?: StudentNextSession | null;
      data?: StudentNextSession | null;
    };

    return wrapped.session ?? wrapped.nextSession ?? wrapped.data ?? null;
  }

  return response as StudentNextSession;
}

function unwrapStats(response: StudentStatsResponse): StudentStats {
  const wrapped = response as {
    stats?: Partial<StudentStats> & Record<string, number | undefined>;
    data?: Partial<StudentStats> & Record<string, number | undefined>;
  };
  const stats =
    wrapped.stats ??
    wrapped.data ??
    (response as Partial<StudentStats> & Record<string, number | undefined>);

  return {
    attendanceStreak:
      stats.attendanceStreak ?? stats.currentStreak ?? stats.streak ?? 0,
    totalAttendances:
      stats.totalAttendances ??
      stats.totalAttendance ??
      stats.attendanceCount ??
      0,
  };
}

export async function getStudentNextSession(accessToken?: string | null) {
  const response = await apiFetch<StudentNextSessionResponse>(
    "/student/next-session",
    { accessToken },
  );

  return unwrapNextSession(response);
}

export async function getStudentStats(accessToken?: string | null) {
  const response = await apiFetch<StudentStatsResponse>("/student/stats", {
    accessToken,
  });

  return unwrapStats(response);
}
