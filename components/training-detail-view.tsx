"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Blocks,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileText,
  Layers,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
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
import type { ApiBlock } from "@/lib/api/types";
import type { ApiTraining, TrainingBlock } from "@/lib/api/trainings";
import type { BlockExercise } from "@/lib/api/exercises";
import type { Block } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBlocks } from "@/hooks/use-blocks";
import { useBlockExercises } from "@/hooks/use-exercises";
import {
  useAddBlockToTraining,
  useRemoveBlockFromTraining,
  useTraining,
} from "@/hooks/use-trainings";

interface TrainingDetailViewProps {
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

const backendCategoryToUiCategory: Record<string, Block["category"]> = {
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

function formatMinutes(totalDurationSec?: number | null) {
  return Math.round((totalDurationSec ?? 0) / 60);
}

function formatBlockMinutes(block: TrainingBlock, localBlock?: Block) {
  return formatMinutes(
    block.customDurationSec ??
      block.block?.estimatedDurationSec ??
      (localBlock ? localBlock.duration * 60 : 0),
  );
}

function formatTrainingType(trainingType: ApiTraining["trainingType"]) {
  return String(trainingType).toLowerCase() === "group" ? "grupo" : "personal";
}

function formatLevel(level?: string | null) {
  if (!level) {
    return "sin nivel";
  }

  const normalizedLevel = level.toLowerCase();

  if (normalizedLevel === "beginner") {
    return "inicial";
  }

  if (normalizedLevel === "advanced") {
    return "avanzado";
  }

  return "intermedio";
}

function getApiBlockCategory(block?: ApiBlock | null) {
  const categoryKey = block?.category?.key ?? block?.category?.name ?? null;

  if (!categoryKey) {
    return undefined;
  }

  return (
    backendCategoryToUiCategory[categoryKey] ??
    backendCategoryToUiCategory[categoryKey.toLowerCase()]
  );
}

function getExerciseCount(block: Block) {
  return block._count?.exercises ?? block.exercises?.length;
}

function isIncludedExercise(exercise: unknown): exercise is BlockExercise {
  return (
    typeof exercise === "object" &&
    exercise !== null &&
    "id" in exercise &&
    "name" in exercise &&
    typeof exercise.id === "string" &&
    typeof exercise.name === "string"
  );
}

function getIncludedExercises(block?: ApiBlock | null) {
  if (!Array.isArray(block?.exercises)) {
    return undefined;
  }

  const exercises = block.exercises.filter(isIncludedExercise);

  return exercises.length === block.exercises.length ? exercises : undefined;
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TrainingSummary({
  training,
  blockCount,
}: {
  training: ApiTraining;
  blockCount: number;
}) {
  const notes = training.notes ?? training.description ?? "sin notas";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
          {formatTrainingType(training.trainingType)}
        </span>
        <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
          {formatLevel(training.level)}
        </span>
      </div>

      <div>
        <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
          {training.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
          {notes}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatItem
          icon={Clock}
          label="duracion"
          value={`${formatMinutes(training.totalDurationSec)} min`}
        />
        <StatItem icon={Layers} label="bloques" value={blockCount} />
        <StatItem
          icon={Users}
          label="tipo"
          value={formatTrainingType(training.trainingType)}
        />
        <StatItem icon={Dumbbell} label="nivel" value={formatLevel(training.level)} />
      </div>
    </section>
  );
}

function BlockSelectPreview({ block }: { block: Block }) {
  const exerciseCount = getExerciseCount(block);

  return (
    <div className="rounded-md border border-border/70 bg-card/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-foreground">{block.name}</p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-white/10",
            categoryColors[block.category],
          )}
        >
          {categoryLabels[block.category]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {block.duration} min
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell className="h-3.5 w-3.5" />
          {exerciseCount ?? "-"} ejercicios
        </span>
      </div>
      {block.description ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-2">
          {block.description}
        </p>
      ) : null}
    </div>
  );
}

function AddBlockPanel({
  blocks,
  blocksQuery,
  selectedBlockId,
  selectedBlock,
  isPending,
  onSelectedBlockChange,
  onAddBlock,
}: {
  blocks: Block[];
  blocksQuery: ReturnType<typeof useBlocks>;
  selectedBlockId: string;
  selectedBlock?: Block;
  isPending: boolean;
  onSelectedBlockChange: (blockId: string) => void;
  onAddBlock: () => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/80 bg-background/45 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            sumar bloque a la clase
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            el bloque se anade al final de la secuencia.
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Plus className="h-4 w-4" />
        </span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="training-block-select">bloque</Label>
        <Select
          value={selectedBlockId}
          onValueChange={onSelectedBlockChange}
          disabled={blocksQuery.isLoading || blocksQuery.isError}
        >
          <SelectTrigger id="training-block-select" className="h-11 w-full">
            <SelectValue placeholder="elige un bloque preparado" />
          </SelectTrigger>
          <SelectContent>
            {blocks.map((block) => (
              <SelectItem key={block.id} value={block.id}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{block.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {block.duration} min - {categoryLabels[block.category]}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBlock ? <BlockSelectPreview block={selectedBlock} /> : null}

      <Button
        size="lg"
        className="w-full"
        onClick={onAddBlock}
        disabled={isPending || blocksQuery.isLoading}
      >
        <Plus className="h-4 w-4" />
        {isPending ? "anadiendo..." : "anadir a la estructura"}
      </Button>
    </section>
  );
}

function ExerciseLine({ exercise }: { exercise: BlockExercise }) {
  return (
    <li className="rounded-md border border-border/60 bg-background/45 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{exercise.name}</p>
          {exercise.description || exercise.notes ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground line-clamp-2">
              {exercise.description ?? exercise.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
          {exercise.durationSec ? (
            <span>{formatMinutes(exercise.durationSec)} min</span>
          ) : null}
          {exercise.reps ? <span>{exercise.reps} reps</span> : null}
          {exercise.restSec ? <span>{exercise.restSec}s descanso</span> : null}
        </div>
      </div>
    </li>
  );
}

function IncludedExercisesList({ exercises }: { exercises: BlockExercise[] }) {
  if (exercises.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-background/35 px-3 py-3 text-xs text-muted-foreground">
        sin ejercicios cargados; puedes completarlos desde la vista de bloques
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {exercises.map((exercise) => (
        <ExerciseLine key={exercise.id} exercise={exercise} />
      ))}
    </ul>
  );
}

function FetchedBlockExercises({
  organizationId,
  blockId,
}: {
  organizationId: string;
  blockId: string;
}) {
  const exercisesQuery = useBlockExercises(organizationId, blockId);
  const exercises = exercisesQuery.data ?? [];

  if (exercisesQuery.isLoading) {
    return (
      <div className="rounded-md border border-border/60 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
        cargando ejercicios...
      </div>
    );
  }

  if (exercisesQuery.error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        no pudimos cargar los ejercicios de este bloque.
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-background/35 px-3 py-3 text-xs text-muted-foreground">
        sin ejercicios cargados; puedes completarlos desde la vista de bloques
      </div>
    );
  }

  return <IncludedExercisesList exercises={exercises} />;
}

function TrainingBlockExercises({
  organizationId,
  trainingBlock,
}: {
  organizationId: string;
  trainingBlock: TrainingBlock;
}) {
  const includedExercises = getIncludedExercises(trainingBlock.block);

  if (includedExercises) {
    return <IncludedExercisesList exercises={includedExercises} />;
  }

  return (
    <FetchedBlockExercises
      organizationId={organizationId}
      blockId={trainingBlock.blockId}
    />
  );
}

function TrainingBlockCard({
  organizationId,
  trainingBlock,
  localBlock,
  index,
  isRemoving,
  onRemove,
}: {
  organizationId: string;
  trainingBlock: TrainingBlock;
  localBlock?: Block;
  index: number;
  isRemoving: boolean;
  onRemove: () => void;
}) {
  const apiCategory = getApiBlockCategory(trainingBlock.block);
  const category = localBlock?.category ?? apiCategory;
  const title = trainingBlock.block?.name ?? localBlock?.name ?? "bloque";
  const description =
    trainingBlock.notes ??
    trainingBlock.block?.description ??
    localBlock?.description ??
    null;
  const durationMin = formatBlockMinutes(trainingBlock, localBlock);

  return (
    <article className="relative overflow-hidden rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm md:p-5">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
        <div className="flex items-center gap-3 sm:flex-col">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </span>
          <span className="hidden h-full min-h-12 w-px bg-border/70 sm:block" />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold leading-tight text-foreground">
                    {title}
                  </h3>
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
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    parte {trainingBlock.orderIndex + 1}
                  </span>
                  {trainingBlock.customDurationSec ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      duracion ajustada
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex w-fit items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-primary">
                <Clock className="h-4 w-4" />
                <span className="text-base font-semibold">{durationMin}</span>
                <span className="text-xs font-medium">min</span>
              </div>
            </div>

            {description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">sin notas</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5" />
              ejercicios
            </div>
            <TrainingBlockExercises
              organizationId={organizationId}
              trainingBlock={trainingBlock}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon-lg"
          className="justify-self-end text-muted-foreground hover:text-destructive sm:mt-0"
          disabled={isRemoving}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

export function TrainingDetailView({
  organizationId,
  training,
}: TrainingDetailViewProps) {
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
      toast.error("elige un bloque para anadirlo");
      return;
    }

    try {
      const addPromise = addBlockToTraining.mutateAsync({
        blockId: selectedBlockId,
        orderIndex: trainingBlocks.length,
      });

      toast.promise(addPromise, {
        loading: "anadiendo bloque...",
        success: "bloque anadido al entrenamiento",
        error: "no se pudo anadir el bloque",
      });

      await addPromise;
      setSelectedBlockId("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo anadir el bloque.",
      );
    }
  };

  const handleRemoveBlock = async (trainingBlockId: string) => {
    const removePromise = removeBlockFromTraining.mutateAsync(trainingBlockId);

    toast.promise(removePromise, {
      loading: "quitando bloque...",
      success: "bloque quitado del entrenamiento",
      error: "no se pudo quitar el bloque",
    });

    try {
      await removePromise;
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  return (
    <div className="space-y-6">
      <TrainingSummary
        training={currentTraining}
        blockCount={trainingBlocks.length}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-start">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                estructura de clase
              </h3>
              <p className="text-sm text-muted-foreground">
                {trainingBlocks.length} bloques -{" "}
                {formatMinutes(currentTraining.totalDurationSec)} min totales
              </p>
            </div>
          </div>

          {trainingQuery.isLoading && (
            <LoadingState
              title="cargando estructura"
              description="estamos leyendo los bloques del entrenamiento."
              className="min-h-[220px]"
            />
          )}

          {trainingQuery.error && (
            <ErrorState
              title="no pudimos cargar el entrenamiento"
              description={trainingQuery.error.message}
              actionLabel="reintentar"
              onAction={() => void trainingQuery.refetch()}
              className="min-h-[220px]"
            />
          )}

          {removeBlockFromTraining.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {removeBlockFromTraining.error.message}
            </p>
          )}

          {!trainingQuery.isLoading &&
            !trainingQuery.error &&
            trainingBlocks.map((trainingBlock, index) => {
              const localBlock = blocks.find(
                (block) => block.id === trainingBlock.blockId,
              );

              return (
                <TrainingBlockCard
                  key={trainingBlock.id}
                  organizationId={organizationId}
                  trainingBlock={trainingBlock}
                  localBlock={localBlock}
                  index={index}
                  isRemoving={
                    removeBlockFromTraining.isPending &&
                    removeBlockFromTraining.variables === trainingBlock.id
                  }
                  onRemove={() => void handleRemoveBlock(trainingBlock.id)}
                />
              );
            })}

          {!trainingQuery.isLoading &&
            !trainingQuery.error &&
            trainingBlocks.length === 0 && (
              <EmptyState
                title="este entrenamiento todavia no tiene bloques"
                description="anade un bloque para que la clase tenga una secuencia clara."
                icon={Blocks}
                className="min-h-[240px]"
              />
            )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <AddBlockPanel
            blocks={blocks}
            blocksQuery={blocksQuery}
            selectedBlockId={selectedBlockId}
            selectedBlock={selectedBlock}
            isPending={addBlockToTraining.isPending}
            onSelectedBlockChange={setSelectedBlockId}
            onAddBlock={() => void handleAddBlock()}
          />

          {blocksQuery.isLoading && (
            <LoadingState
              title="cargando bloques"
              description="preparando bloques disponibles para esta clase."
              className="min-h-[160px]"
            />
          )}

          {blocksQuery.error && (
            <ErrorState
              title="no pudimos cargar los bloques"
              description="reintenta para poder anadir bloques al entrenamiento."
              actionLabel="reintentar"
              onAction={() => void blocksQuery.refetch()}
              className="min-h-[180px]"
            />
          )}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <section className="rounded-lg border border-border/80 bg-background/45 p-4 text-sm leading-6 text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <FileText className="h-4 w-4" />
              lectura rapida
            </div>
            sigue el orden de arriba abajo en movil; en escritorio usa el panel
            lateral para sumar bloques mientras revisas la estructura.
          </section>
        </aside>
      </div>
    </div>
  );
}
