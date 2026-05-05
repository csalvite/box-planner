"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Activity, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useBlockExercises,
  useCreateExercise,
  useDeleteExercise,
} from "@/hooks/use-exercises";

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

export function BlockExercisesPanel({
  organizationId,
  blockId,
}: BlockExercisesPanelProps) {
  const exercisesQuery = useBlockExercises(organizationId, blockId);
  const createExercise = useCreateExercise(organizationId, blockId);
  const deleteExercise = useDeleteExercise(organizationId, blockId);
  const [form, setForm] = useState<ExerciseFormState>(initialExerciseForm);
  const [formError, setFormError] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
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
          description="estamos leyendo la estructura actual de este bloque."
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
              title="este bloque todavia no tiene ejercicios"
              description="anade el primer ejercicio para empezar a calcular la duracion del bloque."
              className="min-h-[190px]"
            />
          )}
        </div>
      )}
    </div>
  );
}
