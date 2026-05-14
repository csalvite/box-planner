"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Clock,
  Dumbbell,
  FileText,
  Handshake,
  ListRestart,
  Pencil,
  Plus,
  Search,
  Target,
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
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  useCreateExercise,
  useDeleteExercise,
  useExercises,
  useUpdateExercise,
} from "@/hooks/use-exercises";
import type {
  CreateExercisePayload,
  Exercise,
  ExerciseCategory,
  ExerciseFilters,
  ExerciseIntensity,
  ExerciseLevel,
} from "@/lib/api/exercises";
import { isStaffOrganization } from "@/lib/organization-role";
import { cn } from "@/lib/utils";

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

const categoryColors: Record<string, string> = {
  WARMUP: "bg-chart-2/20 text-chart-2 ring-chart-2/20",
  TECHNIQUE: "bg-primary/15 text-primary ring-primary/20",
  BAG: "bg-chart-4/20 text-chart-4 ring-chart-4/20",
  SHADOW: "bg-muted/50 text-muted-foreground ring-border/80",
  PARTNER: "bg-chart-3/20 text-chart-3 ring-chart-3/20",
  SPARRING: "bg-destructive/10 text-destructive ring-destructive/20",
  HIIT: "bg-chart-5/20 text-chart-5 ring-chart-5/20",
  CARDIO: "bg-chart-5/20 text-chart-5 ring-chart-5/20",
  STRENGTH: "bg-chart-4/20 text-chart-4 ring-chart-4/20",
  CORE: "bg-primary/10 text-primary ring-primary/15",
  COOLDOWN: "bg-chart-3/20 text-chart-3 ring-chart-3/20",
  OTHER: "bg-secondary/70 text-secondary-foreground ring-white/10",
};

const categoryAliases: Record<string, ExerciseCategory> = {
  WARM_UP: "WARMUP",
  warm_up: "WARMUP",
  warmup: "WARMUP",
  calentamiento: "WARMUP",
  tecnica: "TECHNIQUE",
  technique: "TECHNIQUE",
  saco: "BAG",
  bag: "BAG",
  sombra: "SHADOW",
  shadow: "SHADOW",
  parejas: "PARTNER",
  pareja: "PARTNER",
  partner: "PARTNER",
  sparring: "SPARRING",
  hiit: "HIIT",
  cardio: "CARDIO",
  fuerza: "STRENGTH",
  strength: "STRENGTH",
  core: "CORE",
  cooldown: "COOLDOWN",
  cool_down: "COOLDOWN",
  "vuelta a la calma": "COOLDOWN",
  otro: "OTHER",
  other: "OTHER",
};

const levelAliases: Record<string, ExerciseLevel> = {
  beginner: "BEGINNER",
  principiante: "BEGINNER",
  intermediate: "INTERMEDIATE",
  intermedio: "INTERMEDIATE",
  advanced: "ADVANCED",
  avanzado: "ADVANCED",
  all_levels: "ALL_LEVELS",
  "todos los niveles": "ALL_LEVELS",
};

const intensityAliases: Record<string, ExerciseIntensity> = {
  low: "LOW",
  baja: "LOW",
  medium: "MEDIUM",
  media: "MEDIUM",
  high: "HIGH",
  alta: "HIGH",
};

interface ExerciseFormState {
  name: string;
  shortDescription: string;
  detailedDescription: string;
  category: ExerciseCategory;
  mainGoal: string;
  level: ExerciseLevel;
  averageDurationMinutes: string;
  intensity: ExerciseIntensity;
  recommendedGroupSize: string;
  spaceRequired: string;
  requiresPartner: boolean;
  coachNotes: string;
}

const initialForm: ExerciseFormState = {
  name: "",
  shortDescription: "",
  detailedDescription: "",
  category: "TECHNIQUE",
  mainGoal: "",
  level: "BEGINNER",
  averageDurationMinutes: "",
  intensity: "MEDIUM",
  recommendedGroupSize: "",
  spaceRequired: "",
  requiresPartner: false,
  coachNotes: "",
};

function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
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

