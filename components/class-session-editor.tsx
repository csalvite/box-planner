"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Dumbbell,
  FileText,
  GripVertical,
  Library,
  ListRestart,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/data-state";
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
  useAddExerciseToClassSessionSection,
  useCreateClassSessionSection,
  useDeleteClassSessionSection,
  useDeleteClassSessionSectionExercise,
  useReorderClassSessionSectionExercises,
  useReorderClassSessionSections,
  useUpdateClassSessionSection,
  useUpdateClassSessionSectionExercise,
} from "@/hooks/use-class-sessions";
import { useExercises } from "@/hooks/use-exercises";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseFilters,
  ExerciseIntensity,
  ExerciseLevel,
} from "@/lib/api/exercises";
import type {
  ClassSession,
  ClassSessionSection,
  ClassSessionSectionExercise,
  ClassSessionStatusCode,
  UpdateClassSessionInput,
} from "@/lib/api/class-sessions";
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";
const GLOBAL_SOURCE_VALUE = "global";
const LOCAL_SOURCE_VALUE = "local";

type AddExerciseMode = "library" | "manual";

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

const defaultSectionNames = [
  "Calentamiento",
  "Tecnica",
  "Trabajo principal",
  "HIIT",
  "Vuelta a la calma",
];

interface ClassEditorForm {
  title: string;
  startsAt: string;
  endsAt: string;
  targetDurationMinutes: string;
  status: ClassSessionStatusCode;
  notes: string;
}

interface SectionDraft {
  name: string;
  goal: string;
  durationMinutes: string;
  notes: string;
}

interface ExerciseDraft {
  name: string;
  description: string;
  durationMinutes: string;
  reps: string;
  restSec: string;
  notes: string;
}

interface ManualExerciseForm extends ExerciseDraft {}

const emptyManualExercise: ManualExerciseForm = {
  name: "",
  description: "",
  durationMinutes: "",
  reps: "",
  restSec: "",
  notes: "",
};

function toDateTimeInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function addMinutesToIsoDateTime(value: string, minutes: string) {
  const date = new Date(value);
  const durationMinutes = Number.parseInt(minutes, 10);

  if (
    Number.isNaN(date.getTime()) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return undefined;
  }

  return new Date(date.getTime() + durationMinutes * 60000).toISOString();
}

function optionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const numberValue = Number.parseInt(trimmed, 10);

  return Number.isFinite(numberValue) && numberValue >= 0
    ? numberValue
    : undefined;
}

function positiveOptionalNumber(value: string) {
  const numberValue = optionalNumber(value);

  return numberValue !== undefined && numberValue > 0
    ? numberValue
    : undefined;
}

function getTargetDuration(session: ClassSession) {
  return session.targetDurationMinutes ?? session.durationMinutes ?? null;
}

function getCalculatedExerciseDurationMinutes(session: ClassSession) {
  const totalDurationSec = (session.sections ?? []).reduce(
    (classTotal, section) =>
      classTotal +
      (section.exercises ?? []).reduce(
        (sectionTotal, exercise) => sectionTotal + (exercise.durationSec ?? 0),
        0,
      ),
    0,
  );

  return Math.round(totalDurationSec / 60);
}

function getEstimatedDuration(session: ClassSession) {
  return (
    session.estimatedDurationMinutes ??
    getCalculatedExerciseDurationMinutes(session)
  );
}

function formatDurationDelta(
  targetDurationMinutes?: number,
  estimatedDurationMinutes?: number,
) {
  if (targetDurationMinutes === undefined) {
    return "define objetivo";
  }

  const delta = targetDurationMinutes - (estimatedDurationMinutes ?? 0);

  if (delta > 0) {
    return `faltan ${delta} min`;
  }

  if (delta < 0) {
    return `sobran ${Math.abs(delta)} min`;
  }

  return "en objetivo";
}

function minutesToSeconds(value: string) {
  const minutes = optionalNumber(value);

  return minutes === undefined ? undefined : minutes * 60;
}

function secondsToMinutes(value?: number | null) {
  return value ? String(Math.round(value / 60)) : "";
}

function normalizeStatus(status?: string | null): ClassSessionStatusCode {
  const normalized = String(status ?? "SCHEDULED").toUpperCase();

  if (normalized === "COMPLETED" || normalized === "CANCELLED") {
    return normalized;
  }

  return "SCHEDULED";
}

function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value?: string | null,
) {
  return (
    options.find((option) => option.value === value)?.label ?? value ?? "-"
  );
}

function getExerciseDescription(exercise: Exercise) {
  return (
    exercise.shortDescription ??
    exercise.description ??
    exercise.detailedDescription ??
    ""
  );
}

function getExerciseSourceLabel(exercise: Exercise) {
  return exercise.isGlobal === false || exercise.organizationId
    ? "Mi gimnasio"
    : "BoxPlanner";
}

