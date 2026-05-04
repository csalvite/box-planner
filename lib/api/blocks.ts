import { apiFetch } from "@/lib/api/client";
import type {
  ApiBlock,
  BlockResponse,
  BlocksResponse,
  CreateBlockInput,
  UpdateBlockInput,
} from "@/lib/api/types";
import type { Block } from "@/lib/types";

type BlockCategory = Block["category"];

export type BlockFormInput = {
  name: string;
  description?: string;
  categoryId?: number;
  level?: string;
  isPublic?: boolean;
};

const categoryByBackendKey: Record<string, BlockCategory> = {
  WARM_UP: "warm-up",
  "warm-up": "warm-up",
  warmup: "warm-up",
  warm_up: "warm-up",
  TECHNIQUE: "technique",
  technique: "technique",
  CARDIO: "cardio",
  cardio: "cardio",
  STRENGTH: "strength",
  strength: "strength",
  COOL_DOWN: "cooldown",
  cooldown: "cooldown",
  cool_down: "cooldown",
  SPARRING: "sparring",
  sparring: "sparring",
};

function normalizeCategory(block: ApiBlock): BlockCategory {
  const key = block.category?.key ?? block.category?.name ?? null;

  if (key) {
    return (
      categoryByBackendKey[key] ??
      categoryByBackendKey[key.toLowerCase()] ??
      "technique"
    );
  }

  return "technique";
}

function normalizeDate(value?: string | Date | null) {
  if (!value) {
    return new Date();
  }

  return value instanceof Date ? value : new Date(value);
}

function normalizeBlock(block: ApiBlock): Block {
  const estimatedDurationSec = block.estimatedDurationSec ?? 0;

  return {
    id: block.id,
    name: block.name,
    category: normalizeCategory(block),
    duration: Math.round(estimatedDurationSec / 60),
    description: block.description ?? undefined,
    exercises: undefined,
    createdAt: normalizeDate(block.createdAt),
  };
}

function unwrapBlocks(response: BlocksResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.blocks ?? response.data ?? [];
}

function unwrapBlock(response: BlockResponse) {
  if ("id" in response) {
    return response;
  }

  const block = response.block ?? response.data ?? null;

  if (!block) {
    throw new Error("La API no devolvió el bloque");
  }

  return block;
}

function toCreateBlockDto(input: BlockFormInput): CreateBlockInput {
  const dto: CreateBlockInput = {
    name: input.name,
    isPublic: input.isPublic ?? false,
  };

  if (input.description) {
    dto.description = input.description;
  }

  if (input.level) {
    dto.level = input.level;
  }

  if (input.categoryId) {
    dto.categoryId = input.categoryId;
  }

  return dto;
}

function toUpdateBlockDto(input: Partial<BlockFormInput>): UpdateBlockInput {
  const dto: UpdateBlockInput = {};

  if (input.name !== undefined) {
    dto.name = input.name;
  }

  if (input.description !== undefined) {
    dto.description = input.description;
  }

  if (input.level !== undefined) {
    dto.level = input.level;
  }

  if (input.isPublic !== undefined) {
    dto.isPublic = input.isPublic;
  }

  if (input.categoryId !== undefined) {
    dto.categoryId = input.categoryId;
  }

  return dto;
}

export async function getBlocks(
  organizationId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<BlocksResponse>(
    `/organizations/${organizationId}/blocks`,
    { accessToken },
  );

  return unwrapBlocks(response).map(normalizeBlock);
}

export async function getBlock(
  organizationId: string,
  blockId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<BlockResponse>(
    `/organizations/${organizationId}/blocks/${blockId}`,
    { accessToken },
  );

  return normalizeBlock(unwrapBlock(response));
}

export async function createBlock(
  organizationId: string,
  input: BlockFormInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<BlockResponse>(
    `/organizations/${organizationId}/blocks`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify(toCreateBlockDto(input)),
    },
  );

  return normalizeBlock(unwrapBlock(response));
}

export async function updateBlock(
  organizationId: string,
  blockId: string,
  input: Partial<BlockFormInput>,
  accessToken?: string | null,
) {
  const response = await apiFetch<BlockResponse>(
    `/organizations/${organizationId}/blocks/${blockId}`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(toUpdateBlockDto(input)),
    },
  );

  return normalizeBlock(unwrapBlock(response));
}

export async function deleteBlock(
  organizationId: string,
  blockId: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(`/organizations/${organizationId}/blocks/${blockId}`, {
    accessToken,
    method: "DELETE",
  });
}
