"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
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
  ClassSessionStatusCode,
  UpdateClassSessionInput,
} from "@/lib/api/class-sessions";
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";
const GLOBAL_SOURCE_VALUE = "global";
const LOCAL_SOURCE_VALUE = "local";

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

interface ClassPlanExercise {
  id: string;
  libraryExerciseId?: string;
  name: string;
  description: string;
  durationMinutes: string;
  reps: string;
  restSec: string;
  notes: string;
  source: "library" | "manual";
}

interface ClassPlanSection {
  id: string;
  name: string;
  goal: string;
  durationMinutes: string;
  notes: string;
  exercises: ClassPlanExercise[];
}

interface ClassPlan {
  sections: ClassPlanSection[];
}

interface ClassEditorForm {
  title: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: string;
  status: ClassSessionStatusCode;
  notes: string;
}

interface ManualExerciseForm {
  name: string;
  description: string;
  durationMinutes: string;
  reps: string;
  restSec: string;
  notes: string;
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultPlan(): ClassPlan {
  return {
    sections: defaultSectionNames.map((name) => ({
      id: createId("section"),
      name,
      goal: "",
      durationMinutes: "",
      notes: "",
      exercises: [],
    })),
  };
}

function getPlanStorageKey(classSessionId: string) {
  return `boxplanner:class-plan:${classSessionId}`;
}

function safeParsePlan(value: string | null): ClassPlan | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ClassPlan>;

    return Array.isArray(parsed.sections)
      ? { sections: parsed.sections as ClassPlanSection[] }
      : null;
  } catch {
    return null;
  }
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

const emptyManualExercise: ManualExerciseForm = {
  name: "",
  description: "",
  durationMinutes: "",
  reps: "",
  restSec: "",
  notes: "",
};

function createExerciseFromLibrary(exercise: Exercise): ClassPlanExercise {
  return {
    id: createId("exercise"),
    libraryExerciseId: exercise.id,
    name: exercise.name,
    description: getExerciseDescription(exercise),
    durationMinutes: exercise.averageDurationMinutes
      ? String(exercise.averageDurationMinutes)
      : "",
    reps: "",
    restSec: "0",
    notes: exercise.coachNotes ?? "",
    source: "library",
  };
}

function createExerciseFromManual(form: ManualExerciseForm): ClassPlanExercise {
  return {
    id: createId("exercise"),
    name: form.name.trim(),
    description: form.description.trim(),
    durationMinutes: form.durationMinutes.trim(),
    reps: form.reps.trim(),
    restSec: form.restSec.trim(),
    notes: form.notes.trim(),
    source: "manual",
  };
}

