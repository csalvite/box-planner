import { apiFetch } from "@/lib/api/client";

export interface BlockExercise {
  id: string;
  blockId: string;
  name: string;
  description?: string | null;
  durationSec?: number | null;
  reps?: number | null;
  restSec: number;
  orderIndex: number;
  targetArea?: string | null;
  mediaId?: string | null;
  notes?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export interface ExerciseInput {
  name: string;
  description?: string;
  durationSec?: number;
  reps?: number;
  restSec: number;
  orderIndex?: number;
  targetArea?: string;
  mediaId?: string;
  notes?: string;
}

export type UpdateExerciseInput = Partial<ExerciseInput>;

export interface ReorderExerciseInput {
  order: Array<{
    exerciseId: string;
    orderIndex: number;
  }>;
}

type ExercisesResponse =
  | BlockExercise[]
  | {
      exercises?: BlockExercise[];
      data?: BlockExercise[];
    };

type ExerciseResponse =
  | BlockExercise
  | {
      exercise?: BlockExercise;
      data?: BlockExercise;
    };

function unwrapExercises(response: ExercisesResponse) {
  if (Array.isArray(response)) {
    return sortExercises(response.map(normalizeExercise));
  }

  return sortExercises((response.exercises ?? response.data ?? []).map(normalizeExercise));
}

function unwrapExercise(response: ExerciseResponse) {
  if ("id" in response) {
    return normalizeExercise(response);
  }

  const exercise = response.exercise ?? response.data ?? null;

  if (!exercise) {
    throw new Error("La API no devolvió el ejercicio");
  }

  return normalizeExercise(exercise);
}

function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function numberOrDefault(value: unknown, fallback: number) {
  return optionalNumber(value) ?? fallback;
}

function normalizeExercise(exercise: BlockExercise): BlockExercise {
  return {
    ...exercise,
    durationSec: optionalNumber(exercise.durationSec),
    reps: optionalNumber(exercise.reps),
    restSec: numberOrDefault(exercise.restSec, 0),
    orderIndex: numberOrDefault(exercise.orderIndex, 0),
  };
}

function sortExercises(exercises: BlockExercise[]) {
  return [...exercises].sort((firstExercise, secondExercise) => {
    const orderDiff = firstExercise.orderIndex - secondExercise.orderIndex;

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return firstExercise.id.localeCompare(secondExercise.id);
  });
}

export async function getBlockExercises(
  organizationId: string,
  blockId: string,
  accessToken?: string | null,
) {
  const response = await apiFetch<ExercisesResponse>(
    `/organizations/${organizationId}/blocks/${blockId}/exercises`,
    { accessToken },
  );

  return unwrapExercises(response);
}

export async function createExercise(
  organizationId: string,
  blockId: string,
  input: ExerciseInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ExerciseResponse>(
    `/organizations/${organizationId}/blocks/${blockId}/exercises`,
    {
      accessToken,
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return unwrapExercise(response);
}

export async function updateExercise(
  organizationId: string,
  blockId: string,
  exerciseId: string,
  input: UpdateExerciseInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ExerciseResponse>(
    `/organizations/${organizationId}/blocks/${blockId}/exercises/${exerciseId}`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapExercise(response);
}

export async function deleteExercise(
  organizationId: string,
  blockId: string,
  exerciseId: string,
  accessToken?: string | null,
) {
  await apiFetch<void>(
    `/organizations/${organizationId}/blocks/${blockId}/exercises/${exerciseId}`,
    {
      accessToken,
      method: "DELETE",
    },
  );
}

export async function reorderExercises(
  organizationId: string,
  blockId: string,
  input: ReorderExerciseInput,
  accessToken?: string | null,
) {
  const response = await apiFetch<ExercisesResponse>(
    `/organizations/${organizationId}/blocks/${blockId}/exercises/reorder`,
    {
      accessToken,
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return unwrapExercises(response);
}
