import { apiFetch } from "@/lib/api/client";

export type ExerciseCategory =
  | "WARMUP"
  | "TECHNIQUE"
  | "BAG"
  | "SHADOW"
  | "PARTNER"
  | "SPARRING"
  | "HIIT"
  | "CARDIO"
  | "STRENGTH"
  | "CORE"
  | "COOLDOWN"
  | "OTHER"
  | (string & {});

export type ExerciseLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "ALL_LEVELS"
  | (string & {});

export type ExerciseIntensity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | (string & {});

export interface Exercise {
  id: string;
  organizationId?: string | null;
  name: string;
  shortDescription?: string | null;
  detailedDescription?: string | null;
  description?: string | null;
  category: ExerciseCategory;
  mainGoal?: string | null;
  level: ExerciseLevel;
  averageDurationMinutes?: number | null;
  intensity: ExerciseIntensity;
  recommendedGroupSize?: string | null;
  spaceRequired?: string | null;
  requiresPartner?: boolean | null;
  coachNotes?: string | null;
  material?: string[] | string | null;
  materials?: string[] | string | null;
  equipment?: string[] | string | null;
  tags?: string[] | string | null;
  variants?: unknown[] | Record<string, unknown> | string | null;
  compatibilities?: unknown[] | Record<string, unknown> | string | null;
  isGlobal?: boolean | null;
  isActive?: boolean | null;
  active?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  [key: string]: unknown;
}

export interface CreateExercisePayload {
  name: string;
  shortDescription?: string;
  detailedDescription?: string;
  category: ExerciseCategory;
  mainGoal?: string;
  level: ExerciseLevel;
  averageDurationMinutes?: number;
  intensity: ExerciseIntensity;
  recommendedGroupSize?: string;
  spaceRequired?: string;
  requiresPartner?: boolean;
  coachNotes?: string;
}

export type UpdateExercisePayload = Partial<CreateExercisePayload>;

export interface ExerciseFilters {
  search?: string;
  name?: string;
  category?: ExerciseCategory;
  level?: ExerciseLevel;
  intensity?: ExerciseIntensity;
  requiresPartner?: boolean;
  isGlobal?: boolean;
}

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
  exerciseId?: string;
  category?: string;
}

export type UpdateExerciseInput = Partial<ExerciseInput>;

export interface ReorderExerciseInput {
  order: Array<{
    exerciseId: string;
    orderIndex: number;
  }>;
}

type ExerciseLibraryResponse =
  | Exercise[]
  | {
      exercises?: Exercise[];
      data?: Exercise[] | { exercises?: Exercise[]; data?: Exercise[] };
      result?: Exercise[];
    };

type ExerciseLibraryItemResponse =
  | Exercise
  | {
      exercise?: Exercise;
      data?: Exercise;
      result?: Exercise;
    };

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

const exerciseCategories = [
  "WARMUP",
  "TECHNIQUE",
  "BAG",
  "SHADOW",
  "PARTNER",
  "SPARRING",
  "HIIT",
  "CARDIO",
  "STRENGTH",
  "CORE",
  "COOLDOWN",
  "OTHER",
] as const;

const exerciseLevels = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "ALL_LEVELS",
] as const;

const exerciseIntensities = ["LOW", "MEDIUM", "HIGH"] as const;

const categoryAliases: Record<string, ExerciseCategory> = {
  WARM_UP: "WARMUP",
  warm_up: "WARMUP",
  warmup: "WARMUP",
  calentamiento: "WARMUP",
  tecnica: "TECHNIQUE",
  technique: "TECHNIQUE",
  saco: "BAG",
  bag: "BAG",
  sombra: "SHADOW",
  shadow: "SHADOW",
  parejas: "PARTNER",
  pareja: "PARTNER",
  partner: "PARTNER",
  sparring: "SPARRING",
  hiit: "HIIT",
  cardio: "CARDIO",
  fuerza: "STRENGTH",
  strength: "STRENGTH",
  core: "CORE",
  cooldown: "COOLDOWN",
  cool_down: "COOLDOWN",
  "vuelta a la calma": "COOLDOWN",
  otro: "OTHER",
  other: "OTHER",
};

const levelAliases: Record<string, ExerciseLevel> = {
  beginner: "BEGINNER",
  principiante: "BEGINNER",
  intermediate: "INTERMEDIATE",
  intermedio: "INTERMEDIATE",
  advanced: "ADVANCED",
  avanzado: "ADVANCED",
  all_levels: "ALL_LEVELS",
  "todos los niveles": "ALL_LEVELS",
};

const intensityAliases: Record<string, ExerciseIntensity> = {
  low: "LOW",
  baja: "LOW",
  medium: "MEDIUM",
  media: "MEDIUM",
  high: "HIGH",
  alta: "HIGH",
};

