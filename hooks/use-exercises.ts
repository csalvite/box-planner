"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  createExercise,
  deleteExercise,
  getBlockExercises,
  reorderExercises,
  updateExercise,
  type BlockExercise,
  type ExerciseInput,
  type ReorderExerciseInput,
  type UpdateExerciseInput,
} from "@/lib/api/exercises";
import { useAuth } from "@/components/providers/auth-provider";
import { blocksQueryKey } from "@/hooks/use-blocks";
import type { Block } from "@/lib/types";

export const blockExercisesQueryKey = (
  organizationId?: string | null,
  blockId?: string | null,
) => ["block-exercises", organizationId, blockId] as const;

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

export function useCreateExercise(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ExerciseInput) =>
      createExercise(
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

export function useUpdateExercise(
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
      updateExercise(
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

export function useDeleteExercise(
  organizationId?: string | null,
  blockId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exerciseId: string) =>
      deleteExercise(
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
