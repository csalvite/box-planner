"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  FileText,
  Layers,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Dumbbell,
  UsersRound,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/data-state";
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
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  useClassSessions,
  useCreateClassSession,
  useDeleteClassSession,
  useUpdateClassSession,
  useUpdateClassSessionEnabled,
  useUpdateClassSessionStatus,
} from "@/hooks/use-class-sessions";
import { useTrainings } from "@/hooks/use-trainings";
import type {
  ClassSession,
  ClassSessionStatusCode,
} from "@/lib/api/class-sessions";
import { isStaffOrganization } from "@/lib/organization-role";
import { cn } from "@/lib/utils";

interface ClassSessionFormState {
  title: string;
  trainingId: string;
  startsAt: string;
  endsAt: string;
  notes: string;
}

const initialForm: ClassSessionFormState = {
  title: "",
  trainingId: "",
  startsAt: "",
  endsAt: "",
  notes: "",
};

const NO_TRAINING_VALUE = "no-training";
const ALL_CLASS_TYPES_VALUE = "all-class-types";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClassSessionDisplayState = "ENABLED" | "DISABLED" | "CANCELLED";
type ClassSessionListFilter = "all" | "enabled" | "disabled" | "cancelled";

const statusLabels: Record<ClassSessionDisplayState, string> = {
  ENABLED: "habilitada",
  DISABLED: "deshabilitada",
  CANCELLED: "cancelada",
};

const statusColors: Record<ClassSessionDisplayState, string> = {
  ENABLED: "bg-primary/10 text-primary ring-primary/15",
  DISABLED: "bg-muted/40 text-muted-foreground ring-border/80",
  CANCELLED: "bg-destructive/10 text-destructive ring-destructive/20",
};

const statusAliases: Record<string, ClassSessionStatusCode> = {
  scheduled: "SCHEDULED",
  programada: "SCHEDULED",
  completed: "COMPLETED",
  completada: "COMPLETED",
  cancelled: "CANCELLED",
  cancelada: "CANCELLED",
};

const statusFilters: Array<{
  value: ClassSessionListFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "enabled", label: "Habilitadas" },
  { value: "disabled", label: "Deshabilitadas" },
  { value: "cancelled", label: "Canceladas" },
];

function toIsoDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
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

function formatSessionDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      day: "fecha pendiente",
      time: "hora pendiente",
    };
  }

  return {
    day: new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date),
    time: new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function formatDuration(
  startsAt: string | Date,
  endsAt?: string | Date | null,
) {
  if (!endsAt) {
    return null;
  }

  const startDate = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const endDate = endsAt instanceof Date ? endsAt : new Date(endsAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  const durationMin = Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / 60000),
  );

  return `${durationMin} min`;
}

function normalizeStatus(status?: string | null): ClassSessionStatusCode {
  return (
    statusAliases[
      String(status ?? "SCHEDULED")
        .trim()
        .toLowerCase()
    ] ?? "SCHEDULED"
  );
}

function getDisplayState(session: ClassSession): ClassSessionDisplayState {
  if (normalizeStatus(session.status) === "CANCELLED") {
    return "CANCELLED";
  }

  return session.isEnabled === false ? "DISABLED" : "ENABLED";
}

function getTrainingTitle(session: ClassSession) {
  return (
    session.classType?.title ??
    session.training?.title ??
    "sin estructura todavía"
  );
}

function toOptionalTrainingId(trainingId: string) {
  return trainingId === NO_TRAINING_VALUE ? "" : trainingId;
}

