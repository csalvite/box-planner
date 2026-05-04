"use client";

import { useState } from "react";
import { Clock, GripVertical, Layers, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiTraining } from "@/lib/api/trainings";
import type { Block } from "@/lib/types";
import { cn } from "@/lib/utils";
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

const categoryColors: Record<Block["category"], string> = {
  "warm-up": "bg-chart-2/15 text-chart-2",
  technique: "bg-primary/15 text-primary",
  cardio: "bg-chart-5/15 text-chart-5",
  strength: "bg-chart-4/15 text-chart-4",
  cooldown: "bg-chart-3/15 text-chart-3",
  sparring: "bg-destructive/15 text-destructive",
};

const categoryLabels: Record<Block["category"], string> = {
  "warm-up": "calentamiento",
  technique: "tecnica",
  cardio: "cardio",
  strength: "fuerza",
  cooldown: "vuelta a la calma",
  sparring: "sparring",
};

function formatMinutes(totalDurationSec?: number | null) {
  return Math.round((totalDurationSec ?? 0) / 60);
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
  const trainingBlocks = [...(currentTraining.blocks ?? [])].sort(
    (firstBlock, secondBlock) => firstBlock.orderIndex - secondBlock.orderIndex,
  );
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId);

  const handleAddBlock = async () => {
    setError(null);

    if (!selectedBlockId) {
      setError("Selecciona un bloque.");
      return;
    }

    try {
      await addBlockToTraining.mutateAsync({
        blockId: selectedBlockId,
        orderIndex: trainingBlocks.length,
      });
      setSelectedBlockId("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo anadir el bloque.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              anadir bloque
            </h3>
            <p className="text-xs text-muted-foreground">
              los bloques se agregan al final de la estructura actual.
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="training-block-select">bloque disponible</Label>
            <Select
              value={selectedBlockId}
              onValueChange={setSelectedBlockId}
              disabled={blocksQuery.isLoading || blocksQuery.isError}
            >
              <SelectTrigger id="training-block-select">
                <SelectValue placeholder="Selecciona un bloque" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((block) => (
                  <SelectItem key={block.id} value={block.id}>
                    {block.name} - {block.duration} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddBlock}
            disabled={addBlockToTraining.isPending || blocksQuery.isLoading}
          >
            {addBlockToTraining.isPending ? "anadiendo..." : "anadir bloque"}
          </Button>
        </div>

        {selectedBlock ? (
          <div className="mt-3 rounded-md border border-border/70 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
            se anadira {selectedBlock.name}, {selectedBlock.duration} min,{" "}
            {categoryLabels[selectedBlock.category]}.
          </div>
        ) : null}
      </div>

      {blocksQuery.error && (
        <ErrorState
          title="no pudimos cargar los bloques"
          description="reintenta para poder anadir bloques al entrenamiento."
          actionLabel="reintentar"
          onAction={() => void blocksQuery.refetch()}
          className="min-h-[160px]"
        />
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              estructura
            </h3>
            <p className="text-xs text-muted-foreground">
              {trainingBlocks.length} bloques -{" "}
              {formatMinutes(currentTraining.totalDurationSec)} min totales
            </p>
          </div>
        </div>

        {trainingQuery.isLoading && (
          <LoadingState
            title="cargando estructura"
            description="estamos leyendo los bloques del entrenamiento."
            className="min-h-[180px]"
          />
        )}

        {removeBlockFromTraining.error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {removeBlockFromTraining.error.message}
          </p>
        )}

        {!trainingQuery.isLoading &&
          trainingBlocks.map((trainingBlock, index) => {
            const localBlock = blocks.find(
              (block) => block.id === trainingBlock.blockId,
            );
            const durationMin = formatMinutes(
              trainingBlock.customDurationSec ??
                trainingBlock.block?.estimatedDurationSec ??
                (localBlock ? localBlock.duration * 60 : 0),
            );
            const category = localBlock?.category;

            return (
              <div
                key={trainingBlock.id}
                className="grid gap-3 rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm md:grid-cols-[auto_1fr_auto]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/60 text-sm font-semibold text-foreground">
                    {index + 1}
                  </span>
                  <GripVertical className="hidden h-4 w-4 text-muted-foreground md:block" />
                </div>

                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-medium text-foreground">
                      {trainingBlock.block?.name ?? localBlock?.name ?? "bloque"}
                    </h4>
                    {category ? (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-white/10",
                          categoryColors[category],
                        )}
                      >
                        {categoryLabels[category]}
                      </span>
                    ) : null}
                  </div>
                  {trainingBlock.notes ? (
                    <p className="text-sm text-muted-foreground">
                      {trainingBlock.notes}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {durationMin} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      posicion {trainingBlock.orderIndex + 1}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 justify-self-end text-muted-foreground hover:text-destructive"
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
            );
          })}

        {!trainingQuery.isLoading && trainingBlocks.length === 0 && (
          <EmptyState
            title="este entrenamiento todavia no tiene bloques"
            description="anade un bloque para que la estructura y la duracion empiecen a tomar forma."
            icon={Layers}
            className="min-h-[210px]"
          />
        )}
      </div>
    </div>
  );
}
