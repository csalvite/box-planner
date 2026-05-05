"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getStudentNextSession,
  getStudentStats,
} from "@/lib/api/student";
import { useAuth } from "@/components/providers/auth-provider";

export const studentNextSessionQueryKey = (
  organizationId?: string | null,
) => ["student", organizationId, "next-session"] as const;

export const studentStatsQueryKey = (organizationId?: string | null) =>
  ["student", organizationId, "stats"] as const;

export function useStudentNextSession(
  organizationId?: string | null,
  enabled = true,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: studentNextSessionQueryKey(organizationId),
    queryFn: () => getStudentNextSession(accessToken),
    enabled: Boolean(accessToken && organizationId && enabled),
  });
}

export function useStudentStats(
  organizationId?: string | null,
  enabled = true,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: studentStatsQueryKey(organizationId),
    queryFn: () => getStudentStats(accessToken),
    enabled: Boolean(accessToken && organizationId && enabled),
  });
}
