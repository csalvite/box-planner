"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlock,
  deleteBlock,
  getBlock,
  getBlocks,
  updateBlock,
  type BlockFormInput,
} from "@/lib/api/blocks";
import { useAuth } from "@/components/providers/auth-provider";
import type { Block } from "@/lib/types";

export const blocksQueryKey = (organizationId?: string | null) =>
  ["blocks", organizationId] as const;

export function useBlocks(organizationId?: string | null) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: blocksQueryKey(organizationId),
    queryFn: () => getBlocks(organizationId as string, accessToken),
    enabled: Boolean(accessToken && organizationId),
  });
}

export function useBlock(organizationId?: string | null, blockId?: string) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ["blocks", organizationId, blockId],
    queryFn: () =>
      getBlock(organizationId as string, blockId as string, accessToken),
    enabled: Boolean(accessToken && organizationId && blockId),
  });
}

export function useCreateBlock(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BlockFormInput) =>
      createBlock(organizationId as string, input, accessToken),
    onSuccess: (block) => {
      const queryKey = blocksQueryKey(organizationId);

      queryClient.setQueryData<Block[]>(queryKey, (blocks = []) => [
        block,
        ...blocks.filter((currentBlock) => currentBlock.id !== block.id),
      ]);
      void queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
}

export function useUpdateBlock(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      blockId,
      input,
    }: {
      blockId: string;
      input: Partial<BlockFormInput>;
    }) => updateBlock(organizationId as string, blockId, input, accessToken),
    onSuccess: (block) => {
      const queryKey = blocksQueryKey(organizationId);

      queryClient.setQueryData<Block[]>(queryKey, (blocks = []) =>
        blocks.map((currentBlock) =>
          currentBlock.id === block.id ? block : currentBlock,
        ),
      );
      void queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
}

export function useDeleteBlock(organizationId?: string | null) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockId: string) =>
      deleteBlock(organizationId as string, blockId, accessToken),
    onSuccess: (_response, blockId) => {
      const queryKey = blocksQueryKey(organizationId);

      queryClient.setQueryData<Block[]>(queryKey, (blocks = []) =>
        blocks.filter((block) => block.id !== blockId),
      );
      void queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
}
