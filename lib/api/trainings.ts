import { apiFetch } from "@/lib/api/client";
import type { ApiBlock } from "@/lib/api/types";

export interface TrainingBlock {
  id: string;
  trainingId: string;
  blockId: string;
  orderIndex: number;
  customDurationSec?: number | null;
  notes?: string | null;
  block?: ApiBlock;
}

export interface ApiTraining {
  id: string;
  organizationId?: string;
  createdById?: string;
  title: string;
  description?: string | null;
  trainingType: "PERSONAL" | "GROUP" | "personal" | "group";
  level?: string | null;
  groupSizeMin?: number | null;
  groupSizeMax?: number | null;
  totalDurationSec: number;
  visibility?: "PRIVATE" | "PUBLIC";
  notes?: string | null;
  blocks?: TrainingBlock[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface CreateTrainingInput {
  title: string;
  description?: string;
  trainingType: "personal" | "group";
  level?: string;
  groupSizeMin?: number;
  groupSizeMax?: number;
  notes?: string;
}

export type UpdateTrainingInput = Partial<CreateTrainingInput>;

export interface AddBlockToTrainingInput {
  blockId: string;
  orderIndex?: number;
  customDurationSec?: number;
  notes?: string;
}

export interface ReorderTrainingBlocksInput {
  order: Array<{
    trainingBlockId: string;
    orderIndex: number;
  }>;
}

type TrainingsResponse =
  | ApiTraining[]
  | {
      trainings?: ApiTraining[];
      data?: ApiTraining[];
    };

type TrainingResponse =
  | ApiTraining
  | {
      training?: ApiTraining;
      data?: ApiTraining;
    };

type TrainingBlocksResponse =
  | TrainingBlock[]
  | {
      blocks?: TrainingBlock[];
      data?: TrainingBlock[];
    };

function unwrapTrainings(response: TrainingsResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.trainings ?? response.data ?? [];
}

function unwrapTraining(response: TrainingResponse) {
  if ("id" in response) {
    return response;
  }

  const training = response.training ?? response.data ?? null;

  if (!training) {
    throw new Error("La API no devolvió el entrenamiento");
  }

  return training;
}

function unwrapTrainingBlocks(response: TrainingBlocksResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.blocks ?? response.data ?? [];
}

export async function getTrainings(
  organizationId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<TrainingsResponse>(
    `/organizations/${organizationId}/trainings`,
    { accessToken },
  );

  return unwrapTrainings(response);
}

export async function getTraining(
  organizationId: string,
  trainingId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<TrainingResponse>(
    `/organizations/${organizationId}/trainings/${trainingId}`,
    { accessToken },
  );

  return unwrapTraining(response);
}

export async function createTraining(
  organizationId: string,
  input: CreateTrainingInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<TrainingResponse>(
    `/organizations/${organizationId}/trainings`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapTraining(response);
}

export async function updateTraining(
  organizationId: string,
  trainingId: string,
  input: UpdateTrainingInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<TrainingResponse>(
    `/organizations/${organizationId}/trainings/${trainingId}`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapTraining(response);
}

export async function deleteTraining(
  organizationId: string,
  trainingId: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(
    `/organizations/${organizationId}/trainings/${trainingId}`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}

export async function addBlockToTraining(
  organizationId: string,
  trainingId: string,
  input: AddBlockToTrainingInput,
  accessToken?: string | null,
) {
  return apiFetch<TrainingBlock>(
    `/organizations/${organizationId}/trainings/${trainingId}/blocks`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function removeBlockFromTraining(
  organizationId: string,
  trainingId: string,
  trainingBlockId: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(
    `/organizations/${organizationId}/trainings/${trainingId}/blocks/${trainingBlockId}`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}

export async function reorderTrainingBlocks(
  organizationId: string,
  trainingId: string,
  input: ReorderTrainingBlocksInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<TrainingBlocksResponse>(
    `/organizations/${organizationId}/trainings/${trainingId}/blocks/reorder`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapTrainingBlocks(response);
}
