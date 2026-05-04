"use client";

import { useQuery } from "@tanstack/react-query";
import { getBlockCategories } from "@/lib/api/block-categories";
import { useAuth } from "@/components/providers/auth-provider";

export const blockCategoriesQueryKey = ["block-categories"] as const;

export function useBlockCategories() {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: blockCategoriesQueryKey,
    queryFn: () => getBlockCategories(accessToken),
    enabled: Boolean(accessToken),
  });
}
