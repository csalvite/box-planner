"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Clock, Library, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useBlockExercises,
  useCreateBlockExercise,
  useDeleteBlockExercise,
  useExercises,
} from "@/hooks/use-exercises";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseFilters,
  ExerciseIntensity,
  ExerciseLevel,
  ExerciseInput,
} from "@/lib/api/exercises";

interface BlockExercisesPanelProps {
  organizationId: string;
  blockId: string;
}

interface ExerciseFormState {
  name: string;
  durationSec: string;
  reps: string;
  restSec: string;
  targetArea: string;
  notes: string;
}

const initialExerciseForm: ExerciseFormState = {
  name: "",
  durationSec: "",
  reps: "",
  restSec: "0",
  targetArea: "",
  notes: "",
};

const ALL_VALUE = "all";

const categoryOptions: Array<{ value: ExerciseCategory; label: string }> = [
  { value: "WARMUP", label: "Calentamiento" },
  { value: "TECHNIQUE", label: "Tecnica" },
  { value: "BAG", label: "Saco" },
  { value: "SHADOW", label: "Sombra" },
  { value: "PARTNER", label: "Parejas" },
  { value: "SPARRING", label: "Sparring" },
  { value: "HIIT", label: "HIIT" },
  { value: "CARDIO", label: "Cardio" },
  { value: "STRENGTH", label: "Fuerza" },
  { value: "CORE", label: "Core" },
  { value: "COOLDOWN", label: "Vuelta a la calma" },
  { value: "OTHER", label: "Otro" },
];

const levelOptions: Array<{ value: ExerciseLevel; label: string }> = [
  { value: "BEGINNER", label: "Principiante" },
  { value: "INTERMEDIATE", label: "Intermedio" },
  { value: "ADVANCED", label: "Avanzado" },
  { value: "ALL_LEVELS", label: "Todos los niveles" },
];

const intensityOptions: Array<{ value: ExerciseIntensity; label: string }> = [
  { value: "LOW", label: "Baja" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
];

function optionalNumber(value: string, minValue = 0) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const nextValue = Number.parseInt(trimmed, 10);
  return Number.isFinite(nextValue) && nextValue >= minValue
    ? nextValue
    : undefined;
}

function requiredNumber(value: string, minValue = 0) {
  return optionalNumber(value, minValue) ?? minValue;
}

function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

function getExerciseDescription(exercise: Exercise) {
  return (
    exercise.shortDescription ??
    exercise.description ??
    exercise.detailedDescription ??
    ""
  );
}

function exerciseToBlockInput(
  exercise: Exercise,
  includeLibraryId: boolean,
): ExerciseInput {
  return {
    ...(includeLibraryId ? { exerciseId: exercise.id } : {}),
    name: exercise.name,
    description: getExerciseDescription(exercise) || undefined,
    durationSec: exercise.averageDurationMinutes
      ? exercise.averageDurationMinutes * 60
      : undefined,
    restSec: 0,
    targetArea: exercise.mainGoal ?? undefined,
    notes: exercise.coachNotes ?? undefined,
    // TODO: when the block-exercises endpoint persists library links, keep
    // exerciseId as the canonical relation and remove the fallback copy path.
    category: includeLibraryId ? exercise.category : undefined,
  };
}