function formatClassDate(value: string | Date) {
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

function summarizeExercise(exercise: ClassPlanExercise) {
  const parts = [
    exercise.durationMinutes ? `${exercise.durationMinutes} min` : null,
    exercise.reps ? `${exercise.reps} reps` : null,
    exercise.restSec ? `${exercise.restSec}s descanso` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "sin tiempos";
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
  const [classForm, setClassForm] = useState<ClassEditorForm>({
    title: "",
    startsAt: "",
    endsAt: "",
    durationMinutes: "",
    status: "SCHEDULED",
    notes: "",
  });
  const [plan, setPlan] = useState<ClassPlan>(createDefaultPlan);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<{
    sectionId: string;
    exercise: ClassPlanExercise;
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
  const selectedSection = plan.sections.find(
    (section) => section.id === selectedSectionId,
  );
  const hasLibraryFilters =
    libraryCategory !== ALL_VALUE ||
    libraryLevel !== ALL_VALUE ||
    libraryIntensity !== ALL_VALUE ||
    librarySource !== ALL_VALUE;

  useEffect(() => {
    if (!session || !open) {
      return;
    }

    setClassForm({
      title: session.title,
      startsAt: toDateTimeInputValue(session.startsAt),
      endsAt: toDateTimeInputValue(session.endsAt),
      durationMinutes: "",
      status: normalizeStatus(session.status),
      notes: session.notes ?? "",
    });

    const storedPlan =
      typeof window !== "undefined"
        ? safeParsePlan(
            window.localStorage.getItem(getPlanStorageKey(session.id)),
          )
        : null;
    const nextPlan = storedPlan ?? createDefaultPlan();
    setPlan(nextPlan);
    setSelectedSectionId(nextPlan.sections[0]?.id ?? null);
    setFormError(null);
  }, [open, session]);

  if (!session) {
    return null;
  }

  const updatePlan = (updater: (currentPlan: ClassPlan) => ClassPlan) => {
    setPlan((currentPlan) => updater(currentPlan));
  };

  const updateSection = (
    sectionId: string,
    input: Partial<Omit<ClassPlanSection, "id" | "exercises">>,
  ) => {
    updatePlan((currentPlan) => ({
      sections: currentPlan.sections.map((section) =>
        section.id === sectionId ? { ...section, ...input } : section,
      ),
    }));
  };

  const addSection = () => {
    const section: ClassPlanSection = {
      id: createId("section"),
      name: "Nueva seccion",
      goal: "",
      durationMinutes: "",
      notes: "",
      exercises: [],
    };

    updatePlan((currentPlan) => ({
      sections: [...currentPlan.sections, section],
    }));
    setSelectedSectionId(section.id);
  };

  const removeSection = (sectionId: string) => {
    updatePlan((currentPlan) => {
      const sections = currentPlan.sections.filter(
        (section) => section.id !== sectionId,
      );
      setSelectedSectionId(sections[0]?.id ?? null);

      return { sections };
    });
  };

  const addExerciseToSection = (
    sectionId: string,
    exercise: ClassPlanExercise,
  ) => {
    updatePlan((currentPlan) => ({
      sections: currentPlan.sections.map((section) =>
        section.id === sectionId
          ? { ...section, exercises: [...section.exercises, exercise] }
          : section,
      ),
    }));
  };

  const updateExercise = (
    sectionId: string,
    exerciseId: string,
    input: Partial<ClassPlanExercise>,
  ) => {
    updatePlan((currentPlan) => ({
      sections: currentPlan.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              exercises: section.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? { ...exercise, ...input }
                  : exercise,
              ),
            }
          : section,
      ),
    }));
  };

  const removeExercise = (sectionId: string, exerciseId: string) => {
    updatePlan((currentPlan) => ({
      sections: currentPlan.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              exercises: section.exercises.filter(
                (exercise) => exercise.id !== exerciseId,
              ),
            }
          : section,
      ),
    }));
  };

  const saveClass = async () => {
    setFormError(null);

    if (!classForm.title.trim()) {
      setFormError("El titulo es obligatorio.");
      return;
    }

    if (!classForm.startsAt) {
      setFormError("Selecciona fecha y hora de inicio.");
      return;
    }

    const startsAt = toIsoDateTime(classForm.startsAt);
    const endsAt = classForm.endsAt
      ? (toIsoDateTime(classForm.endsAt) ?? undefined)
      : addMinutesToIsoDateTime(classForm.startsAt, classForm.durationMinutes);

    if (!startsAt || (classForm.endsAt && !endsAt)) {
      setFormError("Revisa las fechas de la clase.");
      return;
    }

    const savePromise = onSaveClass(session.id, {
      title: classForm.title.trim(),
      startsAt,
      endsAt,
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
      window.localStorage.setItem(
        getPlanStorageKey(session.id),
        JSON.stringify(plan),
      );
    } catch {
      // react-query keeps the mutation error for the inline state
    }
  };

  const openLibraryForSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setManualExercise(emptyManualExercise);
    setIsLibraryOpen(true);
  };

  const handleManualAdd = () => {
    if (!selectedSectionId) {
      return;
    }

    if (!manualExercise.name.trim()) {
      setFormError("El ejercicio manual necesita nombre.");
      return;
    }

    addExerciseToSection(
      selectedSectionId,
      createExerciseFromManual(manualExercise),
    );
    setManualExercise(emptyManualExercise);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl lg:p-7">
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
                    <Label htmlFor="editor-class-start">inicio</Label>
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
                    <Label htmlFor="editor-class-duration">duracion min.</Label>
                    <Input
                      id="editor-class-duration"
                      type="number"
                      min="1"
                      value={classForm.durationMinutes}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          durationMinutes: event.target.value,
                        })
                      }
                      placeholder="60"
                    />
                  </div>
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

              {(formError || saveError) && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError ?? saveError?.message}
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
                <Button type="button" onClick={addSection}>
                  <Plus className="h-4 w-4" />
                  anadir seccion
                </Button>
              </div>

              <div className="space-y-3">
                {plan.sections.map((section, sectionIndex) => (
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
                              value={section.durationMinutes}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  durationMinutes: event.target.value,
                                })
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
                              value={section.goal}
                              onChange={(event) =>
                                updateSection(section.id, {
                                  goal: event.target.value,
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
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent"
                        disabled={sectionIndex === 0}
                        onClick={() =>
                          updatePlan((currentPlan) => ({
                            sections: moveItem(
                              currentPlan.sections,
                              sectionIndex,
                              -1,
                            ),
                          }))
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                        subir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent"
                        disabled={sectionIndex === plan.sections.length - 1}
                        onClick={() =>
                          updatePlan((currentPlan) => ({
                            sections: moveItem(
                              currentPlan.sections,
                              sectionIndex,
                              1,
                            ),
                          }))
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                        bajar
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
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        borrar
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {section.exercises.map((exercise, exerciseIndex) => (
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
                                {exercise.source === "library" ? (
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
                              disabled={exerciseIndex === 0}
                              onClick={() =>
                                updatePlan((currentPlan) => ({
                                  sections: currentPlan.sections.map(
                                    (currentSection) =>
                                      currentSection.id === section.id
                                        ? {
                                            ...currentSection,
                                            exercises: moveItem(
                                              currentSection.exercises,
                                              exerciseIndex,
                                              -1,
                                            ),
                                          }
                                        : currentSection,
                                  ),
                                }))
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
                                updatePlan((currentPlan) => ({
                                  sections: currentPlan.sections.map(
                                    (currentSection) =>
                                      currentSection.id === section.id
                                        ? {
                                            ...currentSection,
                                            exercises: moveItem(
                                              currentSection.exercises,
                                              exerciseIndex,
                                              1,
                                            ),
                                          }
                                        : currentSection,
                                  ),
                                }))
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
                                  exercise,
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
                              onClick={() =>
                                removeExercise(section.id, exercise.id)
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
                  </article>
                ))}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-5xl lg:p-7">
          <DialogHeader>
            <DialogTitle>anadir ejercicio</DialogTitle>
            <DialogDescription>
              {selectedSection
                ? `se anadira a ${selectedSection.name}`
                : "selecciona una seccion"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              <div className="space-y-3 rounded-lg border border-border/70 bg-background/45 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    placeholder="buscar ejercicios"
                    className="pl-9"
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
                    disabled={!hasLibraryFilters}
                    onClick={() => {
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
                    "grid gap-3 md:grid md:grid-cols-4",
                    areLibraryFiltersOpen ? "grid" : "hidden",
                  )}
                >
                  <Select
                    value={libraryCategory}
                    onValueChange={setLibraryCategory}
                  >
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

                  <Select
                    value={libraryIntensity}
                    onValueChange={setLibraryIntensity}
                  >
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

                  <Select
                    value={librarySource}
                    onValueChange={setLibrarySource}
                  >
                    <SelectTrigger>
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
                <div className="max-h-[50dvh] space-y-3 overflow-y-auto pr-1 md:max-h-[58dvh]">
                  {(libraryQuery.data ?? []).map((exercise) => (
                    <div
                      key={exercise.id}
                      className="rounded-lg border border-border/80 bg-card/60 p-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap gap-2">
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
                          </div>
                          <h4 className="font-medium text-foreground">
                            {exercise.name}
                          </h4>
                          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {getExerciseDescription(exercise) ||
                              "sin descripcion"}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Dumbbell className="h-3.5 w-3.5" />
                              {getOptionLabel(levelOptions, exercise.level)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="h-3.5 w-3.5" />
                              {exercise.averageDurationMinutes
                                ? `${exercise.averageDurationMinutes} min`
                                : "sin duracion"}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          className="w-full sm:w-auto"
                          disabled={!selectedSectionId}
                          onClick={() => {
                            if (!selectedSectionId) {
                              return;
                            }

                            addExerciseToSection(
                              selectedSectionId,
                              createExerciseFromLibrary(exercise),
                            );
                          }}
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
                      className="min-h-[220px]"
                    />
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="space-y-4 rounded-lg border border-border/80 bg-background/45 p-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  ejercicio manual rapido
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  para anadir algo de la clase sin crearlo en biblioteca.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="manual-exercise-name">nombre</Label>
                  <Input
                    id="manual-exercise-name"
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
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="space-y-2">
                    <Label htmlFor="manual-exercise-duration">min.</Label>
                    <Input
                      id="manual-exercise-duration"
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
                className="w-full"
                disabled={!selectedSectionId}
                onClick={handleManualAdd}
              >
                <Plus className="h-4 w-4" />
                anadir manual
              </Button>
            </section>
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
                  value={editingExercise.exercise.name}
                  onChange={(event) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: {
                        ...editingExercise.exercise,
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
                  value={editingExercise.exercise.description}
                  onChange={(event) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: {
                        ...editingExercise.exercise,
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
                    value={editingExercise.exercise.durationMinutes}
                    onChange={(event) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: {
                          ...editingExercise.exercise,
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
                    value={editingExercise.exercise.reps}
                    onChange={(event) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: {
                          ...editingExercise.exercise,
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
                    value={editingExercise.exercise.restSec}
                    onChange={(event) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: {
                          ...editingExercise.exercise,
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
                  value={editingExercise.exercise.notes}
                  onChange={(event) =>
                    setEditingExercise({
                      ...editingExercise,
                      exercise: {
                        ...editingExercise.exercise,
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
                onClick={() => {
                  updateExercise(
                    editingExercise.sectionId,
                    editingExercise.exercise.id,
                    editingExercise.exercise,
                  );
                  setEditingExercise(null);
                }}
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