function getUpdateTrainingId(trainingId: string) {
  if (trainingId === NO_TRAINING_VALUE) {
    return null;
  }

  return trainingId || undefined;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function getAttendanceCount(session: ClassSession) {
  return (
    session.attendanceCount ??
    session.attendeesCount ??
    session.attendancesCount ??
    session._count?.attendances ??
    session._count?.attendees ??
    0
  );
}

function getClassSessionsErrorMessage(error: Error) {
  return `${error.message}. revisa que la organizacion activa tenga permisos y vuelve a intentarlo.`;
}

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

function ClassSessionCard({
  session,
  isDeleting,
  isUpdatingStatus,
  isUpdatingEnabled,
  canEdit,
  onEdit,
  onToggleEnabled,
  onCancel,
  onDelete,
}: {
  session: ClassSession;
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  isUpdatingEnabled: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onToggleEnabled: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const dateTime = formatSessionDate(session.startsAt);
  const displayState = getDisplayState(session);
  const duration = formatDuration(session.startsAt, session.endsAt);
  const hasTraining = Boolean(session.classType ?? session.training);
  const isMuted = displayState === "DISABLED" || displayState === "CANCELLED";
  const toggleStatusLabel =
    displayState === "DISABLED" ? "habilitar" : "deshabilitar";

  return (
    <Card
      className={cn(
        "border-border/80 bg-card/70 p-5 shadow-md shadow-black/15 transition",
        isMuted && "border-border/45 bg-card/45 opacity-75 shadow-black/5",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1",
                statusColors[displayState] ?? statusColors.ENABLED,
              )}
            >
              {statusLabels[displayState]}
            </span>
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
              {dateTime.day}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-semibold leading-tight text-foreground">
              {session.title}
            </h3>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {dateTime.time}
              </span>
              {duration ? (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  {duration}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Dumbbell className="h-4 w-4" />
                {getTrainingTitle(session)}
              </span>
              <span className="flex items-center gap-1.5">
                <UsersRound className="h-4 w-4" />
                {getAttendanceCount(session)} apuntados
              </span>
            </div>
          </div>

          {session.notes ? (
            <p className="flex gap-2 text-sm leading-6 text-muted-foreground">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              {session.notes}
            </p>
          ) : null}
        </div>

        {canEdit ? (
          <div className="grid gap-2 sm:min-w-44">
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={onEdit}
            >
              {hasTraining ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              {hasTraining ? "editar" : "añadir estructura"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              disabled={isUpdatingEnabled || displayState === "CANCELLED"}
              onClick={onToggleEnabled}
            >
              <Power className="h-4 w-4" />
              {toggleStatusLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent text-destructive hover:text-destructive"
              disabled={isUpdatingStatus || displayState === "CANCELLED"}
              onClick={onCancel}
            >
              <XCircle className="h-4 w-4" />
              cancelar clase
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent text-destructive hover:text-destructive"
              disabled={isDeleting}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
              borrar definitivamente
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function ClassesContent() {
  const { activeOrganization, activeOrganizationId } = useActiveOrganization();
  const canManageClasses = isStaffOrganization(activeOrganization);
  const classesOrganizationId = canManageClasses ? activeOrganizationId : null;
  const [statusFilter, setStatusFilter] =
    useState<ClassSessionListFilter>("all");
  const [classTypeFilter, setClassTypeFilter] = useState(ALL_CLASS_TYPES_VALUE);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim());
  const classSessionFilters = useMemo(
    () => ({
      ...(statusFilter === "all"
        ? { status: "ALL" as const, enabled: "ALL" as const }
        : {}),
      ...(statusFilter === "enabled" ? { enabled: "true" as const } : {}),
      ...(statusFilter === "disabled" ? { enabled: "false" as const } : {}),
      ...(statusFilter === "cancelled" ? { status: "CANCELLED" as const } : {}),
      ...(classTypeFilter !== ALL_CLASS_TYPES_VALUE
        ? { trainingId: classTypeFilter }
        : {}),
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    }),
    [classTypeFilter, debouncedSearchTerm, statusFilter],
  );
  const classSessionsQuery = useClassSessions(
    classesOrganizationId,
    classSessionFilters,
  );
  const trainingsQuery = useTrainings(classesOrganizationId);
  const createClassSession = useCreateClassSession(classesOrganizationId);
  const updateClassSession = useUpdateClassSession(classesOrganizationId);
  const updateClassSessionEnabled = useUpdateClassSessionEnabled(
    classesOrganizationId,
  );
  const updateClassSessionStatus = useUpdateClassSessionStatus(
    classesOrganizationId,
  );
  const deleteClassSession = useDeleteClassSession(classesOrganizationId);
  const [form, setForm] = useState<ClassSessionFormState>(initialForm);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(
    null,
  );
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(
    null,
  );
  const [editForm, setEditForm] = useState<ClassSessionFormState>(initialForm);
  const [editStatus, setEditStatus] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const trainings = trainingsQuery.data ?? [];
  const sessions = useMemo(
    () =>
      [...(classSessionsQuery.data ?? [])].sort(
        (firstSession, secondSession) =>
          new Date(firstSession.startsAt).getTime() -
          new Date(secondSession.startsAt).getTime(),
      ),
    [classSessionsQuery.data],
  );

  if (!canManageClasses) {
    return (
      <EmptyState
        title="no tienes acceso a clases"
        description="esta pantalla esta disponible para owners, admins y coaches."
        icon={CalendarClock}
        className="min-h-[420px]"
      />
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("El titulo es obligatorio.");
      return;
    }

    if (!form.startsAt) {
      setFormError("Selecciona fecha y hora de inicio.");
      return;
    }

    const startsAt = toIsoDateTime(form.startsAt);
    const endsAt = form.endsAt
      ? (toIsoDateTime(form.endsAt) ?? undefined)
      : undefined;

    if (!startsAt || (form.endsAt && !endsAt)) {
      setFormError("Revisa la fecha y hora de la clase.");
      return;
    }

    try {
      const createPromise = createClassSession.mutateAsync({
        title: form.title.trim(),
        ...(form.trainingId ? { trainingId: form.trainingId } : {}),
        startsAt,
        endsAt,
        notes: form.notes.trim() || undefined,
      });

      toast.promise(createPromise, {
        loading: "programando clase...",
        success: "clase programada",
        error: "no se pudo programar la clase",
      });

      await createPromise;
      setForm(initialForm);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo programar la clase.",
      );
    }
  };

  const openEditDialog = (session: ClassSession) => {
    setEditingSession(session);
    setEditForm({
      title: session.title,
      trainingId:
        session.classTypeId ??
        session.classType?.id ??
        session.trainingId ??
        session.training?.id ??
        NO_TRAINING_VALUE,
      startsAt: toDateTimeInputValue(session.startsAt),
      endsAt: toDateTimeInputValue(session.endsAt),
      notes: session.notes ?? "",
    });
    setEditStatus(
      session.status ? normalizeStatus(session.status) : "SCHEDULED",
    );
    setEditError(null);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError(null);

    if (!editingSession) {
      return;
    }

    if (!editForm.title.trim()) {
      setEditError("El titulo es obligatorio.");
      return;
    }

    if (!editForm.startsAt) {
      setEditError("Selecciona fecha y hora de inicio.");
      return;
    }

    const trainingId = getUpdateTrainingId(editForm.trainingId);

    if (trainingId && !isUuid(trainingId)) {
      setEditError("Selecciona una clase tipo valida.");
      return;
    }

    const startsAt = toIsoDateTime(editForm.startsAt);
    const endsAt = editForm.endsAt
      ? (toIsoDateTime(editForm.endsAt) ?? undefined)
      : undefined;

    if (!startsAt || (editForm.endsAt && !endsAt)) {
      setEditError("Revisa la fecha y hora de la clase.");
      return;
    }

    try {
      const updatePromise = updateClassSession.mutateAsync({
        classSessionId: editingSession.id,
        input: {
          title: editForm.title.trim(),
          ...(trainingId !== undefined ? { trainingId } : {}),
          startsAt,
          endsAt,
          notes: editForm.notes.trim() || undefined,
          status: normalizeStatus(editStatus),
        },
      });

      toast.promise(updatePromise, {
        loading: "actualizando clase...",
        success: "clase actualizada",
        error: (error) =>
          error instanceof Error
            ? error.message
            : "no se pudo actualizar la clase",
      });

      await updatePromise;
      setEditingSession(null);
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la clase.",
      );
    }
  };

  const handleStatusChange = async (
    classSessionId: string,
    status: ClassSessionStatusCode,
  ) => {
    const statusPromise = updateClassSessionStatus.mutateAsync({
      classSessionId,
      status,
    });

    toast.promise(statusPromise, {
      loading: "actualizando estado...",
      success: "estado actualizado",
      error: "no se pudo actualizar el estado",
    });

    try {
      await statusPromise;
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  const handleEnabledChange = async (
    classSessionId: string,
    isEnabled: boolean,
  ) => {
    const enabledPromise = updateClassSessionEnabled.mutateAsync({
      classSessionId,
      isEnabled,
    });

    toast.promise(enabledPromise, {
      loading: isEnabled ? "habilitando clase..." : "deshabilitando clase...",
      success: isEnabled ? "clase habilitada" : "clase deshabilitada",
      error: "no se pudo actualizar la disponibilidad",
    });

    try {
      await enabledPromise;
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  const handleDelete = async () => {
    if (!sessionToDelete) {
      return;
    }

    const deletePromise = deleteClassSession.mutateAsync(sessionToDelete.id);

    toast.promise(deletePromise, {
      loading: "borrando clase...",
      success: "clase borrada definitivamente",
      error: "no se pudo borrar la clase",
    });

    try {
      await deletePromise;
      setSessionToDelete(null);
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Clases
          </h1>
          <p className="mt-1 text-muted-foreground">
            programa las proximas clases para tus alumnos.
          </p>
        </div>
        <Button asChild size="lg" className="w-full md:w-auto">
          <Link href="#programar-clase">
            <Plus className="h-4 w-4" />
            programar clase
          </Link>
        </Button>
      </section>

      <Dialog
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSession(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl lg:p-7">
          <DialogHeader>
            <DialogTitle>editar clase</DialogTitle>
            <DialogDescription>
              ajusta horario, estructura opcional, notas o estado de la sesion.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-class-title">titulo</Label>
              <Input
                id="edit-class-title"
                value={editForm.title}
                onChange={(event) =>
                  setEditForm({ ...editForm, title: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-class-training">
                usar plantilla/clase tipo opcional
              </Label>
              <Select
                value={editForm.trainingId}
                onValueChange={(trainingId) =>
                  setEditForm({
                    ...editForm,
                    trainingId,
                  })
                }
                disabled={trainingsQuery.isLoading || trainingsQuery.isError}
              >
                <SelectTrigger id="edit-class-training" className="w-full">
                  <SelectValue placeholder="opcional: selecciona una clase tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRAINING_VALUE}>
                    sin estructura todavía
                  </SelectItem>
                  {trainings.map((training) => (
                    <SelectItem key={training.id} value={training.id}>
                      {training.title} -{" "}
                      {Math.round(training.totalDurationSec / 60)} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-class-start">inicio</Label>
                <Input
                  id="edit-class-start"
                  type="datetime-local"
                  value={editForm.startsAt}
                  onChange={(event) =>
                    setEditForm({ ...editForm, startsAt: event.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-class-end">fin opcional</Label>
                <Input
                  id="edit-class-end"
                  type="datetime-local"
                  value={editForm.endsAt}
                  onChange={(event) =>
                    setEditForm({ ...editForm, endsAt: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-class-status">estado</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger id="edit-class-status" className="w-full">
                  <SelectValue placeholder="selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">programada</SelectItem>
                  <SelectItem value="COMPLETED">completada</SelectItem>
                  <SelectItem value="CANCELLED">cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-class-notes">notas opcionales</Label>
              <Textarea
                id="edit-class-notes"
                rows={4}
                className="min-h-28"
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm({ ...editForm, notes: event.target.value })
                }
              />
            </div>

            {editError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="bg-transparent"
                onClick={() => setEditingSession(null)}
              >
                cancelar
              </Button>
              <Button type="submit" disabled={updateClassSession.isPending}>
                {updateClassSession.isPending
                  ? "guardando..."
                  : "guardar cambios"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setSessionToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>borrar clase definitivamente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la clase y sus reservas asociadas. No se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sessionToDelete ? (
            <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
              {sessionToDelete.title}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteClassSession.isPending}>
              cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteClassSession.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              borrar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
        <Card
          id="programar-clase"
          className="border-border/80 bg-card/70 p-5 shadow-md shadow-black/10"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  programar clase
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  crea la clase y añade estructura después si quieres.
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-title">titulo</Label>
              <Input
                id="class-title"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="clase de tecnica"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-training">
                usar plantilla/clase tipo opcional
              </Label>
              <Select
                value={form.trainingId}
                onValueChange={(trainingId) =>
                  setForm({
                    ...form,
                    trainingId: toOptionalTrainingId(trainingId),
                  })
                }
                disabled={trainingsQuery.isLoading || trainingsQuery.isError}
              >
                <SelectTrigger id="class-training" className="w-full">
                  <SelectValue placeholder="opcional: selecciona una clase tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TRAINING_VALUE}>
                    sin estructura todavía
                  </SelectItem>
                  {trainings.map((training) => (
                    <SelectItem key={training.id} value={training.id}>
                      {training.title} -{" "}
                      {Math.round(training.totalDurationSec / 60)} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="class-start">inicio</Label>
                <Input
                  id="class-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) =>
                    setForm({ ...form, startsAt: event.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class-end">fin opcional</Label>
                <Input
                  id="class-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) =>
                    setForm({ ...form, endsAt: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class-notes">notas opcionales</Label>
              <Textarea
                id="class-notes"
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="material, foco de la sesion o aviso para alumnos"
              />
            </div>

            {formError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            {trainingsQuery.error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                no pudimos cargar clases tipo. puedes programar sin plantilla.
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={createClassSession.isPending}
            >
              <CalendarClock className="h-4 w-4" />
              {createClassSession.isPending
                ? "programando..."
                : "programar clase"}
            </Button>
          </form>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              proximas clases
            </h2>
            <p className="text-sm text-muted-foreground">
              {sessions.length} clases programadas
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 bg-card/45 p-3">
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={
                    statusFilter === filter.value ? "default" : "outline"
                  }
                  className={cn(
                    "h-9",
                    statusFilter !== filter.value && "bg-transparent",
                  )}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(180px,240px)_minmax(220px,1fr)]">
              <Select
                value={classTypeFilter}
                onValueChange={setClassTypeFilter}
                disabled={trainingsQuery.isLoading || trainingsQuery.isError}
              >
                <SelectTrigger id="class-type-filter" className="w-full">
                  <SelectValue placeholder="tipo de clase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASS_TYPES_VALUE}>
                    todos los tipos
                  </SelectItem>
                  {trainings.map((training) => (
                    <SelectItem key={training.id} value={training.id}>
                      {training.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="buscar por titulo"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {classSessionsQuery.isLoading && (
            <LoadingState
              title="cargando clases"
              description="estamos leyendo las clases programadas."
              className="min-h-[320px]"
            />
          )}

          {classSessionsQuery.error && (
            <ErrorState
              title="no pudimos cargar las clases"
              description={getClassSessionsErrorMessage(
                classSessionsQuery.error,
              )}
              actionLabel="reintentar"
              onAction={() => void classSessionsQuery.refetch()}
              className="min-h-[320px]"
            />
          )}

          {deleteClassSession.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteClassSession.error.message}
            </p>
          )}

          {updateClassSessionStatus.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {updateClassSessionStatus.error.message}
            </p>
          )}

          {updateClassSessionEnabled.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {updateClassSessionEnabled.error.message}
            </p>
          )}

          {!classSessionsQuery.isLoading &&
            !classSessionsQuery.error &&
            sessions.map((session) => {
              const isUpdatingThisStatus =
                updateClassSessionStatus.isPending &&
                updateClassSessionStatus.variables?.classSessionId ===
                  session.id;
              const isUpdatingThisEnabled =
                updateClassSessionEnabled.isPending &&
                updateClassSessionEnabled.variables?.classSessionId ===
                  session.id;
              const displayState = getDisplayState(session);

              return (
                <ClassSessionCard
                  key={session.id}
                  session={session}
                  isDeleting={
                    deleteClassSession.isPending &&
                    deleteClassSession.variables === session.id
                  }
                  isUpdatingStatus={isUpdatingThisStatus}
                  isUpdatingEnabled={isUpdatingThisEnabled}
                  canEdit={canManageClasses}
                  onEdit={() => openEditDialog(session)}
                  onToggleEnabled={() =>
                    void handleEnabledChange(
                      session.id,
                      displayState === "DISABLED",
                    )
                  }
                  onCancel={() =>
                    void handleStatusChange(session.id, "CANCELLED")
                  }
                  onDelete={() => setSessionToDelete(session)}
                />
              );
            })}

          {!classSessionsQuery.isLoading &&
            !classSessionsQuery.error &&
            sessions.length === 0 && (
              <EmptyState
                title="todavia no hay clases programadas"
                description="programa la primera clase para que los alumnos vean que les espera."
                icon={CalendarClock}
                className="min-h-[320px]"
              />
            )}
        </section>
      </div>
    </div>
  );
}
