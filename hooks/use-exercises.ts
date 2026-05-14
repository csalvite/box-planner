"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createBlockExercise,
  createExercise,
  deleteBlockExercise,
  deleteExercise,
  getBlockExercises,
  getExercise,
  getExercises,
  reorderExercises,
  updateBlockExercise,
  updateExercise,
  type BlockExercise,
  type CreateExercisePayload,
  type Exercise,
  type ExerciseFilters,
  type ExerciseInput,
  type ReorderExerciseInput,
  type UpdateExercisePayload,
  type UpdateExerciseInput,
} from "@/lib/api/exercises";
import { useAuth } from "@/components/providers/auth-provider";
import { blocksQueryKey } from "@/hooks/use-blocks";
import type { Block } from "@/lib/types";

export const blockExercisesQueryKey = (
  organizationId?: string | null,
  blockId?: string | null,
) => ["block-exercises", organizationId, blockId] as const;

export const exercisesBaseQueryKey = (organizationId?: string | null) =>
  ["exercises", organizationId] as const;

export const exercisesQueryKey = (
  organizationId?: string | null,
  filters?: ExerciseFilters,
) =>
  [
    ...exercisesBaseQueryKey(organizationId),
    filters?.search ?? "",
    filters?.name ?? "",
    filters?.category ?? "all",
    filters?.level ?? "all",
    filters?.intensity ?? "all",
    filters?.requiresPartner === undefined
      ? "all"
      : String(filters.requiresPartner),
    filters?.isGlobal === undefined ? "all" : String(filters.isGlobal),
  ] as const;

function sortExercises(exercises: BlockExercise[]) {
  return [...exercises].sort((firstExercise, secondExercise) => {
    const orderDiff = firstExercise.orderIndex - secondExercise.orderIndex;

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return firstExercise.id.localeCompare(secondExercise.id);
  });
}

function updateBlockDuration(
  queryClient: QueryClient,
  organizationId?: string | null,
  blockId?: string | null,
  exercises?: BlockExercise[],
) {
  if (!blockId || !exercises) {
    return;
  }

  const estimatedDurationSec = exercises.reduce(
    (total, exercise) =>
      total + (exercise.durationSec ?? 0) + (exercise.restSec ?? 0),
    0,
  );

  queryClient.setQueryData<Block[]>(
    blocksQueryKey(organizationId),
    (blocks = []) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              duration: Math.round(estimatedDurationSec / 60),
              exercises: exercises.map((exercise) => exercise.id),
            }
          : block,
      ),
  );
}

function setBlockExercises(
  queryClient: QueryClient,
  organizationId?: string | null,
  blockId?: string | null,
  updater?: (exercises: BlockExercise[]) => BlockExercise[],
) {
  const queryKey = blockExercisesQueryKey(organizationId, blockId);
  const nextExercises = queryClient.setQueryData<BlockExercise[]>(
    queryKey,
    (exercises = []) => sortExercises(updater ? updater(exercises) : exercises),
  );

  updateBlockDuration(queryClient, organizationId, blockId, nextExercises);
}

async function refreshExerciseData(
  queryClient: QueryClient,
  organizationId?: string | null,
  blockId?: string | null,
) {
  const exercisesKey = blockExercisesQueryKey(organizationId, blockId);
  const blocksKey = blocksQueryKey(organizationId);

  await queryClient.invalidateQueries({ queryKey: exercisesKey });
  await queryClient.refetchQueries({ queryKey: exercisesKey, type: "active" });
  await queryClient.invalidateQueries({ queryKey: blocksKey });
  await queryClient.refetchQueries({ queryKey: blocksKey, type: "active" });

  const exercises = queryClient.getQueryData<BlockExercise[]>(exercisesKey);
  updateBlockDuration(queryClient, organizationId, blockId, exercises);
}

export function useBlockExercises(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: blockExercisesQueryKey(organizationId, blockId),
    queryFn: () =>
      getBlockExercises(
        organizationId as string,
        blockId as string,
        accessToken,
      ),
    enabled: Boolean(accessToken && organizationId && blockId),
  });
}

