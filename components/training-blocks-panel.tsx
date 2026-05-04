"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiTraining } from "@/lib/api/trainings";
import { useBlocks } from "@/hooks/use-blocks";
import {
  useAddBlockToTraining,
  useRemoveBlockFromTraining,
  useTraining,
} from "@/hooks/use-trainings";

interface TrainingBlocksPanelProps {
  organizationId: string;
  training: ApiTraining;
}

export function TrainingBlocksPanel({
  organizationId,
  training,
}: TrainingBlocksPanelProps) {
  const blocksQuery = useBlocks(organizationId);
  const trainingQuery = useTraining(organizationId, training.id);
  const addBlockToTraining = useAddBlockToTraining(organizationId, training.id);
  const removeBlockFromTraining = useRemoveBlockFromTraining(
    organizationId,
    training.id,
  );
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const blocks = blocksQuery.data ?? [];
  const currentTraining = trainingQuery.data ?? training;
  const trainingBlocks = currentTraining.blocks ?? [];

  const handleAddBlock = async () => {
    setError(null);

    if (!selectedBlockId) {
      setError("Selecciona un bloque.");
      return;
    }

    try {
      await addBlockToTraining.mutateAsync({ blockId: selectedBlockId });
      setSelectedBlockId("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo añadir el bloque.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row">
        <Select
          value={selectedBlockId}
          onValueChange={setSelectedBlockId}
          disabled={blocksQuery.isLoading || blocksQuery.isError}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecciona un bloque" />
          </SelectTrigger>
          <SelectContent>
            {blocks.map((block) => (
              <SelectItem key={block.id} value={block.id}>
                {block.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAddBlock}
          disabled={addBlockToTraining.isPending || blocksQuery.isLoading}
        >
          {addBlockToTraining.isPending ? "añadiendo..." : "añadir bloque"}
        </Button>
      </div>

      {blocksQuery.error && (
        <p className="text-sm text-destructive">
          no pudimos cargar los bloques.
        </p>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {trainingQuery.isLoading && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            cargando bloques del entrenamiento...
          </div>
        )}

        {removeBlockFromTraining.error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {removeBlockFromTraining.error.message}
          </p>
        )}

        {trainingBlocks.map((trainingBlock) => (
          <div
            key={trainingBlock.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-4"
          >
            <div className="min-w-0">
              <h4 className="truncate font-medium text-foreground">
                {trainingBlock.block?.name ?? "bloque"}
              </h4>
              <p className="text-sm text-muted-foreground">
                {Math.round(
                  (trainingBlock.customDurationSec ??
                    trainingBlock.block?.estimatedDurationSec ??
                    0) / 60,
                )}{" "}
                min
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={
                removeBlockFromTraining.isPending &&
                removeBlockFromTraining.variables === trainingBlock.id
              }
              onClick={() =>
                void removeBlockFromTraining.mutateAsync(trainingBlock.id)
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {trainingBlocks.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            este entrenamiento todavía no tiene bloques
          </div>
        )}
      </div>
    </div>
  );
}