function normalizeOptionValue<T extends string>(
  value: unknown,
  options: Array<{ value: T; label: string }>,
  aliases: Record<string, T>,
  fallback: T,
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return fallback;
  }

  if (options.some((option) => option.value === trimmed)) {
    return trimmed as T;
  }

  const aliasKey = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return aliases[aliasKey] ?? fallback;
}

function normalizeExerciseCategory(value: unknown) {
  return normalizeOptionValue(
    value,
    categoryOptions,
    categoryAliases,
    "TECHNIQUE",
  );
}

function normalizeExerciseLevel(value: unknown) {
  return normalizeOptionValue(value, levelOptions, levelAliases, "BEGINNER");
}

function normalizeExerciseIntensity(value: unknown) {
  return normalizeOptionValue(
    value,
    intensityOptions,
    intensityAliases,
    "MEDIUM",
  );
}

function getExerciseCategoryLabel(value?: string | null) {
  return getOptionLabel(categoryOptions, normalizeExerciseCategory(value));
}

function getExerciseLevelLabel(value?: string | null) {
  return getOptionLabel(levelOptions, normalizeExerciseLevel(value));
}

function getExerciseIntensityLabel(value?: string | null) {
  return getOptionLabel(intensityOptions, normalizeExerciseIntensity(value));
}

function listFromValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function renderUnknownValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "si" : "no";
  }

  if (Array.isArray(value)) {
    const values: string[] = value
      .map((item) => renderUnknownValue(item))
      .filter((item): item is string => Boolean(item));

    return values.length > 0 ? values.join(", ") : null;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return null;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return null;
  }

  return (
    <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function getExerciseBadges(exercise: Exercise) {
  const material = listFromValue(
    exercise.material ?? exercise.materials ?? exercise.equipment,
  );
  const tags = listFromValue(exercise.tags);

  return [...material, ...tags].slice(0, 5);
}

function getExerciseDescription(exercise: Exercise) {
  return (
    exercise.shortDescription ??
    exercise.description ??
    exercise.detailedDescription ??
    "sin descripcion corta"
  );
}

function ExerciseDetail({
  exercise,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = listFromValue(exercise.tags);
  const materials = listFromValue(
    exercise.materials ?? exercise.material ?? exercise.equipment,
  );
  const variants = renderUnknownValue(exercise.variants);
  const compatibilities = renderUnknownValue(exercise.compatibilities);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              "border-transparent",
              categoryColors[normalizeExerciseCategory(exercise.category)],
            )}
          >
            {getExerciseCategoryLabel(exercise.category)}
          </Badge>
          <Badge variant="secondary">
            {getExerciseLevelLabel(exercise.level)}
          </Badge>
          <Badge variant="secondary">
            {getExerciseIntensityLabel(exercise.intensity)}
          </Badge>
        </div>
        {exercise.shortDescription ?? exercise.description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {exercise.shortDescription ?? exercise.description}
          </p>
        ) : null}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailRow label="nombre" value={exercise.name} />
        <DetailRow
          label="categoria"
          value={getExerciseCategoryLabel(exercise.category)}
        />
        <DetailRow label="nivel" value={getExerciseLevelLabel(exercise.level)} />
        <DetailRow
          label="intensidad"
          value={getExerciseIntensityLabel(exercise.intensity)}
        />
        <DetailRow
          label="duracion media"
          value={
            exercise.averageDurationMinutes
              ? `${exercise.averageDurationMinutes} min`
              : null
          }
        />
        <DetailRow label="objetivo principal" value={exercise.mainGoal} />
        <DetailRow
          label="tamano recomendado"
          value={exercise.recommendedGroupSize}
        />
        <DetailRow label="espacio requerido" value={exercise.spaceRequired} />
        <DetailRow
          label="requiere pareja"
          value={exercise.requiresPartner ? "si" : "no"}
        />
      </dl>

      <dl className="space-y-3">
        <DetailRow
          label="descripcion detallada"
          value={exercise.detailedDescription}
        />
        <DetailRow label="notas para coach" value={exercise.coachNotes} />
        <DetailRow
          label="tags"
          value={
            tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null
          }
        />
        <DetailRow
          label="materiales"
          value={
            materials.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {materials.map((material) => (
                  <Badge key={material} variant="outline">
                    {material}
                  </Badge>
                ))}
              </div>
            ) : null
          }
        />
        <DetailRow label="variantes" value={variants} />
        <DetailRow label="compatibilidades" value={compatibilities} />
      </dl>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          type="button"
          variant="outline"
          className="bg-transparent"
          onClick={onClose}
        >
          cerrar
        </Button>
        <Button type="button" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          editar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="bg-transparent text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          desactivar
        </Button>
      </div>
    </div>
  );
}

function optionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const numberValue = Number.parseInt(trimmed, 10);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

function toPayload(form: ExerciseFormState): CreateExercisePayload {
  return {
    name: form.name.trim(),
    category: normalizeExerciseCategory(form.category),
    level: normalizeExerciseLevel(form.level),
    intensity: normalizeExerciseIntensity(form.intensity),
    shortDescription: form.shortDescription.trim() || undefined,
    detailedDescription: form.detailedDescription.trim() || undefined,
    mainGoal: form.mainGoal.trim() || undefined,
    averageDurationMinutes: optionalNumber(form.averageDurationMinutes),
    recommendedGroupSize: form.recommendedGroupSize.trim() || undefined,
    spaceRequired: form.spaceRequired.trim() || undefined,
    requiresPartner: form.requiresPartner,
    coachNotes: form.coachNotes.trim() || undefined,
  };
}

function formFromExercise(exercise: Exercise): ExerciseFormState {
  return {
    name: exercise.name,
    shortDescription: exercise.shortDescription ?? exercise.description ?? "",
    detailedDescription: exercise.detailedDescription ?? "",
    category: normalizeExerciseCategory(exercise.category),
    mainGoal: exercise.mainGoal ?? "",
    level: normalizeExerciseLevel(exercise.level),
    averageDurationMinutes: exercise.averageDurationMinutes
      ? String(exercise.averageDurationMinutes)
      : "",
    intensity: normalizeExerciseIntensity(exercise.intensity),
    recommendedGroupSize: exercise.recommendedGroupSize ?? "",
    spaceRequired: exercise.spaceRequired ?? "",
    requiresPartner: Boolean(exercise.requiresPartner),
    coachNotes: exercise.coachNotes ?? "",
  };
}