export function useExercise(
  organizationId?: string | null,
  exerciseId?: string | null,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: [...exercisesBaseQueryKey(organizationId), exerciseId],
    queryFn: () =>
      getExercise(exerciseId as string, accessToken, organizationId),
    enabled: Boolean(accessToken && organizationId && exerciseId),
  });
}

export function useExercises(
  organizationId?: string | null,
  filters?: ExerciseFilters,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: exercisesQueryKey(organizationId, filters),
    queryFn: () => getExercises(filters, accessToken, organizationId),
    enabled: Boolean(accessToken && organizationId),
  });
}

export function useCreateExercise(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExercisePayload) =>
      createExercise(input, accessToken, organizationId),
    onSuccess: async (exercise) => {
      queryClient.setQueriesData<Exercise[]>(
        { queryKey: exercisesBaseQueryKey(organizationId) },
        (exercises = []) => [
          exercise,
          ...exercises.filter(
            (currentExercise) => currentExercise.id !== exercise.id,
          ),
        ],
      );
      await queryClient.invalidateQueries({
        queryKey: exercisesBaseQueryKey(organizationId),
      });
    },
  });
}

export function useUpdateExercise(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exerciseId,
      input,
    }: {
      exerciseId: string;
      input: UpdateExercisePayload;
    }) => updateExercise(exerciseId, input, accessToken, organizationId),
    onSuccess: async (exercise) => {
      queryClient.setQueriesData<Exercise[]>(
        { queryKey: exercisesBaseQueryKey(organizationId) },
        (exercises = []) =>
          exercises.map((currentExercise) =>
            currentExercise.id === exercise.id ? exercise : currentExercise,
          ),
      );
      queryClient.setQueryData<Exercise>(
        [...exercisesBaseQueryKey(organizationId), exercise.id],
        exercise,
      );
      await queryClient.invalidateQueries({
        queryKey: exercisesBaseQueryKey(organizationId),
      });
    },
  });
}

export function useDeleteExercise(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: string) =>
      deleteExercise(exerciseId, accessToken, organizationId),
    onSuccess: async (_response, exerciseId) => {
      queryClient.setQueriesData<Exercise[]>(
        { queryKey: exercisesBaseQueryKey(organizationId) },
        (exercises = []) =>
          exercises.filter((exercise) => exercise.id !== exerciseId),
      );
      await queryClient.invalidateQueries({
        queryKey: exercisesBaseQueryKey(organizationId),
      });
    },
  });
}

export function useCreateBlockExercise(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExerciseInput) =>
      createBlockExercise(
        organizationId as string,
        blockId as string,
        input,
        accessToken,
      ),
    onSuccess: async (exercise) => {
      setBlockExercises(queryClient, organizationId, blockId, (exercises) => [
        ...exercises.filter((currentExercise) => currentExercise.id !== exercise.id),
        exercise,
      ]);
      await refreshExerciseData(queryClient, organizationId, blockId);
    },
  });
}

export function useUpdateBlockExercise(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exerciseId,
      input,
    }: {
      exerciseId: string;
      input: UpdateExerciseInput;
    }) =>
      updateBlockExercise(
        organizationId as string,
        blockId as string,
        exerciseId,
        input,
        accessToken,
      ),
    onSuccess: async (exercise) => {
      setBlockExercises(queryClient, organizationId, blockId, (exercises) =>
        exercises.map((currentExercise) =>
          currentExercise.id === exercise.id ? exercise : currentExercise,
        ),
      );
      await refreshExerciseData(queryClient, organizationId, blockId);
    },
  });
}

export function useDeleteBlockExercise(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: string) =>
      deleteBlockExercise(
        organizationId as string,
        blockId as string,
        exerciseId,
        accessToken,
      ),
    onSuccess: async (_response, exerciseId) => {
      setBlockExercises(queryClient, organizationId, blockId, (exercises) =>
        exercises.filter((exercise) => exercise.id !== exerciseId),
      );
      await refreshExerciseData(queryClient, organizationId, blockId);
    },
  });
}

export function useReorderExercises(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderExerciseInput) =>
      reorderExercises(
        organizationId as string,
        blockId as string,
        input,
        accessToken,
      ),
    onSuccess: async (exercises) => {
      setBlockExercises(queryClient, organizationId, blockId, () => exercises);
      await refreshExerciseData(queryClient, organizationId, blockId);
    },
  });
}
