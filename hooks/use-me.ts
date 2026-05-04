"use client";

import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/auth";
import { useAuth } from "@/components/providers/auth-provider";

export function useMe() {
  const { accessToken, user } = useAuth();

  return useQuery({
    queryKey: ["auth", "me", user?.id],
    queryFn: () => getMe(accessToken),
    enabled: Boolean(accessToken),
  });
}
