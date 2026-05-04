"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  addBlockToTraining,
  createTraining,
  deleteTraining,
  getTraining,
  getTrainings,
  removeBlockFromTraining,
  reorderTrainingBlocks,
  updateTraining,
  type AddBlockToTrainingInput,
  type ApiTraining,
  type CreateTrainingInput,
  type ReorderTrainingBlocksInput,
  type UpdateTrainingInput,
} from "@/lib/api/trainings";
import { useAuth } from "@/components/providers/auth-provider";

export const trainingsQueryKey = (organizationId?: string | null) =>
  ["trainings", organizationId] as const;

export const trainingQueryKey = (
  organizationId?: string | null,
  trainingId?: string | null,
) => ["training", organizationId, trainingId] as const;

function setTrainingInList(
  queryClient: QueryClient,
  organizationId?: string | null,
  training?: ApiTraining,
) {
  if (!training) {
    return;
  }

  queryClient.setQueryData<ApiTraining[]>(
    trainingsQueryKey(organizationId),
    (trainings = []) => {
      const exists = trainings.some(
        (currentTraining) => currentTraining.id === training.id,
      );

      if (!exists) {
        return [training, ...trainings];
      }

      return trainings.map((currentTraining) =>
        currentTraining.id === training.id ? training : currentTraining,
      );
    },
  );

  queryClient.setQueryData(trainingQueryKey(organizationId, training.id), training);
}

async function refreshTrainingQueries(
  queryClient: QueryClient,
  organizationId?: string | null,
  trainingId?: string | null,
) {
  const trainingsKey = trainingsQueryKey(organizationId);

  await queryClient.invalidateQueries({ queryKey: trainingsKey });
  await queryClient.refetchQueries({ queryKey: trainingsKey, type: "active" });

  if (trainingId) {
    const trainingKey = trainingQueryKey(organizationId, trainingId);

    await queryClient.invalidateQueries({ queryKey: trainingKey });
    await queryClient.refetchQueries({ queryKey: trainingKey, type: "active" });
  }
}

export function useTrainings(organizationId?: string | null) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: trainingsQueryKey(organizationId),
    queryFn: () => getTrainings(organizationId as string, accessToken),
    enabled: Boolean(accessToken && organizationId),
  });
}

export function useTraining(
  organizationId?: string | null,
  trainingId?: string | null,
) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: trainingQueryKey(organizationId, trainingId),
    queryFn: () =>
      getTraining(organizationId as string, trainingId as string, accessToken),
    enabled: Boolean(accessToken && organizationId && trainingId),
  });
}

export function useCreateTraining(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTrainingInput) =>
      createTraining(organizationId as string, input, accessToken),
    onSuccess: async (training) => {
      setTrainingInList(queryClient, organizationId, training);
      await refreshTrainingQueries(queryClient, organizationId);
    },
  });
}

export function useUpdateTraining(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trainingId,
      input,
    }: {
      trainingId: string;
      input: UpdateTrainingInput;
    }) =>
      updateTraining(
        organizationId as string,
        trainingId,
        input,
        accessToken,
      ),
    onSuccess: async (training, variables) => {
      setTrainingInList(queryClient, organizationId, training);
      await refreshTrainingQueries(
        queryClient,
        organizationId,
        variables.trainingId,
      );
    },
  });
}

export function useDeleteTraining(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trainingId: string) =>
      deleteTraining(organizationId as string, trainingId, accessToken),
    onSuccess: async (_response, trainingId) => {
      queryClient.setQueryData<ApiTraining[]>(
        trainingsQueryKey(organizationId),
        (trainings = []) =>
          trainings.filter((training) => training.id !== trainingId),
      );
      queryClient.removeQueries({
        queryKey: trainingQueryKey(organizationId, trainingId),
      });
      await refreshTrainingQueries(queryClient, organizationId);
    },
  });
}

export function useAddBlockToTraining(
  organizationId?: string | null,
  trainingId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      trainingId: nextTrainingId,
      ...input
    }: AddBlockToTrainingInput & { trainingId?: string }) =>
      addBlockToTraining(
        organizationId as string,
        (nextTrainingId ?? trainingId) as string,
        input,
        accessToken,
      ),
    onSuccess: async (_trainingBlock, variables) => {
      const currentTrainingId = variables.trainingId ?? trainingId;

      await refreshTrainingQueries(
        queryClient,
        organizationId,
        currentTrainingId,
      );
    },
  });
}

export function useRemoveBlockFromTraining(
  organizationId?: string | null,
  trainingId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trainingBlockId: string) =>
      removeBlockFromTraining(
        organizationId as string,
        trainingId as string,
        trainingBlockId,
        accessToken,
      ),
    onSuccess: async () => {
      await refreshTrainingQueries(queryClient, organizationId, trainingId);
    },
  });
}

export function useReorderTrainingBlocks(
  organizationId?: string | null,
  trainingId?: string | null,
) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReorderTrainingBlocksInput) =>
      reorderTrainingBlocks(
        organizationId as string,
        trainingId as string,
        input,
        accessToken,
      ),
    onSuccess: async () => {
      await refreshTrainingQueries(queryClient, organizationId, trainingId);
    },
  });
}