function formatClassDate(value?: string | Date | null) {
  if (!value) {
    return "sin programar";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "fecha pendiente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sectionToDraft(section: ClassSessionSection): SectionDraft {
  return {
    name: section.name,
    goal: section.goal ?? "",
    durationMinutes:
      section.durationMinutes !== undefined && section.durationMinutes !== null
        ? String(section.durationMinutes)
        : secondsToMinutes(section.durationSec),
    notes: section.notes ?? "",
  };
}

function exerciseToDraft(exercise: ClassSessionSectionExercise): ExerciseDraft {
  return {
    name: exercise.name,
    description: exercise.description ?? "",
    durationMinutes: secondsToMinutes(exercise.durationSec),
    reps: exercise.reps ? String(exercise.reps) : "",
    restSec:
      exercise.restSec !== undefined && exercise.restSec !== null
        ? String(exercise.restSec)
        : "",
    notes: exercise.notes ?? "",
  };
}

function summarizeExercise(exercise: ClassSessionSectionExercise) {
  const parts = [
    exercise.durationSec
      ? `${Math.round(exercise.durationSec / 60)} min`
      : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.restSec ? `${exercise.restSec}s descanso` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "sin tiempos";
}

function getExerciseSourceId(exercise: ClassSessionSectionExercise) {
  return exercise.exerciseId ?? exercise.libraryExerciseId ?? undefined;
}

function getSectionError(error: unknown) {
  return error instanceof Error ? error.message : null;
}

function buildSectionOrder(sections: ClassSessionSection[]) {
  return sections.map((section, orderIndex) => ({
    sectionId: section.id,
    orderIndex,
  }));
}

function buildExerciseOrder(exercises: ClassSessionSectionExercise[]) {
  return exercises.map((exercise, orderIndex) => ({
    exerciseId: exercise.id,
    orderIndex,
  }));
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const current = nextItems[index];
  nextItems[index] = nextItems[nextIndex];
  nextItems[nextIndex] = current;

  return nextItems;
}

export function ClassSessionEditor({
  open,
  organizationId,
  session,
  isSaving,
  saveError,
  onOpenChange,
  onSaveClass,
}: {
  open: boolean;
  organizationId: string | null;
  session: ClassSession | null;
  isSaving: boolean;
  saveError?: Error | null;
  onOpenChange: (open: boolean) => void;
  onSaveClass: (
    classSessionId: string,
    input: UpdateClassSessionInput,
  ) => Promise<void>;
}) {
  const createSection = useCreateClassSessionSection(organizationId);
  const updateSection = useUpdateClassSessionSection(organizationId);
  const deleteSection = useDeleteClassSessionSection(organizationId);
  const reorderSections = useReorderClassSessionSections(organizationId);
  const addSectionExercise =
    useAddExerciseToClassSessionSection(organizationId);
  const updateSectionExercise =
    useUpdateClassSessionSectionExercise(organizationId);
  const deleteSectionExercise =
    useDeleteClassSessionSectionExercise(organizationId);
  const reorderSectionExercises =
    useReorderClassSessionSectionExercises(organizationId);

  const [classForm, setClassForm] = useState<ClassEditorForm>({
    title: "",
    startsAt: "",
    endsAt: "",
    targetDurationMinutes: "",
    status: "SCHEDULED",
    notes: "",
  });
  const [sectionDrafts, setSectionDrafts] = useState<
    Record<string, SectionDraft>
  >({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [addExerciseMode, setAddExerciseMode] =
    useState<AddExerciseMode>("library");
  const [editingExercise, setEditingExercise] = useState<{
    sectionId: string;
    exerciseId: string;
    draft: ExerciseDraft;
  } | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState(ALL_VALUE);
  const [libraryLevel, setLibraryLevel] = useState(ALL_VALUE);
  const [libraryIntensity, setLibraryIntensity] = useState(ALL_VALUE);
  const [librarySource, setLibrarySource] = useState(ALL_VALUE);
  const [areLibraryFiltersOpen, setAreLibraryFiltersOpen] = useState(false);
  const [manualExercise, setManualExercise] =
    useState<ManualExerciseForm>(emptyManualExercise);
  const [formError, setFormError] = useState<string | null>(null);

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
      ...(librarySource === GLOBAL_SOURCE_VALUE ? { isGlobal: true } : {}),
      ...(librarySource === LOCAL_SOURCE_VALUE ? { isGlobal: false } : {}),
    }),
    [
      libraryCategory,
      libraryIntensity,
      libraryLevel,
      librarySearch,
      librarySource,
    ],
  );
  const libraryQuery = useExercises(organizationId, libraryFilters);
  const sections = session?.sections ?? [];
  const selectedSection = sections.find(
    (section) => section.id === selectedSectionId,
  );
  const hasLibraryFilters =
    libraryCategory !== ALL_VALUE ||
    libraryLevel !== ALL_VALUE ||
    libraryIntensity !== ALL_VALUE ||
    librarySource !== ALL_VALUE;
  const isMutatingStructure =
    createSection.isPending ||
    updateSection.isPending ||
    deleteSection.isPending ||
    reorderSections.isPending ||
    addSectionExercise.isPending ||
    updateSectionExercise.isPending ||
    deleteSectionExercise.isPending ||
    reorderSectionExercises.isPending;
  const mutationError =
    createSection.error ??
    updateSection.error ??
    deleteSection.error ??
    reorderSections.error ??
    addSectionExercise.error ??
    updateSectionExercise.error ??
    deleteSectionExercise.error ??
    reorderSectionExercises.error;

  useEffect(() => {
    if (!session || !open) {
      return;
    }

    setClassForm({
      title: session.title,
      startsAt: toDateTimeInputValue(session.startsAt),
      endsAt: toDateTimeInputValue(session.endsAt),
      targetDurationMinutes: getTargetDuration(session)?.toString() ?? "",
      status: normalizeStatus(session.status),
      notes: session.notes ?? "",
    });
    setSectionDrafts(
      Object.fromEntries(
        (session.sections ?? []).map((section) => [
          section.id,
          sectionToDraft(section),
        ]),
      ),
    );
    setSelectedSectionId((currentSectionId) => {
      if (
        currentSectionId &&
        session.sections?.some((section) => section.id === currentSectionId)
      ) {
        return currentSectionId;
      }

      return session.sections?.[0]?.id ?? null;
    });
    setFormError(null);
  }, [open, session]);

  if (!session) {
    return null;
  }

  const saveClass = async () => {
    setFormError(null);

    if (!classForm.title.trim()) {
      setFormError("El titulo es obligatorio.");
      return;
    }

    const startsAt = classForm.startsAt
      ? toIsoDateTime(classForm.startsAt)
      : null;
    const endsAt = classForm.endsAt
      ? (toIsoDateTime(classForm.endsAt) ?? undefined)
      : classForm.startsAt
        ? addMinutesToIsoDateTime(
            classForm.startsAt,
            classForm.targetDurationMinutes,
          )
        : null;
    const targetDurationMinutes = positiveOptionalNumber(
      classForm.targetDurationMinutes,
    );

    if ((classForm.startsAt && !startsAt) || (classForm.endsAt && !endsAt)) {
      setFormError("Revisa las fechas de la clase.");
      return;
    }

    if (classForm.endsAt && !classForm.startsAt) {
      setFormError("Para indicar fin, selecciona tambien un inicio.");
      return;
    }

    const savePromise = onSaveClass(session.id, {
      title: classForm.title.trim(),
      startsAt,
      endsAt: endsAt ?? null,
      targetDurationMinutes,
      notes: classForm.notes.trim() || undefined,
      status: classForm.status,
    });

    toast.promise(savePromise, {
      loading: "guardando clase...",
      success: "clase guardada",
      error: "no se pudo guardar la clase",
    });

    try {
      await savePromise;
    } catch {
      // react-query keeps the mutation error for the inline state
    }
  };

  const handleCreateSection = async (name = "Nueva seccion") => {
    const createPromise = createSection.mutateAsync({
      classSessionId: session.id,
      input: {
        name,
        orderIndex: sections.length,
      },
    });

    toast.promise(createPromise, {
      loading: "creando seccion...",
      success: "seccion creada",
      error: "no se pudo crear la seccion",
    });

    try {
      const section = await createPromise;
      setSelectedSectionId(section.id);
    } catch {
      // handled by toast and inline mutation error
    }
  };

  const handleSaveSection = async (section: ClassSessionSection) => {
    const draft = sectionDrafts[section.id] ?? sectionToDraft(section);

    if (!draft.name.trim()) {
      setFormError("La seccion necesita nombre.");
      return;
    }

    const updatePromise = updateSection.mutateAsync({
      sectionId: section.id,
      input: {
        name: draft.name.trim(),
        goal: draft.goal.trim() || null,
        notes: draft.notes.trim() || null,
        durationMinutes: optionalNumber(draft.durationMinutes) ?? null,
      },
    });

    toast.promise(updatePromise, {
      loading: "guardando seccion...",
      success: "seccion guardada",
      error: "no se pudo guardar la seccion",
    });

    await updatePromise.catch(() => undefined);
  };

  const handleDeleteSection = async (sectionId: string) => {
    const deletePromise = deleteSection.mutateAsync(sectionId);

    toast.promise(deletePromise, {
      loading: "borrando seccion...",
      success: "seccion borrada",
      error: "no se pudo borrar la seccion",
    });

    await deletePromise.catch(() => undefined);
  };

  const handleMoveSection = async (sectionIndex: number, direction: -1 | 1) => {
    const nextSections = moveItem(sections, sectionIndex, direction);
    const reorderPromise = reorderSections.mutateAsync({
      classSessionId: session.id,
      input: { order: buildSectionOrder(nextSections) },
    });

    toast.promise(reorderPromise, {
      loading: "reordenando secciones...",
      success: "secciones reordenadas",
      error: "no se pudo reordenar",
    });

    await reorderPromise.catch(() => undefined);
  };

  const openLibraryForSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setManualExercise(emptyManualExercise);
    setAddExerciseMode("library");
    setIsLibraryOpen(true);
  };

  const handleAddLibraryExercise = async (exercise: Exercise) => {
    if (!selectedSectionId) {
      return;
    }

    const selected = sections.find(
      (section) => section.id === selectedSectionId,
    );
    const addPromise = addSectionExercise.mutateAsync({
      sectionId: selectedSectionId,
      input: {
        exerciseId: exercise.id,
        name: exercise.name,
        description: getExerciseDescription(exercise) || undefined,
        durationSec: exercise.averageDurationMinutes
          ? exercise.averageDurationMinutes * 60
          : undefined,
        notes: exercise.coachNotes ?? undefined,
        restSec: 0,
        orderIndex: selected?.exercises?.length ?? 0,
      },
    });

    toast.promise(addPromise, {
      loading: "anadiendo ejercicio...",
      success: "ejercicio anadido",
      error: "no se pudo anadir el ejercicio",
    });

    await addPromise.catch(() => undefined);
  };

  const handleManualAdd = async () => {
    if (!selectedSectionId) {
      return;
    }

    if (!manualExercise.name.trim()) {
      setFormError("El ejercicio manual necesita nombre.");
      return;
    }

    const selected = sections.find(
      (section) => section.id === selectedSectionId,
    );
    const addPromise = addSectionExercise.mutateAsync({
      sectionId: selectedSectionId,
      input: {
        name: manualExercise.name.trim(),
        description: manualExercise.description.trim() || undefined,
        durationSec: minutesToSeconds(manualExercise.durationMinutes),
        reps: optionalNumber(manualExercise.reps),
        restSec: optionalNumber(manualExercise.restSec),
        notes: manualExercise.notes.trim() || undefined,
        orderIndex: selected?.exercises?.length ?? 0,
      },
    });

    toast.promise(addPromise, {
      loading: "anadiendo ejercicio manual...",
      success: "ejercicio anadido",
      error: "no se pudo anadir el ejercicio",
    });

    try {
      await addPromise;
      setManualExercise(emptyManualExercise);
    } catch {
      // handled by toast and inline mutation error
    }
  };

  const handleSaveExercise = async () => {
    if (!editingExercise) {
      return;
    }

    if (!editingExercise.draft.name.trim()) {
      setFormError("El ejercicio necesita nombre.");
      return;
    }

    const updatePromise = updateSectionExercise.mutateAsync({
      exerciseId: editingExercise.exerciseId,
      input: {
        name: editingExercise.draft.name.trim(),
        description: editingExercise.draft.description.trim() || null,
        durationSec:
          minutesToSeconds(editingExercise.draft.durationMinutes) ?? null,
        reps: optionalNumber(editingExercise.draft.reps) ?? null,
        restSec: optionalNumber(editingExercise.draft.restSec) ?? null,
        notes: editingExercise.draft.notes.trim() || null,
      },
    });

    toast.promise(updatePromise, {
      loading: "guardando ejercicio...",
      success: "ejercicio guardado",
      error: "no se pudo guardar el ejercicio",
    });

    try {
      await updatePromise;
      setEditingExercise(null);
    } catch {
      // handled by toast and inline mutation error
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    const deletePromise = deleteSectionExercise.mutateAsync(exerciseId);

    toast.promise(deletePromise, {
      loading: "quitando ejercicio...",
      success: "ejercicio quitado",
      error: "no se pudo quitar el ejercicio",
    });

    await deletePromise.catch(() => undefined);
  };

  const handleMoveExercise = async (
    section: ClassSessionSection,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => {
    const exercises = section.exercises ?? [];
    const nextExercises = moveItem(exercises, exerciseIndex, direction);
    const reorderPromise = reorderSectionExercises.mutateAsync({
      sectionId: section.id,
      input: { order: buildExerciseOrder(nextExercises) },
    });

    toast.promise(reorderPromise, {
      loading: "reordenando ejercicios...",
      success: "ejercicios reordenados",
      error: "no se pudo reordenar",
    });

    await reorderPromise.catch(() => undefined);
  };

  const targetDurationMinutes = positiveOptionalNumber(
    classForm.targetDurationMinutes,
  );
  const estimatedDurationMinutes = getEstimatedDuration(session);
  const durationDeltaLabel = formatDurationDelta(
    targetDurationMinutes,
    estimatedDurationMinutes,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl xl:max-w-6xl lg:p-7">
          <DialogHeader>
            <DialogTitle>preparar clase</DialogTitle>
            <DialogDescription>
              crea secciones y anade ejercicios sin pasar por bloques ni clases
              tipo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:items-start">
            <section className="space-y-4 rounded-lg border border-border/80 bg-background/45 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {formatClassDate(session.startsAt)}
                </Badge>
                <Badge variant="secondary">
                  {normalizeStatus(session.status)}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editor-class-title">titulo</Label>
                  <Input
                    id="editor-class-title"
                    value={classForm.title}
                    onChange={(event) =>
                      setClassForm({ ...classForm, title: event.target.value })
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="editor-class-start">inicio opcional</Label>
                    <Input
                      id="editor-class-start"
                      type="datetime-local"
                      value={classForm.startsAt}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          startsAt: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editor-class-end">fin opcional</Label>
                    <Input
                      id="editor-class-end"
                      type="datetime-local"
                      value={classForm.endsAt}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          endsAt: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <Label htmlFor="editor-class-duration">
                      duracion objetivo min.
                    </Label>
                    <Input
                      id="editor-class-duration"
                      type="number"
                      min="1"
                      value={classForm.targetDurationMinutes}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          targetDurationMinutes: event.target.value,
                        })
                      }
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="grid gap-2 rounded-md border border-border/70 bg-muted/25 p-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <span>
                    objetivo:{" "}
                    {targetDurationMinutes !== undefined
                      ? `${targetDurationMinutes} min`
                      : "sin definir"}
                  </span>
                  <span>estimado actual: {estimatedDurationMinutes} min</span>
                  <span>diferencia: {durationDeltaLabel}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editor-class-status">estado</Label>
                  <Select
                    value={classForm.status}
                    onValueChange={(status) =>
                      setClassForm({
                        ...classForm,
                        status: status as ClassSessionStatusCode,
                      })
                    }
                  >
                    <SelectTrigger id="editor-class-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">programada</SelectItem>
                      <SelectItem value="COMPLETED">completada</SelectItem>
                      <SelectItem value="CANCELLED">cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editor-class-notes">notas</Label>
                  <Textarea
                    id="editor-class-notes"
                    rows={4}
                    value={classForm.notes}
                    onChange={(event) =>
                      setClassForm({ ...classForm, notes: event.target.value })
                    }
                  />
                </div>
              </div>

              {(formError || saveError || mutationError) && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError ??
                    saveError?.message ??
                    getSectionError(mutationError)}
                </p>
              )}

              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={isSaving}
                onClick={() => void saveClass()}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "guardando..." : "guardar clase"}
              </Button>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    secciones
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    cada seccion acepta cualquier ejercicio de la biblioteca.
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={isMutatingStructure}
                  onClick={() => void handleCreateSection()}
                >
                  <Plus className="h-4 w-4" />
                  anadir seccion
                </Button>
              </div>

              {sections.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-dashed border-border/70 bg-card/45 p-4">
                  <p className="text-sm text-muted-foreground">
                    crea una seccion personalizada o usa una de las habituales.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {defaultSectionNames.map((sectionName) => (
                      <Button
                        key={sectionName}
                        type="button"
                        variant="outline"
                        className="bg-transparent"
                        disabled={createSection.isPending}
                        onClick={() => void handleCreateSection(sectionName)}
                      >
                        <Plus className="h-4 w-4" />
                        {sectionName}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {sections.map((section, sectionIndex) => {
                  const draft =
                    sectionDrafts[section.id] ?? sectionToDraft(section);
                  const exercises = section.exercises ?? [];

                  return (
                    <article
                      key={section.id}
                      className="space-y-4 rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
                          {sectionIndex + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                            <div className="space-y-2">
                              <Label htmlFor={`section-name-${section.id}`}>
                                nombre
                              </Label>
                              <Input
                                id={`section-name-${section.id}`}
                                value={draft.name}
                                onChange={(event) =>
                                  setSectionDrafts((currentDrafts) => ({
                                    ...currentDrafts,
                                    [section.id]: {
                                      ...draft,
                                      name: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`section-duration-${section.id}`}>
                                duracion min.
                              </Label>
                              <Input
                                id={`section-duration-${section.id}`}
                                type="number"
                                min="0"
                                value={draft.durationMinutes}
                                onChange={(event) =>
                                  setSectionDrafts((currentDrafts) => ({
                                    ...currentDrafts,
                                    [section.id]: {
                                      ...draft,
                                      durationMinutes: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`section-goal-${section.id}`}>
                                objetivo
                              </Label>
                              <Input
                                id={`section-goal-${section.id}`}
                                value={draft.goal}
                                onChange={(event) =>
                                  setSectionDrafts((currentDrafts) => ({
                                    ...currentDrafts,
                                    [section.id]: {
                                      ...draft,
                                      goal: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`section-notes-${section.id}`}>
                                notas
                              </Label>
                              <Input
                                id={`section-notes-${section.id}`}
                                value={draft.notes}
                                onChange={(event) =>
                                  setSectionDrafts((currentDrafts) => ({
                                    ...currentDrafts,
                                    [section.id]: {
                                      ...draft,
                                      notes: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          disabled={
                            sectionIndex === 0 || reorderSections.isPending
                          }
                          onClick={() =>
                            void handleMoveSection(sectionIndex, -1)
                          }
                        >
                          <ArrowUp className="h-4 w-4" />
                          subir
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          disabled={
                            sectionIndex === sections.length - 1 ||
                            reorderSections.isPending
                          }
                          onClick={() =>
                            void handleMoveSection(sectionIndex, 1)
                          }
                        >
                          <ArrowDown className="h-4 w-4" />
                          bajar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          disabled={updateSection.isPending}
                          onClick={() => void handleSaveSection(section)}
                        >
                          <Save className="h-4 w-4" />
                          guardar seccion
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 sm:flex-none"
                          onClick={() => openLibraryForSection(section.id)}
                        >
                          <Plus className="h-4 w-4" />
                          anadir ejercicio
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent text-destructive hover:text-destructive"
                          disabled={deleteSection.isPending}
                          onClick={() => void handleDeleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          borrar
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {exercises.map((exercise, exerciseIndex) => (
                          <div
                            key={exercise.id}
                            className="rounded-md border border-border/70 bg-background/45 p-3"
                          >
                            <div className="flex items-start gap-3">
                              <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-medium text-foreground">
                                    {exercise.name}
                                  </h4>
                                  {getExerciseSourceId(exercise) ? (
                                    <Badge variant="outline">
                                      <Library className="h-3 w-3" />
                                      biblioteca
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">manual</Badge>
                                  )}
                                </div>
                                {exercise.description ? (
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {exercise.description}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {summarizeExercise(exercise)}
                                  </span>
                                  {exercise.notes ? (
                                    <span className="flex items-center gap-1">
                                      <FileText className="h-3.5 w-3.5" />
                                      {exercise.notes}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 sm:grid-cols-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent"
                                disabled={
                                  exerciseIndex === 0 ||
                                  reorderSectionExercises.isPending
                                }
                                onClick={() =>
                                  void handleMoveExercise(
                                    section,
                                    exerciseIndex,
                                    -1,
                                  )
                                }
                              >
                                <ArrowUp className="h-4 w-4" />
                                subir
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent"
                                disabled={
                                  exerciseIndex === exercises.length - 1 ||
                                  reorderSectionExercises.isPending
                                }
                                onClick={() =>
                                  void handleMoveExercise(
                                    section,
                                    exerciseIndex,
                                    1,
                                  )
                                }
                              >
                                <ArrowDown className="h-4 w-4" />
                                bajar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent"
                                onClick={() =>
                                  setEditingExercise({
                                    sectionId: section.id,
                                    exerciseId: exercise.id,
                                    draft: exerciseToDraft(exercise),
                                  })
                                }
                              >
                                <Pencil className="h-4 w-4" />
                                editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="bg-transparent text-destructive hover:text-destructive"
                                disabled={deleteSectionExercise.isPending}
                                onClick={() =>
                                  void handleDeleteExercise(exercise.id)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                                quitar
                              </Button>
                            </div>
                          </div>
                        ))}

                        {exercises.length === 0 ? (
                          <div className="rounded-md border border-dashed border-border/70 bg-background/30 px-3 py-4 text-sm text-muted-foreground">
                            sin ejercicios todavia
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="grid-rows-[auto_auto_minmax(0,1fr)] gap-4 !overflow-hidden sm:!max-h-[90vh] sm:!w-[95vw] sm:!max-w-[95vw] lg:!max-w-7xl lg:p-7">
          <DialogHeader>
            <DialogTitle>anadir ejercicio</DialogTitle>
            <DialogDescription>
              {selectedSection
                ? `se anadira a ${selectedSection.name}`
                : "selecciona una seccion"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 rounded-md bg-muted p-1 md:hidden">
            <Button
              type="button"
              size="sm"
              variant={addExerciseMode === "library" ? "default" : "ghost"}
              className="h-9"
              onClick={() => setAddExerciseMode("library")}
            >
              Biblioteca
            </Button>
            <Button
              type="button"
              size="sm"
              variant={addExerciseMode === "manual" ? "default" : "ghost"}
              className="h-9"
              onClick={() => setAddExerciseMode("manual")}
            >
              Manual
            </Button>
          </div>

          <div className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pr-1">
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <section
              className={cn(
                "min-w-0 space-y-4 overflow-x-hidden",
                addExerciseMode === "library" ? "block" : "hidden md:block",
              )}
            >
              <div className="space-y-3 rounded-md border border-border/70 bg-background/45 p-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    placeholder="buscar ejercicios"
                    className="h-12 pl-11 text-base"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 md:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() =>
                      setAreLibraryFiltersOpen((currentValue) => !currentValue)
                    }
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    filtros
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={!hasLibraryFilters && !librarySearch.trim()}
                    onClick={() => {
                      setLibrarySearch("");
                      setLibraryCategory(ALL_VALUE);
                      setLibraryLevel(ALL_VALUE);
                      setLibraryIntensity(ALL_VALUE);
                      setLibrarySource(ALL_VALUE);
                    }}
                  >
                    <ListRestart className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  className={cn(
                    "grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap",
                    areLibraryFiltersOpen ? "grid" : "hidden",
                  )}
                >
                  <Select
                    value={libraryCategory}
                    onValueChange={setLibraryCategory}
                  >
                    <SelectTrigger className="h-11 min-w-0 lg:w-[160px]">
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
                    <SelectTrigger className="h-11 min-w-0 lg:w-[150px]">
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

                  <Select
                    value={libraryIntensity}
                    onValueChange={setLibraryIntensity}
                  >
                    <SelectTrigger className="h-11 min-w-0 lg:w-[150px]">
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

                  <Select
                    value={librarySource}
                    onValueChange={setLibrarySource}
                  >
                    <SelectTrigger className="h-11 min-w-0 lg:w-[150px]">
                      <SelectValue placeholder="origen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_VALUE}>todos</SelectItem>
                      <SelectItem value={GLOBAL_SOURCE_VALUE}>
                        BoxPlanner
                      </SelectItem>
                      <SelectItem value={LOCAL_SOURCE_VALUE}>
                        Mi gimnasio
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden items-center justify-between gap-3 md:flex">
                  <p className="text-sm text-muted-foreground">
                    {(libraryQuery.data ?? []).length} ejercicios disponibles
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={!hasLibraryFilters && !librarySearch.trim()}
                    onClick={() => {
                      setLibrarySearch("");
                      setLibraryCategory(ALL_VALUE);
                      setLibraryLevel(ALL_VALUE);
                      setLibraryIntensity(ALL_VALUE);
                      setLibrarySource(ALL_VALUE);
                    }}
                  >
                    <ListRestart className="h-4 w-4" />
                    limpiar
                  </Button>
                </div>
              </div>

              {libraryQuery.isLoading ? (
                <LoadingState
                  title="cargando biblioteca"
                  description="buscando ejercicios para esta clase."
                  className="min-h-[220px]"
                />
              ) : null}

              {libraryQuery.error ? (
                <ErrorState
                  title="no pudimos cargar ejercicios"
                  description={libraryQuery.error.message}
                  actionLabel="reintentar"
                  onAction={() => void libraryQuery.refetch()}
                  className="min-h-[220px]"
                />
              ) : null}

              {!libraryQuery.isLoading && !libraryQuery.error ? (
                <div className="grid min-w-0 gap-3 sm:grid-cols-1 xl:grid-cols-2">
                  {(libraryQuery.data ?? []).map((exercise) => (
                    <div
                      key={exercise.id}
                      className="grid min-w-0 gap-4 rounded-md border border-border/80 bg-card/60 p-4 shadow-sm"
                    >
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {getOptionLabel(categoryOptions, exercise.category)}
                          </Badge>
                          <Badge variant="outline">
                            {getOptionLabel(
                              intensityOptions,
                              exercise.intensity,
                            )}
                          </Badge>
                          <Badge variant="secondary">
                            {getExerciseSourceLabel(exercise)}
                          </Badge>
                        </div>

                        <div className="min-w-0">
                          <h4 className="truncate text-base font-semibold text-foreground">
                            {exercise.name}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                            {getExerciseDescription(exercise) ||
                              "sin descripcion"}
                          </p>
                        </div>

                        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3.5 w-3.5" />
                            {getOptionLabel(levelOptions, exercise.level)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {exercise.averageDurationMinutes
                              ? `${exercise.averageDurationMinutes} min`
                              : "sin duracion"}
                          </span>
                        </div>
                      </div>

                      <div className="flex min-w-0 justify-end">
                        <Button
                          type="button"
                          className="w-full justify-center sm:w-auto"
                          disabled={
                            !selectedSectionId || addSectionExercise.isPending
                          }
                          onClick={() =>
                            void handleAddLibraryExercise(exercise)
                          }
                        >
                          <Plus className="h-4 w-4" />
                          anadir
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(libraryQuery.data ?? []).length === 0 ? (
                    <EmptyState
                      title="sin resultados"
                      description="prueba otra busqueda o crea uno manual rapido."
                      className="min-h-[220px] xl:col-span-2"
                    />
                  ) : null}
                </div>
              ) : null}
            </section>

            <section
              className={cn(
                "min-w-0 self-start rounded-md border border-border/80 bg-background/45 p-4",
                addExerciseMode === "manual" ? "block" : "hidden md:block",
              )}
            >
              <div className="flex min-h-full flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    ejercicio manual rapido
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    para anadir algo puntual sin guardarlo en biblioteca.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="manual-exercise-name">nombre</Label>
                    <Input
                      id="manual-exercise-name"
                      className="h-11"
                      value={manualExercise.name}
                      onChange={(event) =>
                        setManualExercise({
                          ...manualExercise,
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-exercise-description">
                      descripcion corta
                    </Label>
                    <Textarea
                      id="manual-exercise-description"
                      rows={3}
                      value={manualExercise.description}
                      onChange={(event) =>
                        setManualExercise({
                          ...manualExercise,
                          description: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="manual-exercise-duration">min.</Label>
                      <Input
                        id="manual-exercise-duration"
                        className="h-11"
                        type="number"
                        min="0"
                        value={manualExercise.durationMinutes}
                        onChange={(event) =>
                          setManualExercise({
                            ...manualExercise,
                            durationMinutes: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-exercise-reps">reps</Label>
                      <Input
                        id="manual-exercise-reps"
                        className="h-11"
                        type="number"
                        min="0"
                        value={manualExercise.reps}
                        onChange={(event) =>
                          setManualExercise({
                            ...manualExercise,
                            reps: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-exercise-rest">descanso s.</Label>
                      <Input
                        id="manual-exercise-rest"
                        className="h-11"
                        type="number"
                        min="0"
                        value={manualExercise.restSec}
                        onChange={(event) =>
                          setManualExercise({
                            ...manualExercise,
                            restSec: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-exercise-notes">notas</Label>
                    <Textarea
                      id="manual-exercise-notes"
                      rows={3}
                      value={manualExercise.notes}
                      onChange={(event) =>
                        setManualExercise({
                          ...manualExercise,
                          notes: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="mt-auto w-full"
                  disabled={!selectedSectionId || addSectionExercise.isPending}
                  onClick={() => void handleManualAdd()}
                >
                  <Plus className="h-4 w-4" />
                  anadir manual
                </Button>
              </div>
            </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingExercise)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingExercise(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl lg:p-7">
          <DialogHeader>
            <DialogTitle>editar ejercicio</DialogTitle>
            <DialogDescription>
              ajusta tiempos y notas solo dentro de esta clase.
            </DialogDescription>
          </DialogHeader>

          {editingExercise ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-plan-exercise-name">nombre</Label>
                <Input
                  id="edit-plan-exercise-name"
                  value={editingExercise.draft.name}
                  onChange={(event) =>
                    setEditingExercise({
                      ...editingExercise,
                      draft: {
                        ...editingExercise.draft,
                        name: event.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan-exercise-description">
                  descripcion
                </Label>
                <Textarea
                  id="edit-plan-exercise-description"
                  rows={4}
                  value={editingExercise.draft.description}
                  onChange={(event) =>
                    setEditingExercise({
                      ...editingExercise,
                      draft: {
                        ...editingExercise.draft,
                        description: event.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-exercise-duration">min.</Label>
                  <Input
                    id="edit-plan-exercise-duration"
                    type="number"
                    min="0"
                    value={editingExercise.draft.durationMinutes}
                    onChange={(event) =>
                      setEditingExercise({
                        ...editingExercise,
                        draft: {
                          ...editingExercise.draft,
                          durationMinutes: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-exercise-reps">reps</Label>
                  <Input
                    id="edit-plan-exercise-reps"
                    type="number"
                    min="0"
                    value={editingExercise.draft.reps}
                    onChange={(event) =>
                      setEditingExercise({
                        ...editingExercise,
                        draft: {
                          ...editingExercise.draft,
                          reps: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-plan-exercise-rest">descanso s.</Label>
                  <Input
                    id="edit-plan-exercise-rest"
                    type="number"
                    min="0"
                    value={editingExercise.draft.restSec}
                    onChange={(event) =>
                      setEditingExercise({
                        ...editingExercise,
                        draft: {
                          ...editingExercise.draft,
                          restSec: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan-exercise-notes">notas</Label>
                <Textarea
                  id="edit-plan-exercise-notes"
                  rows={4}
                  value={editingExercise.draft.notes}
                  onChange={(event) =>
                    setEditingExercise({
                      ...editingExercise,
                      draft: {
                        ...editingExercise.draft,
                        notes: event.target.value,
                      },
                    })
                  }
                />
              </div>
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={updateSectionExercise.isPending}
                onClick={() => void handleSaveExercise()}
              >
                guardar ejercicio
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
