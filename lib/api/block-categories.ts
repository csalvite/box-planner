import { apiFetch } from "@/lib/api/client";
import type {
  BlockCategoriesResponse,
  BlockCategory,
} from "@/lib/api/types";

function unwrapBlockCategories(response: BlockCategoriesResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.categories ?? response.data ?? [];
}

export async function getBlockCategories(accessToken?: string | null) {
  const response = await apiFetch<BlockCategoriesResponse>("/block-categories", {
    accessToken,
  });

  return unwrapBlockCategories(response);
}
