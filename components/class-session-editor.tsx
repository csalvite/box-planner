"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  FileText,
  Library,
  ListRestart,
  Loader2,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useExercises } from "@/hooks/use-exercises";
import type {
  ClassSession,
  ClassSessionFullPlanInput,
  ClassSessionSection,
  ClassSessionSectionExercise,
  ClassSessionStatusCode,
} from "@/lib/api/class-sessions";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseFilters,
  ExerciseIntensity,
  ExerciseLevel,
} from "@/lib/api/exercises";
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

interface EditableExercise {
  id: string;
  exerciseId?: string | null;
  libraryExerciseId?: string | null;
  libraryExercise?: Exercise | null;
  name: string;
  description: string;
  durationSec: number | null;
  reps: number | null;
  restSec: number | null;
  notes: string;
  orderIndex: number;
}

interface EditableSection {
  id: string;
  name: string;
  objective: string;
  estimatedDurationMinutes: number | null;
  notes: string;
  orderIndex: number;
  exercises: EditableExercise[];
}

interface EditablePlan {
  title: string;
  startsAt: string;
  endsAt: string;
  targetDurationMinutes: string;
  status: ClassSessionStatusCode;
  notes: string;
  sections: EditableSection[];
}

interface ManualExerciseForm {
  name: string;
  description: string;
  durationMinutes: string;
  reps: string;
  restSec: string;
  notes: string;
}

const emptyManualExercise: ManualExerciseForm = {
  name: "",
  description: "",
  durationMinutes: "",
  reps: "",
  restSec: "",
  notes: "",
};

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isTempId(id: string) {
  return id.startsWith("tmp-");
}

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