function normalizeEnumKey(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeEnumValue<T extends string>(
  value: T | string | undefined,
  values: readonly T[],
  aliases: Record<string, T>,
  fallback: T,
) {
  if (!value) {
    return fallback;
  }

  if (values.includes(value as T)) {
    return value as T;
  }

  return aliases[normalizeEnumKey(value)] ?? fallback;
}

function normalizeExerciseCategory(value?: ExerciseCategory) {
  return normalizeEnumValue(
    value,
    exerciseCategories,
    categoryAliases,
    "TECHNIQUE",
  );
}

function normalizeExerciseLevel(value?: ExerciseLevel) {
  return normalizeEnumValue(value, exerciseLevels, levelAliases, "BEGINNER");
}

function normalizeExerciseIntensity(value?: ExerciseIntensity) {
  return normalizeEnumValue(
    value,
    exerciseIntensities,
    intensityAliases,
    "MEDIUM",
  );
}

function toExercisePayload(input: CreateExercisePayload): CreateExercisePayload {
  return {
    ...input,
    category: normalizeExerciseCategory(input.category),
    level: normalizeExerciseLevel(input.level),
    intensity: normalizeExerciseIntensity(input.intensity),
  };
}

function toUpdateExercisePayload(
  input: UpdateExercisePayload,
): UpdateExercisePayload {
  return {
    ...input,
    ...(input.category !== undefined
      ? { category: normalizeExerciseCategory(input.category) }
      : {}),
    ...(input.level !== undefined
      ? { level: normalizeExerciseLevel(input.level) }
      : {}),
    ...(input.intensity !== undefined
      ? { intensity: normalizeExerciseIntensity(input.intensity) }
      : {}),
  };
}

function buildExercisesPath(filters?: ExerciseFilters) {
  const params = new URLSearchParams();

  const search = filters?.search?.trim();
  const name = filters?.name?.trim();

  if (search) {
    params.set("search", search);
  }

  if (name) {
    params.set("name", name);
  }

  if (filters?.category) {
    params.set("category", normalizeExerciseCategory(filters.category));
  }

  if (filters?.level) {
    params.set("level", normalizeExerciseLevel(filters.level));
  }

  if (filters?.intensity) {
    params.set("intensity", normalizeExerciseIntensity(filters.intensity));
  }

  if (filters?.requiresPartner !== undefined) {
    params.set("requiresPartner", String(filters.requiresPartner));
  }

  if (filters?.isGlobal !== undefined) {
    params.set("isGlobal", String(filters.isGlobal));
  }

  const query = params.toString();

  return query ? `/exercises?${query}` : "/exercises";
}

function getOrganizationHeaders(organizationId?: string | null) {
  return organizationId ? { "x-organization-id": organizationId } : undefined;
}

function unwrapExerciseLibrary(response: ExerciseLibraryResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  const data = response.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    return data.exercises ?? data.data ?? [];
  }

  return response.exercises ?? response.result ?? [];
}

function unwrapExerciseLibraryItem(response: ExerciseLibraryItemResponse) {
  if ("id" in response) {
    return response;
  }

  const exercise = response.exercise ?? response.data ?? response.result ?? null;

  if (!exercise) {
    throw new Error("La API no devolvio el ejercicio");
  }

  return exercise;
}

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

export async function createBlockExercise(
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

export async function updateBlockExercise(
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

export async function deleteBlockExercise(
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

export async function getExercises(
  filters?: ExerciseFilters,
  accessToken?: string | null,
  organizationId?: string | null,
) {
  const response = await apiFetch<ExerciseLibraryResponse>(
    buildExercisesPath(filters),
    {
      accessToken,
      headers: getOrganizationHeaders(organizationId),
    },
  );

  return unwrapExerciseLibrary(response);
}

export async function getExercise(
  id: string,
  accessToken?: string | null,
  organizationId?: string | null,
) {
  const response = await apiFetch<ExerciseLibraryItemResponse>(
    `/exercises/${id}`,
    {
      accessToken,
      headers: getOrganizationHeaders(organizationId),
    },
  );

  return unwrapExerciseLibraryItem(response);
}

export async function createExercise(
  input: CreateExercisePayload,
  accessToken?: string | null,
  organizationId?: string | null,
) {
  const response = await apiFetch<ExerciseLibraryItemResponse>("/exercises", {
    accessToken,
    headers: getOrganizationHeaders(organizationId),
    method: "POST",
    body: JSON.stringify(toExercisePayload(input)),
  });

  return unwrapExerciseLibraryItem(response);
}

export async function updateExercise(
  id: string,
  input: UpdateExercisePayload,
  accessToken?: string | null,
  organizationId?: string | null,
) {
  const response = await apiFetch<ExerciseLibraryItemResponse>(
    `/exercises/${id}`,
    {
      accessToken,
      headers: getOrganizationHeaders(organizationId),
      method: "PATCH",
      body: JSON.stringify(toUpdateExercisePayload(input)),
    },
  );

  return unwrapExerciseLibraryItem(response);
}

export async function deleteExercise(
  id: string,
  accessToken?: string | null,
  organizationId?: string | null,
) {
  await apiFetch<void>(`/exercises/${id}`, {
    accessToken,
    headers: getOrganizationHeaders(organizationId),
    method: "DELETE",
  });
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