export function BlockExercisesPanel({
  organizationId,
  blockId,
}: BlockExercisesPanelProps) {
  const exercisesQuery = useBlockExercises(organizationId, blockId);
  const createExercise = useCreateBlockExercise(organizationId, blockId);
  const deleteExercise = useDeleteBlockExercise(organizationId, blockId);
  const [form, setForm] = useState<ExerciseFormState>(initialExerciseForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState(ALL_VALUE);
  const [libraryLevel, setLibraryLevel] = useState(ALL_VALUE);
  const [libraryIntensity, setLibraryIntensity] = useState(ALL_VALUE);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const libraryFilters = useMemo<ExerciseFilters>(
    () => ({
      ...(librarySearch.trim() ? { search: librarySearch.trim() } : {}),
      ...(libraryCategory !== ALL_VALUE
        ? { category: libraryCategory as ExerciseCategory }
        : {}),
      ...(libraryLevel !== ALL_VALUE
        ? { level: libraryLevel as ExerciseLevel }
        : {}),
      ...(libraryIntensity !== ALL_VALUE
        ? { intensity: libraryIntensity as ExerciseIntensity }
        : {}),
    }),
    [libraryCategory, libraryIntensity, libraryLevel, librarySearch],
  );
  const libraryQuery = useExercises(organizationId, libraryFilters);

  const exercises = [...(exercisesQuery.data ?? [])].sort(
    (firstExercise, secondExercise) => {
      const orderDiff = firstExercise.orderIndex - secondExercise.orderIndex;

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return firstExercise.id.localeCompare(secondExercise.id);
    },
  );

  const handleCreateExercise = async () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    try {
      const createPromise = createExercise.mutateAsync({
        name: form.name.trim(),
        durationSec: optionalNumber(form.durationSec, 1),
        reps: optionalNumber(form.reps, 1),
        restSec: requiredNumber(form.restSec),
        targetArea: form.targetArea.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      toast.promise(createPromise, {
        loading: "anadiendo ejercicio...",
        success: "ejercicio anadido",
        error: "no se pudo anadir el ejercicio",
      });

      await createPromise;
      setForm(initialExerciseForm);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo crear el ejercicio.",
      );
    }
  };

  const handleAddLibraryExercise = async (exercise: Exercise) => {
    setLibraryError(null);

    const createWithLibraryId = createExercise.mutateAsync(
      exerciseToBlockInput(exercise, true),
    );

    toast.promise(createWithLibraryId, {
      loading: "anadiendo desde biblioteca...",
      success: "ejercicio anadido al bloque",
      error: "reintentando como copia manual...",
    });

    try {
      await createWithLibraryId;
      return;
    } catch {
      try {
        const fallbackPromise = createExercise.mutateAsync(
          exerciseToBlockInput(exercise, false),
        );

        toast.promise(fallbackPromise, {
          loading: "anadiendo copia del ejercicio...",
          success: "copia anadida al bloque",
          error: "no se pudo anadir el ejercicio",
        });

        await fallbackPromise;
      } catch (error) {
        setLibraryError(
          error instanceof Error
            ? error.message
            : "No se pudo anadir el ejercicio al bloque.",
        );
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-lg border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              desde biblioteca
            </h3>
            <p className="text-xs text-muted-foreground">
              busca ejercicios reutilizables y anadelos a esta parte.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Library className="h-4 w-4" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              placeholder="buscar en biblioteca"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={libraryCategory} onValueChange={setLibraryCategory}>
              <SelectTrigger>
                <SelectValue placeholder="categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>todas</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={libraryLevel} onValueChange={setLibraryLevel}>
              <SelectTrigger>
                <SelectValue placeholder="nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>todos</SelectItem>
                {levelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={libraryIntensity} onValueChange={setLibraryIntensity}>
              <SelectTrigger>
                <SelectValue placeholder="intensidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>todas</SelectItem>
                {intensityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {libraryQuery.isLoading ? (
          <LoadingState
            title="cargando biblioteca"
            description="estamos buscando ejercicios reutilizables."
            className="min-h-[160px]"
          />
        ) : null}

        {libraryQuery.error ? (
          <ErrorState
            title="no pudimos cargar la biblioteca"
            description={libraryQuery.error.message}
            actionLabel="reintentar"
            onAction={() => void libraryQuery.refetch()}
            className="min-h-[160px]"
          />
        ) : null}

        {libraryError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {libraryError}
          </p>
        ) : null}

        {!libraryQuery.isLoading && !libraryQuery.error ? (
          <div className="space-y-3">
            {(libraryQuery.data ?? []).slice(0, 6).map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-card/60 p-3 shadow-sm"
              >
                <div className="min-w-0 space-y-1">
                  <h4 className="font-medium text-foreground">
                    {exercise.name}
                  </h4>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {getExerciseDescription(exercise) || "sin descripcion"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {getOptionLabel(categoryOptions, exercise.category)}
                    </Badge>
                    <Badge variant="outline">
                      {getOptionLabel(levelOptions, exercise.level)}
                    </Badge>
                    <Badge variant="outline">
                      {getOptionLabel(intensityOptions, exercise.intensity)}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  disabled={createExercise.isPending}
                  onClick={() => void handleAddLibraryExercise(exercise)}
                >
                  <Plus className="h-4 w-4" />
                  anadir
                </Button>
              </div>
            ))}

            {(libraryQuery.data ?? []).length === 0 ? (
              <EmptyState
                title="sin resultados en biblioteca"
                description="prueba con otra busqueda o usa el formulario manual."
                className="min-h-[160px]"
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-lg border border-border/80 bg-background/45 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              nuevo ejercicio
            </h3>
            <p className="text-xs text-muted-foreground">
              combina tiempo, reps y descanso para calcular la duracion.
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="exercise-name">nombre</Label>
            <Input
              id="exercise-name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercise-duration">duracion seg.</Label>
            <Input
              id="exercise-duration"
              type="number"
              min="1"
              value={form.durationSec}
              onChange={(event) =>
                setForm({ ...form, durationSec: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercise-reps">reps</Label>
            <Input
              id="exercise-reps"
              type="number"
              min="1"
              value={form.reps}
              onChange={(event) =>
                setForm({ ...form, reps: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercise-rest">descanso seg.</Label>
            <Input
              id="exercise-rest"
              type="number"
              min="0"
              value={form.restSec}
              onChange={(event) =>
                setForm({ ...form, restSec: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exercise-target">zona</Label>
            <Input
              id="exercise-target"
              value={form.targetArea}
              onChange={(event) =>
                setForm({ ...form, targetArea: event.target.value })
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="exercise-notes">notas</Label>
            <Textarea
              id="exercise-notes"
              rows={2}
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </div>
        </div>

        {formError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleCreateExercise}
          disabled={createExercise.isPending}
        >
          {createExercise.isPending ? "creando..." : "anadir ejercicio"}
        </Button>
      </div>

      {exercisesQuery.isLoading && (
        <LoadingState
          title="cargando ejercicios"
          description="estamos leyendo la estructura actual de esta parte."
          className="min-h-[180px]"
        />
      )}

      {exercisesQuery.error && (
        <ErrorState
          title="no pudimos cargar los ejercicios"
          description={exercisesQuery.error.message}
          actionLabel="reintentar"
          onAction={() => void exercisesQuery.refetch()}
          className="min-h-[180px]"
        />
      )}

      {!exercisesQuery.isLoading && !exercisesQuery.error && (
        <div className="space-y-3">
          {deleteExercise.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteExercise.error.message}
            </p>
          )}

          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="truncate font-medium text-foreground">
                    {exercise.name}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {(exercise.durationSec ?? 0) + (exercise.restSec ?? 0)}s
                  </span>
                  {exercise.reps ? <span>{exercise.reps} reps</span> : null}
                  {exercise.targetArea ? (
                    <span>{exercise.targetArea}</span>
                  ) : null}
                </div>
                {exercise.notes ? (
                  <p className="text-sm text-muted-foreground">
                    {exercise.notes}
                  </p>
                ) : null}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={
                  deleteExercise.isPending &&
                  deleteExercise.variables === exercise.id
                }
                onClick={() => {
                  const deletePromise = deleteExercise.mutateAsync(exercise.id);

                  toast.promise(deletePromise, {
                    loading: "borrando ejercicio...",
                    success: "ejercicio borrado",
                    error: "no se pudo borrar el ejercicio",
                  });

                  void deletePromise.catch(() => undefined);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {exercises.length === 0 && (
            <EmptyState
              title="esta parte todavia no tiene ejercicios"
              description="anade el primer ejercicio para empezar a calcular su duracion."
              className="min-h-[190px]"
            />
          )}
        </div>
      )}
    </div>
  );
}