function minutesToSeconds(value: string) {
  const minutes = optionalNumber(value);

  return minutes === undefined ? null : minutes * 60;
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

function getTargetDuration(session: ClassSession) {
  return session.targetDurationMinutes ?? session.durationMinutes ?? null;
}

function getSectionObjective(section: ClassSessionSection) {
  return section.objective ?? section.goal ?? "";
}

function getSectionTargetMinutes(section: ClassSessionSection) {
  return (
    section.estimatedDurationMinutes ??
    section.durationMinutes ??
    (section.durationSec ? Math.round(section.durationSec / 60) : null)
  );
}

function getExerciseSourceId(exercise: EditableExercise) {
  return (
    exercise.exerciseId ??
    exercise.libraryExerciseId ??
    exercise.libraryExercise?.id ??
    undefined
  );
}

function getSectionExerciseTotalMinutes(section: EditableSection) {
  const totalSec = section.exercises.reduce(
    (total, exercise) => total + (exercise.durationSec ?? 0),
    0,
  );

  return Math.round(totalSec / 60);
}

function getClassExerciseTotalMinutes(sections: EditableSection[]) {
  return sections.reduce(
    (total, section) => total + getSectionExerciseTotalMinutes(section),
    0,
  );
}

function formatDurationDelta(target?: number | null, estimated?: number) {
  if (target === undefined || target === null) {
    return "sin objetivo";
  }

  const delta = target - (estimated ?? 0);

  if (delta > 0) {
    return `faltan ${delta} min`;
  }

  if (delta < 0) {
    return `sobran ${Math.abs(delta)} min`;
  }

  return "encaja";
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

function reindexSections(sections: EditableSection[]) {
  return sections.map((section, orderIndex) => ({
    ...section,
    orderIndex,
  }));
}

function reindexExercises(exercises: EditableExercise[]) {
  return exercises.map((exercise, orderIndex) => ({
    ...exercise,
    orderIndex,
  }));
}

function createEditableExercise(
  exercise: ClassSessionSectionExercise,
): EditableExercise {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId ?? null,
    libraryExerciseId: exercise.libraryExerciseId ?? null,
    libraryExercise: exercise.libraryExercise ?? null,
    name: exercise.name,
    description: exercise.description ?? "",
    durationSec: exercise.durationSec ?? null,
    reps: exercise.reps ?? null,
    restSec: exercise.restSec ?? null,
    notes: exercise.notes ?? "",
    orderIndex: exercise.orderIndex,
  };
}

function createEditableSection(section: ClassSessionSection): EditableSection {
  return {
    id: section.id,
    name: section.name,
    objective: getSectionObjective(section),
    estimatedDurationMinutes: getSectionTargetMinutes(section),
    notes: section.notes ?? "",
    orderIndex: section.orderIndex,
    exercises: reindexExercises(
      (section.exercises ?? []).map(createEditableExercise),
    ),
  };
}

function createEditablePlan(session: ClassSession): EditablePlan {
  return {
    title: session.title,
    startsAt: toDateTimeInputValue(session.startsAt),
    endsAt: toDateTimeInputValue(session.endsAt),
    targetDurationMinutes: getTargetDuration(session)?.toString() ?? "",
    status: normalizeStatus(session.status),
    notes: session.notes ?? "",
    sections: reindexSections(
      [...(session.sections ?? [])]
        .sort((first, second) => first.orderIndex - second.orderIndex)
        .map(createEditableSection),
    ),
  };
}

function buildFullPlanInput(plan: EditablePlan): ClassSessionFullPlanInput {
  const startsAt = plan.startsAt ? toIsoDateTime(plan.startsAt) : null;
  const endsAt = plan.endsAt ? toIsoDateTime(plan.endsAt) : null;

  return {
    title: plan.title.trim(),
    startsAt,
    endsAt,
    targetDurationMinutes:
      positiveOptionalNumber(plan.targetDurationMinutes) ?? null,
    notes: plan.notes.trim() || null,
    status: plan.status,
    sections: reindexSections(plan.sections).map((section) => ({
      ...(isTempId(section.id) ? {} : { id: section.id }),
      name: section.name.trim(),
      objective: section.objective.trim() || null,
      estimatedDurationMinutes: section.estimatedDurationMinutes,
      notes: section.notes.trim() || null,
      orderIndex: section.orderIndex,
      exercises: reindexExercises(section.exercises).map((exercise) => ({
        ...(isTempId(exercise.id) ? {} : { id: exercise.id }),
        exerciseId: getExerciseSourceId(exercise) ?? null,
        name: exercise.name.trim(),
        description: exercise.description.trim() || null,
        durationSec: exercise.durationSec,
        reps: exercise.reps,
        restSec: exercise.restSec,
        notes: exercise.notes.trim() || null,
        orderIndex: exercise.orderIndex,
      })),
    })),
  };
}

function serializePlan(plan: EditablePlan) {
  return JSON.stringify(buildFullPlanInput(plan));
}

function isLibraryExerciseAddedToSection(
  section: EditableSection | undefined,
  exercise: Exercise,
) {
  if (!section) {
    return false;
  }

  return section.exercises.some(
    (sectionExercise) => getExerciseSourceId(sectionExercise) === exercise.id,
  );
}

export function ClassSessionEditor({
  open,
  organizationId,
  session,
  isSaving,
  saveError,
  onOpenChange,
  onSaveFullPlan,
}: {
  open: boolean;
  organizationId: string | null;
  session: ClassSession | null;
  isSaving: boolean;
  saveError?: Error | null;
  onOpenChange: (open: boolean) => void;
  onSaveFullPlan: (
    classSessionId: string,
    input: ClassSessionFullPlanInput,
  ) => Promise<ClassSession>;
}) {
  const [plan, setPlan] = useState<EditablePlan | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [addExerciseMode, setAddExerciseMode] =
    useState<AddExerciseMode>("library");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState(ALL_VALUE);
  const [libraryLevel, setLibraryLevel] = useState(ALL_VALUE);
  const [libraryIntensity, setLibraryIntensity] = useState(ALL_VALUE);
  const [librarySource, setLibrarySource] = useState(ALL_VALUE);
  const [areLibraryFiltersOpen, setAreLibraryFiltersOpen] = useState(false);
  const [manualExercise, setManualExercise] =
    useState<ManualExerciseForm>(emptyManualExercise);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

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
  const sections = plan?.sections ?? [];
  const selectedSection = sections.find(
    (section) => section.id === selectedSectionId,
  );
  const hasLibraryFilters =
    libraryCategory !== ALL_VALUE ||
    libraryLevel !== ALL_VALUE ||
    libraryIntensity !== ALL_VALUE ||
    librarySource !== ALL_VALUE;
  const currentSnapshot = plan ? serializePlan(plan) : "";
  const isDirty = Boolean(plan && currentSnapshot !== savedSnapshot);
  const targetDurationMinutes = plan
    ? positiveOptionalNumber(plan.targetDurationMinutes)
    : undefined;
  const estimatedDurationMinutes = plan
    ? getClassExerciseTotalMinutes(plan.sections)
    : 0;

  useEffect(() => {
    if (!session || !open) {
      return;
    }

    const nextPlan = createEditablePlan(session);
    setPlan(nextPlan);
    setSavedSnapshot(serializePlan(nextPlan));
    setExpandedSectionIds(new Set(nextPlan.sections.map((section) => section.id)));
    setSelectedSectionId(nextPlan.sections[0]?.id ?? null);
    setManualExercise(emptyManualExercise);
    setFormError(null);
  }, [open, session]);

  if (!session || !plan) {
    return null;
  }

  const updatePlan = (updater: (current: EditablePlan) => EditablePlan) => {
    setPlan((current) => (current ? updater(current) : current));
  };

  const requestClose = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (isDirty) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    onOpenChange(false);
  };

  const savePlan = async () => {
    setFormError(null);

    if (!plan.title.trim()) {
      setFormError("El titulo es obligatorio.");
      return;
    }

    const invalidSection = plan.sections.find((section) => !section.name.trim());

    if (invalidSection) {
      setFormError("Todas las secciones necesitan nombre.");
      setExpandedSectionIds((current) => new Set([...current, invalidSection.id]));
      return;
    }

    if (plan.startsAt && !toIsoDateTime(plan.startsAt)) {
      setFormError("Revisa la fecha de inicio.");
      return;
    }

    if (plan.endsAt && !toIsoDateTime(plan.endsAt)) {
      setFormError("Revisa la fecha de fin.");
      return;
    }

    const input = buildFullPlanInput(plan);
    const savePromise = onSaveFullPlan(session.id, input);

    toast.promise(savePromise, {
      loading: "guardando cambios...",
      success: "clase actualizada",
      error: "no se pudo actualizar la clase",
    });

    try {
      const savedSession = await savePromise;
      const nextPlan = createEditablePlan(savedSession);
      setPlan(nextPlan);
      setSavedSnapshot(serializePlan(nextPlan));
      setExpandedSectionIds(
        (current) =>
          new Set(
            nextPlan.sections
              .filter((section) => current.has(section.id))
              .map((section) => section.id),
          ),
      );
    } catch {
      // react-query keeps the mutation error for the inline state
    }
  };

  const addSection = (name = "Nueva seccion") => {
    const section: EditableSection = {
      id: createTempId("tmp-section"),
      name,
      objective: "",
      estimatedDurationMinutes: null,
      notes: "",
      orderIndex: sections.length,
      exercises: [],
    };

    updatePlan((current) => ({
      ...current,
      sections: reindexSections([...current.sections, section]),
    }));
    setExpandedSectionIds((current) => new Set([...current, section.id]));
    setSelectedSectionId(section.id);
  };

  const updateSection = (
    sectionId: string,
    patch: Partial<Omit<EditableSection, "id" | "exercises">>,
  ) => {
    updatePlan((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    updatePlan((current) => ({
      ...current,
      sections: reindexSections(
        current.sections.filter((section) => section.id !== sectionId),
      ),
    }));
    setExpandedSectionIds((current) => {
      const next = new Set(current);
      next.delete(sectionId);
      return next;
    });
    setSelectedSectionId((current) => (current === sectionId ? null : current));
  };

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    updatePlan((current) => ({
      ...current,
      sections: reindexSections(moveItem(current.sections, sectionIndex, direction)),
    }));
  };

  const updateExercise = (
    sectionId: string,
    exerciseId: string,
    patch: Partial<EditableExercise>,
  ) => {
    updatePlan((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              exercises: section.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, ...patch } : exercise,
              ),
            }
          : section,
      ),
    }));
  };

  const deleteExercise = (sectionId: string, exerciseId: string) => {
    updatePlan((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              exercises: reindexExercises(
                section.exercises.filter((exercise) => exercise.id !== exerciseId),
              ),
            }
          : section,
      ),
    }));
  };

  const moveExercise = (
    sectionId: string,
    exerciseIndex: number,
    direction: -1 | 1,
  ) => {
    updatePlan((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              exercises: reindexExercises(
                moveItem(section.exercises, exerciseIndex, direction),
              ),
            }
          : section,
      ),
    }));
  };

  const openLibraryForSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setManualExercise(emptyManualExercise);
    setAddExerciseMode("library");
    setIsLibraryOpen(true);
  };

  const addLibraryExercise = (exercise: Exercise) => {
    if (!selectedSectionId || isLibraryExerciseAddedToSection(selectedSection, exercise)) {
      return;
    }

    const newExercise: EditableExercise = {
      id: createTempId("tmp-exercise"),
      exerciseId: exercise.id,
      libraryExerciseId: exercise.id,
      libraryExercise: exercise,
      name: exercise.name,
      description: getExerciseDescription(exercise),
      durationSec: exercise.averageDurationMinutes
        ? exercise.averageDurationMinutes * 60
        : null,
      reps: null,
      restSec: 0,
      notes: exercise.coachNotes ?? "",
      orderIndex: selectedSection?.exercises.length ?? 0,
    };

    updatePlan((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              exercises: reindexExercises([...section.exercises, newExercise]),
            }
          : section,
      ),
    }));
  };

  const addManualExercise = () => {
    if (!selectedSectionId) {
      return;
    }

    if (!manualExercise.name.trim()) {
      setFormError("El ejercicio manual necesita nombre.");
      return;
    }

    const newExercise: EditableExercise = {
      id: createTempId("tmp-exercise"),
      exerciseId: null,
      libraryExerciseId: null,
      libraryExercise: null,
      name: manualExercise.name.trim(),
      description: manualExercise.description.trim(),
      durationSec: minutesToSeconds(manualExercise.durationMinutes),
      reps: optionalNumber(manualExercise.reps) ?? null,
      restSec: optionalNumber(manualExercise.restSec) ?? null,
      notes: manualExercise.notes.trim(),
      orderIndex: selectedSection?.exercises.length ?? 0,
    };

    updatePlan((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === selectedSectionId
          ? {
              ...section,
              exercises: reindexExercises([...section.exercises, newExercise]),
            }
          : section,
      ),
    }));
    setManualExercise(emptyManualExercise);
    setAddExerciseMode("library");
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSectionIds(new Set(sections.map((section) => section.id)));
  };

  const collapseAll = () => {
    setExpandedSectionIds(new Set());
  };

  const saveState = saveError
    ? "error"
    : isSaving
      ? "saving"
      : isDirty
        ? "dirty"
        : "saved";
  const saveStateConfig = {
    dirty: {
      icon: AlertCircle,
      label: "Cambios sin guardar",
      description: "hay cambios locales pendientes de guardar",
      className:
        "border-amber-500/40 bg-amber-500/10 text-amber-200 ring-amber-500/20",
    },
    saving: {
      icon: Loader2,
      label: "Guardando...",
      description: "guardando cambios en la clase",
      className:
        "border-primary/40 bg-primary/10 text-primary ring-primary/20",
    },
    saved: {
      icon: CheckCircle2,
      label: "Guardado",
      description: "todo esta guardado",
      className:
        "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 ring-emerald-500/20",
    },
    error: {
      icon: AlertCircle,
      label: "Error al guardar",
      description: "no pudimos guardar los ultimos cambios",
      className:
        "border-destructive/45 bg-destructive/10 text-destructive ring-destructive/20",
    },
  }[saveState];
  const SaveStateIcon = saveStateConfig.icon;

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)] gap-4 sm:!max-h-[92vh] sm:!w-[95vw] sm:!max-w-[95vw] xl:!max-w-7xl lg:p-7">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>preparar clase</DialogTitle>
                <DialogDescription>
                  edita la clase completa y guarda todo en un unico cambio.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ring-1",
                    saveStateConfig.className,
                  )}
                >
                  <SaveStateIcon
                    className={cn(
                      "h-3.5 w-3.5",
                      saveState === "saving" && "animate-spin",
                    )}
                  />
                  {saveStateConfig.label}
                </span>
                <Badge variant="outline">{sections.length} secciones</Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 space-y-5 overflow-y-auto overflow-x-hidden pr-1">
            <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
              <div className="space-y-4 rounded-md border border-border/80 bg-background/45 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="editor-class-title">titulo</Label>
                    <Input
                      id="editor-class-title"
                      value={plan.title}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editor-class-start">inicio</Label>
                    <Input
                      id="editor-class-start"
                      type="datetime-local"
                      value={plan.startsAt}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          startsAt: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editor-class-end">fin</Label>
                    <Input
                      id="editor-class-end"
                      type="datetime-local"
                      value={plan.endsAt}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          endsAt: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editor-class-duration">
                      duracion objetivo min.
                    </Label>
                    <Input
                      id="editor-class-duration"
                      type="number"
                      min="1"
                      value={plan.targetDurationMinutes}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          targetDurationMinutes: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editor-class-status">estado</Label>
                    <Select
                      value={plan.status}
                      onValueChange={(status) =>
                        updatePlan((current) => ({
                          ...current,
                          status: status as ClassSessionStatusCode,
                        }))
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

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="editor-class-notes">notas</Label>
                    <Textarea
                      id="editor-class-notes"
                      rows={3}
                      value={plan.notes}
                      onChange={(event) =>
                        updatePlan((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
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
                  <span>
                    diferencia:{" "}
                    {formatDurationDelta(
                      targetDurationMinutes,
                      estimatedDurationMinutes,
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border/80 bg-background/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      secciones
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      plegables y editables hasta guardar cambios.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={collapseAll}
                    >
                      plegar todas
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={expandAll}
                    >
                      desplegar todas
                    </Button>
                  </div>
                </div>

                {sections.length === 0 ? (
                  <div className="space-y-3 rounded-md border border-dashed border-border/70 bg-card/45 p-4">
                    <p className="text-sm text-muted-foreground">
                      crea una seccion personalizada o usa una habitual.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {defaultSectionNames.map((sectionName) => (
                        <Button
                          key={sectionName}
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => addSection(sectionName)}
                        >
                          <Plus className="h-4 w-4" />
                          {sectionName}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => addSection()}
                >
                  <Plus className="h-4 w-4" />
                  anadir seccion
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              {sections.map((section, sectionIndex) => {
                const isExpanded = expandedSectionIds.has(section.id);
                const exerciseMinutes = getSectionExerciseTotalMinutes(section);

                return (
                  <article
                    key={section.id}
                    className="rounded-md border border-border/80 bg-card/60 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        onClick={() => toggleSection(section.id)}
                      >
                        <span className="mt-1 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <span className="min-w-0 space-y-2">
                          <span className="block truncate font-semibold text-foreground">
                            {sectionIndex + 1}. {section.name || "Sin nombre"}
                          </span>
                          <span className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">
                              {section.estimatedDurationMinutes ?? "-"} min objetivo
                            </Badge>
                            <Badge variant="outline">
                              {section.exercises.length} ejercicios
                            </Badge>
                            <Badge variant="outline">
                              {exerciseMinutes} min ejercicios
                            </Badge>
                            {section.objective ? (
                              <Badge variant="secondary">
                                {section.objective}
                              </Badge>
                            ) : null}
                            <Badge variant="outline">
                              {formatDurationDelta(
                                section.estimatedDurationMinutes,
                                exerciseMinutes,
                              )}
                            </Badge>
                          </span>
                        </span>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          disabled={sectionIndex === 0}
                          onClick={() => moveSection(sectionIndex, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent"
                          disabled={sectionIndex === sections.length - 1}
                          onClick={() => moveSection(sectionIndex, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent text-destructive hover:text-destructive"
                          onClick={() => deleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                          <div className="space-y-2">
                            <Label htmlFor={`section-name-${section.id}`}>
                              nombre
                            </Label>
                            <Input
                              id={`section-name-${section.id}`}
                              value={section.name}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  name: event.target.value,
                                })
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
                              value={section.estimatedDurationMinutes ?? ""}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  estimatedDurationMinutes:
                                    optionalNumber(event.target.value) ?? null,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`section-objective-${section.id}`}>
                              objetivo
                            </Label>
                            <Input
                              id={`section-objective-${section.id}`}
                              value={section.objective}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  objective: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`section-notes-${section.id}`}>
                              notas
                            </Label>
                            <Input
                              id={`section-notes-${section.id}`}
                              value={section.notes}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  notes: event.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => openLibraryForSection(section.id)}
                          >
                            <Plus className="h-4 w-4" />
                            anadir ejercicio
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {section.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exercise.id}
                              className="rounded-md border border-border/70 bg-background/45 p-3"
                            >
                              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_100px_110px]">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {getExerciseSourceId(exercise) ? (
                                      <Badge variant="outline">
                                        <Library className="h-3 w-3" />
                                        biblioteca
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">manual</Badge>
                                    )}
                                  </div>
                                  <Input
                                    value={exercise.name}
                                    onChange={(event) =>
                                      updateExercise(section.id, exercise.id, {
                                        name: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>min.</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={secondsToMinutes(exercise.durationSec)}
                                    onChange={(event) =>
                                      updateExercise(section.id, exercise.id, {
                                        durationSec: minutesToSeconds(
                                          event.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>reps</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={exercise.reps ?? ""}
                                    onChange={(event) =>
                                      updateExercise(section.id, exercise.id, {
                                        reps:
                                          optionalNumber(event.target.value) ??
                                          null,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>descanso s.</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={exercise.restSec ?? ""}
                                    onChange={(event) =>
                                      updateExercise(section.id, exercise.id, {
                                        restSec:
                                          optionalNumber(event.target.value) ??
                                          null,
                                      })
                                    }
                                  />
                                </div>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <Textarea
                                  rows={2}
                                  value={exercise.description}
                                  placeholder="descripcion"
                                  onChange={(event) =>
                                    updateExercise(section.id, exercise.id, {
                                      description: event.target.value,
                                    })
                                  }
                                />
                                <Textarea
                                  rows={2}
                                  value={exercise.notes}
                                  placeholder="notas"
                                  onChange={(event) =>
                                    updateExercise(section.id, exercise.id, {
                                      notes: event.target.value,
                                    })
                                  }
                                />
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="bg-transparent"
                                  disabled={exerciseIndex === 0}
                                  onClick={() =>
                                    moveExercise(section.id, exerciseIndex, -1)
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
                                    exerciseIndex === section.exercises.length - 1
                                  }
                                  onClick={() =>
                                    moveExercise(section.id, exerciseIndex, 1)
                                  }
                                >
                                  <ArrowDown className="h-4 w-4" />
                                  bajar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="bg-transparent text-destructive hover:text-destructive"
                                  onClick={() =>
                                    deleteExercise(section.id, exercise.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                  quitar
                                </Button>
                              </div>
                            </div>
                          ))}

                          {section.exercises.length === 0 ? (
                            <div className="rounded-md border border-dashed border-border/70 bg-background/30 px-3 py-4 text-sm text-muted-foreground">
                              sin ejercicios todavia
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>

            {(formError || saveError) && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError ?? saveError?.message}
              </p>
            )}

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-border/70 bg-card/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ring-1",
                  saveStateConfig.className,
                )}
              >
                <SaveStateIcon
                  className={cn(
                    "h-4 w-4",
                    saveState === "saving" && "animate-spin",
                  )}
                />
                <span>{saveStateConfig.description}</span>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!isDirty || isSaving}
                onClick={() => void savePlan()}
              >
                <Save className="h-4 w-4" />
                {isSaving
                  ? "Guardando..."
                  : isDirty
                    ? "Guardar cambios"
                    : "Guardado"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 !overflow-hidden sm:!max-h-[90vh] sm:!w-[95vw] sm:!max-w-[95vw] lg:!max-w-7xl lg:p-7">
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

                    <Select value={librarySource} onValueChange={setLibrarySource}>
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
                    {(libraryQuery.data ?? []).map((exercise) => {
                      const isAlreadyAdded = isLibraryExerciseAddedToSection(
                        selectedSection,
                        exercise,
                      );

                      return (
                        <div
                          key={exercise.id}
                          className={cn(
                            "grid min-w-0 gap-4 rounded-md border border-border/80 bg-card/60 p-4 shadow-sm",
                            isAlreadyAdded && "opacity-70",
                          )}
                        >
                          <div className="min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">
                                {getOptionLabel(
                                  categoryOptions,
                                  exercise.category,
                                )}
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
                              {isAlreadyAdded ? (
                                <Badge variant="secondary">ya anadido</Badge>
                              ) : null}
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
                              disabled={isAlreadyAdded || !selectedSectionId}
                              onClick={() => addLibraryExercise(exercise)}
                            >
                              <Plus className="h-4 w-4" />
                              {isAlreadyAdded ? "anadido" : "anadir"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}

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
                        <Label htmlFor="manual-exercise-rest">
                          descanso s.
                        </Label>
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
                    disabled={!selectedSectionId}
                    onClick={addManualExercise}
                  >
                    <Plus className="h-4 w-4" />
                    anadir manual
                  </Button>
                </div>
              </section>
            </div>
          </div>

          <div className="-mx-1 border-t border-border/70 bg-card/95 px-1 pt-3 backdrop-blur">
            <Button
              type="button"
              size="lg"
              className="w-full sm:ml-auto sm:w-auto"
              onClick={() => setIsLibraryOpen(false)}
            >
              Hecho
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDiscardConfirmOpen}
        onOpenChange={setIsDiscardConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. Quieres salir igualmente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsDiscardConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              salir igualmente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