function ExerciseForm({
  form,
  formError,
  isSubmitting,
  submitLabel,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: ExerciseFormState;
  formError: string | null;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel: () => void;
  onChange: (form: ExerciseFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="exercise-name">nombre</Label>
        <Input
          id="exercise-name"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="jab-cross con desplazamiento"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="exercise-category">categoria</Label>
          <Select
            value={form.category}
            onValueChange={(category) =>
              onChange({ ...form, category: category as ExerciseCategory })
            }
          >
            <SelectTrigger id="exercise-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="exercise-level">nivel</Label>
          <Select
            value={form.level}
            onValueChange={(level) =>
              onChange({ ...form, level: level as ExerciseLevel })
            }
          >
            <SelectTrigger id="exercise-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="exercise-intensity">intensidad</Label>
          <Select
            value={form.intensity}
            onValueChange={(intensity) =>
              onChange({ ...form, intensity: intensity as ExerciseIntensity })
            }
          >
            <SelectTrigger id="exercise-intensity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intensityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise-short-description">descripcion corta</Label>
        <Input
          id="exercise-short-description"
          value={form.shortDescription}
          onChange={(event) =>
            onChange({ ...form, shortDescription: event.target.value })
          }
          placeholder="combinacion tecnica para trabajar distancia"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise-detailed-description">
          descripcion detallada
        </Label>
        <Textarea
          id="exercise-detailed-description"
          rows={3}
          value={form.detailedDescription}
          onChange={(event) =>
            onChange({ ...form, detailedDescription: event.target.value })
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exercise-goal">objetivo principal</Label>
          <Input
            id="exercise-goal"
            value={form.mainGoal}
            onChange={(event) =>
              onChange({ ...form, mainGoal: event.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exercise-duration">duracion media min.</Label>
          <Input
            id="exercise-duration"
            type="number"
            min="1"
            value={form.averageDurationMinutes}
            onChange={(event) =>
              onChange({ ...form, averageDurationMinutes: event.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exercise-group-size">tamano recomendado</Label>
          <Input
            id="exercise-group-size"
            value={form.recommendedGroupSize}
            onChange={(event) =>
              onChange({ ...form, recommendedGroupSize: event.target.value })
            }
            placeholder="parejas, grupos de 3, clase completa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exercise-space">espacio requerido</Label>
          <Input
            id="exercise-space"
            value={form.spaceRequired}
            onChange={(event) =>
              onChange({ ...form, spaceRequired: event.target.value })
            }
            placeholder="ring, saco, zona libre"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 bg-background/45 px-3 py-3">
        <Label htmlFor="exercise-partner" className="text-sm font-medium">
          requiere pareja
        </Label>
        <Switch
          id="exercise-partner"
          checked={form.requiresPartner}
          onCheckedChange={(requiresPartner) =>
            onChange({ ...form, requiresPartner })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exercise-coach-notes">notas para coach</Label>
        <Textarea
          id="exercise-coach-notes"
          rows={3}
          value={form.coachNotes}
          onChange={(event) =>
            onChange({ ...form, coachNotes: event.target.value })
          }
        />
      </div>

      {formError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" className="bg-transparent" onClick={onCancel}>
          cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ExerciseCard({
  exercise,
  isDeleting,
  onViewDetail,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  isDeleting: boolean;
  onViewDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badges = getExerciseBadges(exercise);
  const isInactive = exercise.isActive === false || exercise.active === false;
  const category = normalizeExerciseCategory(exercise.category);

  return (
    <Card
      className={cn(
        "h-full border-border/80 bg-card/70 p-5 shadow-md shadow-black/15 transition",
        isInactive && "border-border/45 bg-card/45 opacity-70",
      )}
    >
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium ring-1",
                  categoryColors[category] ??
                    "bg-secondary/70 text-secondary-foreground ring-white/10",
                )}
              >
                {getExerciseCategoryLabel(category)}
              </span>
              {exercise.requiresPartner ? (
                <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/80">
                  pareja
                </span>
              ) : null}
            </div>
            <h3 className="text-lg font-semibold leading-tight text-foreground">
              {exercise.name}
            </h3>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </span>
        </div>

        <p className="text-sm leading-6 text-muted-foreground line-clamp-3">
          {getExerciseDescription(exercise)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              nivel
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {getExerciseLevelLabel(exercise.level)}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              intensidad
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {getExerciseIntensityLabel(exercise.intensity)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {exercise.averageDurationMinutes ? (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {exercise.averageDurationMinutes} min
            </span>
          ) : null}
          {exercise.mainGoal ? (
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              {exercise.mainGoal}
            </span>
          ) : null}
          {exercise.requiresPartner ? (
            <span className="flex items-center gap-1.5">
              <Handshake className="h-4 w-4" />
              requiere pareja
            </span>
          ) : null}
        </div>

        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge
                key={badge}
                variant="outline"
                className="border-border/70 bg-background/45 text-muted-foreground"
              >
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={onViewDetail}
          >
            ver detalle
          </Button>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            editar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent text-destructive hover:text-destructive"
            disabled={isDeleting}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            desactivar
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function ExercisesContent() {
  const { activeOrganization, activeOrganizationId } = useActiveOrganization();
  const canManageExercises = isStaffOrganization(activeOrganization);
  const exercisesOrganizationId = canManageExercises ? activeOrganizationId : null;
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [levelFilter, setLevelFilter] = useState(ALL_VALUE);
  const [intensityFilter, setIntensityFilter] = useState(ALL_VALUE);
  const [requiresPartnerFilter, setRequiresPartnerFilter] = useState(ALL_VALUE);
  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim());
  const filters = useMemo<ExerciseFilters>(
    () => ({
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
      ...(categoryFilter !== ALL_VALUE
        ? { category: normalizeExerciseCategory(categoryFilter) }
        : {}),
      ...(levelFilter !== ALL_VALUE
        ? { level: normalizeExerciseLevel(levelFilter) }
        : {}),
      ...(intensityFilter !== ALL_VALUE
        ? { intensity: normalizeExerciseIntensity(intensityFilter) }
        : {}),
      ...(requiresPartnerFilter !== ALL_VALUE
        ? { requiresPartner: requiresPartnerFilter === "true" }
        : {}),
    }),
    [
      categoryFilter,
      debouncedSearchTerm,
      intensityFilter,
      levelFilter,
      requiresPartnerFilter,
    ],
  );
  const exercisesQuery = useExercises(exercisesOrganizationId, filters);
  const createExercise = useCreateExercise(exercisesOrganizationId);
  const updateExercise = useUpdateExercise(exercisesOrganizationId);
  const deleteExercise = useDeleteExercise(exercisesOrganizationId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [form, setForm] = useState<ExerciseFormState>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const exercises = exercisesQuery.data ?? [];
  const isEditing = Boolean(editingExercise);
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    categoryFilter !== ALL_VALUE ||
    levelFilter !== ALL_VALUE ||
    intensityFilter !== ALL_VALUE ||
    requiresPartnerFilter !== ALL_VALUE;

  if (!canManageExercises) {
    return (
      <EmptyState
        title="no tienes acceso a ejercicios"
        description="esta pantalla esta disponible para owners, admins y coaches."
        icon={Dumbbell}
        className="min-h-[420px]"
      />
    );
  }

  const openCreateForm = () => {
    setEditingExercise(null);
    setForm(initialForm);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditForm = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setForm(formFromExercise(exercise));
    setFormError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingExercise(null);
    setForm(initialForm);
    setFormError(null);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter(ALL_VALUE);
    setLevelFilter(ALL_VALUE);
    setIntensityFilter(ALL_VALUE);
    setRequiresPartnerFilter(ALL_VALUE);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }

    if (!form.category || !form.level || !form.intensity) {
      setFormError("Categoria, nivel e intensidad son obligatorios.");
      return;
    }

    try {
      const payload = toPayload(form);
      const mutationPromise = editingExercise
        ? updateExercise.mutateAsync({
            exerciseId: editingExercise.id,
            input: payload,
          })
        : createExercise.mutateAsync(payload);

      toast.promise(mutationPromise, {
        loading: isEditing ? "actualizando ejercicio..." : "creando ejercicio...",
        success: isEditing ? "ejercicio actualizado" : "ejercicio creado",
        error: isEditing
          ? "no se pudo actualizar el ejercicio"
          : "no se pudo crear el ejercicio",
      });

      await mutationPromise;
      closeForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo guardar el ejercicio.",
      );
    }
  };

  const handleDelete = async () => {
    if (!exerciseToDelete) {
      return;
    }

    const deletePromise = deleteExercise.mutateAsync(exerciseToDelete.id);

    toast.promise(deletePromise, {
      loading: "desactivando ejercicio...",
      success: "ejercicio desactivado",
      error: "no se pudo desactivar el ejercicio",
    });

    try {
      await deletePromise;
      setExerciseToDelete(null);
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Biblioteca de ejercicios
          </h1>
          <p className="mt-1 text-muted-foreground">
            Crea y organiza ejercicios reutilizables para tus clases.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full md:w-auto"
          onClick={openCreateForm}
          disabled={!activeOrganizationId}
        >
          <Plus className="h-4 w-4" />
          crear ejercicio
        </Button>
      </section>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "editar ejercicio" : "crear ejercicio"}
            </DialogTitle>
            <DialogDescription>
              guarda los datos base para reutilizarlo despues en tus clases.
            </DialogDescription>
          </DialogHeader>
          <ExerciseForm
            form={form}
            formError={formError}
            isSubmitting={createExercise.isPending || updateExercise.isPending}
            submitLabel={isEditing ? "guardar cambios" : "crear ejercicio"}
            onCancel={closeForm}
            onChange={setForm}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(exerciseToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setExerciseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>desactivar ejercicio</AlertDialogTitle>
            <AlertDialogDescription>
              El backend hara un borrado logico. El ejercicio dejara de aparecer
              en la biblioteca activa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {exerciseToDelete ? (
            <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
              {exerciseToDelete.name}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteExercise.isPending}>
              cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExercise.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(detailExercise)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailExercise(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailExercise?.name}</DialogTitle>
            <DialogDescription>
              informacion completa del ejercicio reutilizable.
            </DialogDescription>
          </DialogHeader>
          {detailExercise ? (
            <ExerciseDetail
              exercise={detailExercise}
              onClose={() => setDetailExercise(null)}
              onEdit={() => {
                openEditForm(detailExercise);
                setDetailExercise(null);
              }}
              onDelete={() => {
                setExerciseToDelete(detailExercise);
                setDetailExercise(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {!activeOrganizationId ? (
        <EmptyState
          title="selecciona una organizacion"
          description="necesitas una organizacion activa para gestionar la biblioteca."
          icon={Dumbbell}
          className="min-h-[360px]"
        />
      ) : (
        <>
          <section className="space-y-3 rounded-lg border border-border/70 bg-card/45 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="buscar por nombre"
                className="pl-9"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="exercise-category-filter">
                  <SelectValue placeholder="categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>todas las categorias</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger id="exercise-level-filter">
                  <SelectValue placeholder="nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>todos los niveles</SelectItem>
                  {levelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={intensityFilter} onValueChange={setIntensityFilter}>
                <SelectTrigger id="exercise-intensity-filter">
                  <SelectValue placeholder="intensidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>todas las intensidades</SelectItem>
                  {intensityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={requiresPartnerFilter}
                onValueChange={setRequiresPartnerFilter}
              >
                <SelectTrigger id="exercise-partner-filter">
                  <SelectValue placeholder="pareja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>pareja: todos</SelectItem>
                  <SelectItem value="true">requiere pareja</SelectItem>
                  <SelectItem value="false">sin pareja</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                disabled={!hasActiveFilters}
                onClick={clearFilters}
              >
                <ListRestart className="h-4 w-4" />
                limpiar filtros
              </Button>
            </div>
          </section>

          {exercisesQuery.isLoading ? (
            <LoadingState
              title="cargando ejercicios"
              description="estamos leyendo la biblioteca de la organizacion."
              className="min-h-[320px]"
            />
          ) : null}

          {exercisesQuery.error ? (
            <ErrorState
              title="no pudimos cargar los ejercicios"
              description={exercisesQuery.error.message}
              actionLabel="reintentar"
              onAction={() => void exercisesQuery.refetch()}
              className="min-h-[320px]"
            />
          ) : null}

          {deleteExercise.error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteExercise.error.message}
            </p>
          ) : null}

          {!exercisesQuery.isLoading && !exercisesQuery.error ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  ejercicios
                </h2>
                <p className="text-sm text-muted-foreground">
                  {exercises.length} encontrados
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    isDeleting={
                      deleteExercise.isPending &&
                      deleteExercise.variables === exercise.id
                    }
                    onViewDetail={() => setDetailExercise(exercise)}
                    onEdit={() => openEditForm(exercise)}
                    onDelete={() => setExerciseToDelete(exercise)}
                  />
                ))}
              </div>

              {exercises.length === 0 ? (
                <EmptyState
                  title="no hay ejercicios todavia"
                  description={
                    debouncedSearchTerm ||
                    categoryFilter !== ALL_VALUE ||
                    levelFilter !== ALL_VALUE ||
                    intensityFilter !== ALL_VALUE ||
                    requiresPartnerFilter !== ALL_VALUE
                      ? "ajusta los filtros o crea un ejercicio nuevo."
                      : "crea el primer ejercicio reutilizable de tu biblioteca."
                  }
                  icon={Dumbbell}
                  actionLabel="crear ejercicio"
                  onAction={openCreateForm}
                  className="min-h-[340px]"
                />
              ) : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
