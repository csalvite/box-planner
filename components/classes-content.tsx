"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  Dumbbell,
  FileText,
  Plus,
  Power,
  Search,
  Trash2,
  UsersRound,
  XCircle,
} from "lucide-react";
import { ClassSessionEditor } from "@/components/class-session-editor";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  useClassSessions,
  useCreateClassSession,
  useDeleteClassSession,
  useUpdateClassSession,
  useUpdateClassSessionEnabled,
  useUpdateClassSessionFullPlan,
  useUpdateClassSessionStatus,
} from "@/hooks/use-class-sessions";
import type {
  ClassSession,
  ClassSessionFullPlanInput,
  ClassSessionStatusCode,
} from "@/lib/api/class-sessions";
import { isStaffOrganization } from "@/lib/organization-role";
import { cn } from "@/lib/utils";

interface ClassSessionFormState {
  title: string;
  startsAt: string;
  endsAt: string;
  targetDurationMinutes: string;
  notes: string;
}

interface DefaultSchedule {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  label: string;
}

const initialForm: ClassSessionFormState = {
  title: "",
  startsAt: "",
  endsAt: "",
  targetDurationMinutes: "",
  notes: "",
};

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

const weekdayOptions = [
  { value: 1, label: "lunes" },
  { value: 2, label: "martes" },
  { value: 3, label: "miercoles" },
  { value: 4, label: "jueves" },
  { value: 5, label: "viernes" },
  { value: 6, label: "sabado" },
  { value: 0, label: "domingo" },
];

const initialDefaultSchedules: DefaultSchedule[] = [
  {
    id: "default-tuesday",
    weekday: 2,
    startTime: "21:00",
    endTime: "22:00",
    label: "martes noche",
  },
  {
    id: "default-thursday",
    weekday: 4,
    startTime: "21:00",
    endTime: "22:00",
    label: "jueves noche",
  },
  {
    id: "default-friday",
    weekday: 5,
    startTime: "21:15",
    endTime: "22:15",
    label: "viernes noche",
  },
];

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

  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
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

function getClassStructureSummary(session: ClassSession) {
  const sections = session.sections ?? [];
  const exerciseCount = sections.reduce(
    (total, section) => total + (section.exercises?.length ?? 0),
    0,
  );
  const estimatedMinutes = getEstimatedDuration(session);

  return {
    sectionCount: sections.length,
    exerciseCount,
    estimatedMinutes,
  };
}

function getSessionTime(session: ClassSession) {
  if (!session.startsAt) {
    return null;
  }

  const date = new Date(session.startsAt);

  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function getNextScheduledSession(sessions: ClassSession[]) {
  const now = Date.now();

  return [...sessions]
    .map((session) => ({
      session,
      startsAtTime: getSessionTime(session),
    }))
    .filter(
      ({ session, startsAtTime }) =>
        startsAtTime !== null &&
        startsAtTime >= now &&
        getDisplayState(session) !== "CANCELLED",
    )
    .sort(
      (firstSession, secondSession) =>
        (firstSession.startsAtTime ?? 0) - (secondSession.startsAtTime ?? 0),
    )[0]?.session;
}

function sortClassSessionsForList(
  sessions: ClassSession[],
  nextSessionId?: string,
  statusFilter?: ClassSessionListFilter,
) {
  return [...sessions].sort((firstSession, secondSession) => {
    if (firstSession.id === nextSessionId) {
      return -1;
    }

    if (secondSession.id === nextSessionId) {
      return 1;
    }

    const firstTime = getSessionTime(firstSession);
    const secondTime = getSessionTime(secondSession);

    if (statusFilter !== "cancelled") {
      if (firstTime === null && secondTime !== null) {
        return 1;
      }

      if (firstTime !== null && secondTime === null) {
        return -1;
      }
    }

    if (firstTime === null && secondTime === null) {
      return firstSession.title.localeCompare(secondSession.title);
    }

    if (firstTime === null) {
      return -1;
    }

    if (secondTime === null) {
      return 1;
    }

    return firstTime - secondTime;
  });
}

function formatSessionDate(value?: string | Date | null) {
  if (!value) {
    return {
      day: "sin programar",
      time: "borrador",
    };
  }

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
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
) {
  if (!startsAt || !endsAt) {
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

function createScheduleId() {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getWeekdayLabel(weekday: number) {
  return (
    weekdayOptions.find((option) => option.value === weekday)?.label ??
    "horario"
  );
}

function getNextDateForSchedule(schedule: DefaultSchedule) {
  const now = new Date();
  const [startHour, startMinute] = schedule.startTime.split(":").map(Number);
  const nextDate = new Date(now);
  nextDate.setHours(startHour ?? 0, startMinute ?? 0, 0, 0);

  let daysUntil = schedule.weekday - now.getDay();

  if (daysUntil < 0 || (daysUntil === 0 && nextDate <= now)) {
    daysUntil += 7;
  }

  nextDate.setDate(now.getDate() + daysUntil);

  return nextDate;
}

function getScheduleEndDate(startDate: Date, schedule: DefaultSchedule) {
  const [endHour, endMinute] = schedule.endTime.split(":").map(Number);
  const endDate = new Date(startDate);
  endDate.setHours(endHour ?? 0, endMinute ?? 0, 0, 0);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return endDate;
}

function ClassSessionCard({
  session,
  isDeleting,
  isUpdatingStatus,
  isUpdatingEnabled,
  canEdit,
  isNextSession,
  onEdit,
  onSchedule,
  onToggleEnabled,
  onCancel,
  onDelete,
}: {
  session: ClassSession;
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  isUpdatingEnabled: boolean;
  canEdit: boolean;
  isNextSession: boolean;
  onEdit: () => void;
  onSchedule: () => void;
  onToggleEnabled: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const dateTime = formatSessionDate(session.startsAt);
  const displayState = getDisplayState(session);
  const duration = formatDuration(session.startsAt, session.endsAt);
  const estimatedDuration = getEstimatedDuration(session);
  const isUnscheduled = !getSessionTime(session);
  const isMuted = displayState === "DISABLED" || displayState === "CANCELLED";
  const structureSummary = getClassStructureSummary(session);
  const toggleStatusLabel =
    displayState === "DISABLED" ? "habilitar" : "deshabilitar";

  return (
    <Card
      className={cn(
        "border-border/80 bg-card/70 p-4 shadow-md shadow-black/15 transition md:p-5",
        isNextSession &&
          "border-primary/55 bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/25",
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
            {isNextSession ? (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/25">
                proxima clase
              </span>
            ) : null}
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
              {dateTime.day}
            </span>
            {isUnscheduled ? (
              <span className="rounded-full bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/80">
                borrador
              </span>
            ) : null}
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
              ) : estimatedDuration ? (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  {estimatedDuration} min estimados
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <UsersRound className="h-4 w-4" />
                {getAttendanceCount(session)} apuntados
              </span>
            </div>
            {isNextSession ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
                  {structureSummary.sectionCount} secciones
                </span>
                <span className="rounded-md border border-border/70 bg-background/45 px-2.5 py-1">
                  {structureSummary.exerciseCount} ejercicios
                </span>
                <span className="rounded-md border border-border/70 bg-background/45 px-2.5 py-1">
                  {structureSummary.estimatedMinutes} min
                </span>
              </div>
            ) : null}
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
              variant={isUnscheduled ? "default" : "outline"}
              className={cn("w-full", !isUnscheduled && "bg-transparent")}
              onClick={onSchedule}
            >
              <CalendarClock className="h-4 w-4" />
              {isUnscheduled ? "programar proxima" : "programar"}
            </Button>
            <Button type="button" className="w-full" onClick={onEdit}>
              <Dumbbell className="h-4 w-4" />
              preparar clase
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
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    }),
    [debouncedSearchTerm, statusFilter],
  );
  const classSessionsQuery = useClassSessions(
    classesOrganizationId,
    classSessionFilters,
  );
  const createClassSession = useCreateClassSession(classesOrganizationId);
  const updateClassSession = useUpdateClassSession(classesOrganizationId);
  const updateClassSessionFullPlan =
    useUpdateClassSessionFullPlan(classesOrganizationId);
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
  const [scheduleSession, setScheduleSession] = useState<ClassSession | null>(
    null,
  );
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [defaultSchedules, setDefaultSchedules] = useState<DefaultSchedule[]>(
    initialDefaultSchedules,
  );
  const [scheduleForm, setScheduleForm] = useState({
    weekday: "2",
    startTime: "21:00",
    endTime: "22:00",
    label: "",
  });

  useEffect(() => {
    const storedSchedules = window.localStorage.getItem(
      "boxplanner-default-class-schedules",
    );

    if (!storedSchedules) {
      return;
    }

    try {
      const parsedSchedules = JSON.parse(storedSchedules) as DefaultSchedule[];
      if (Array.isArray(parsedSchedules)) {
        setDefaultSchedules(parsedSchedules);
      }
    } catch {
      // keep defaults when local storage contains old or invalid data
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "boxplanner-default-class-schedules",
      JSON.stringify(defaultSchedules),
    );
  }, [defaultSchedules]);

  const nextScheduledSession = useMemo(
    () => getNextScheduledSession(classSessionsQuery.data ?? []),
    [classSessionsQuery.data],
  );
  const sessions = useMemo(
    () =>
      sortClassSessionsForList(
        classSessionsQuery.data ?? [],
        nextScheduledSession?.id,
        statusFilter,
      ),
    [classSessionsQuery.data, nextScheduledSession?.id, statusFilter],
  );
  const currentEditingSession = editingSession
    ? (sessions.find((session) => session.id === editingSession.id) ??
      editingSession)
    : null;

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

    const startsAt = form.startsAt ? toIsoDateTime(form.startsAt) : undefined;
    const endsAt = form.endsAt
      ? (toIsoDateTime(form.endsAt) ?? undefined)
      : form.startsAt
        ? addMinutesToIsoDateTime(form.startsAt, form.targetDurationMinutes)
        : undefined;
    const targetDurationMinutes = optionalNumber(form.targetDurationMinutes);

    if ((form.startsAt && !startsAt) || (form.endsAt && !endsAt)) {
      setFormError("Revisa la fecha y hora de la clase.");
      return;
    }

    if (form.endsAt && !form.startsAt) {
      setFormError("Para indicar fin, selecciona tambien un inicio.");
      return;
    }

    try {
      const createPromise = createClassSession.mutateAsync({
        title: form.title.trim(),
        startsAt: startsAt ?? null,
        endsAt: endsAt ?? null,
        targetDurationMinutes,
        notes: form.notes.trim() || undefined,
      });

      toast.promise(createPromise, {
        loading: "creando clase...",
        success: "clase creada",
        error: "no se pudo crear la clase",
      });

      const createdSession = await createPromise;
      setForm(initialForm);
      setEditingSession(createdSession);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "No se pudo crear la clase.",
      );
    }
  };

  const handleEditorSave = async (
    classSessionId: string,
    input: ClassSessionFullPlanInput,
  ) => {
    return updateClassSessionFullPlan.mutateAsync({
      classSessionId,
      input,
    });
  };

  const handleApplySchedule = async (schedule: DefaultSchedule) => {
    if (!scheduleSession) {
      return;
    }

    const startsAt = getNextDateForSchedule(schedule);
    const endsAt = getScheduleEndDate(startsAt, schedule);
    const updatePromise = updateClassSession.mutateAsync({
      classSessionId: scheduleSession.id,
      input: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
    });

    toast.promise(updatePromise, {
      loading: "programando clase...",
      success: "clase programada",
      error: "no se pudo programar la clase",
    });

    try {
      await updatePromise;
      setScheduleSession(null);
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  const handleAddDefaultSchedule = () => {
    const weekday = Number.parseInt(scheduleForm.weekday, 10);

    if (
      !Number.isFinite(weekday) ||
      !scheduleForm.startTime ||
      !scheduleForm.endTime
    ) {
      return;
    }

    setDefaultSchedules((currentSchedules) => [
      ...currentSchedules,
      {
        id: createScheduleId(),
        weekday,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        label:
          scheduleForm.label.trim() ||
          `${getWeekdayLabel(weekday)} ${scheduleForm.startTime}`,
      },
    ]);
    setScheduleForm({
      weekday: "2",
      startTime: "21:00",
      endTime: "22:00",
      label: "",
    });
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
            crea clases reales con secciones y ejercicios desde la biblioteca.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full md:w-auto"
          onClick={() =>
            document
              .getElementById("crear-clase")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <Plus className="h-4 w-4" />
          crear nueva clase
        </Button>
      </section>

      <ClassSessionEditor
        open={Boolean(currentEditingSession)}
        organizationId={classesOrganizationId}
        session={currentEditingSession}
        isSaving={updateClassSessionFullPlan.isPending}
        saveError={updateClassSessionFullPlan.error}
        onSaveFullPlan={handleEditorSave}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSession(null);
          }
        }}
      />

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
              Esta accion eliminara la clase y sus reservas asociadas. No se
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

      <Dialog
        open={Boolean(scheduleSession)}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleSession(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl lg:p-7">
          <DialogHeader>
            <DialogTitle>programar clase</DialogTitle>
            <DialogDescription>
              usa un horario habitual para colocar la proxima sesion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {scheduleSession ? (
              <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
                {scheduleSession.title}
              </div>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                horarios habituales
              </h3>
              <div className="grid gap-2">
                {defaultSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex flex-col gap-2 rounded-md border border-border/70 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {schedule.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getWeekdayLabel(schedule.weekday)} {schedule.startTime}{" "}
                        - {schedule.endTime}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => void handleApplySchedule(schedule)}
                        disabled={updateClassSession.isPending}
                      >
                        usar horario
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent text-destructive hover:text-destructive"
                        onClick={() =>
                          setDefaultSchedules((currentSchedules) =>
                            currentSchedules.filter(
                              (currentSchedule) =>
                                currentSchedule.id !== schedule.id,
                            ),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-md border border-border/70 bg-background/45 p-4">
              <h3 className="text-sm font-semibold text-foreground">
                nuevo horario habitual
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>dia</Label>
                  <Select
                    value={scheduleForm.weekday}
                    onValueChange={(weekday) =>
                      setScheduleForm({ ...scheduleForm, weekday })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekdayOptions.map((weekday) => (
                        <SelectItem
                          key={weekday.value}
                          value={String(weekday.value)}
                        >
                          {weekday.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>label</Label>
                  <Input
                    value={scheduleForm.label}
                    onChange={(event) =>
                      setScheduleForm({
                        ...scheduleForm,
                        label: event.target.value,
                      })
                    }
                    placeholder="martes noche"
                  />
                </div>
                <div className="space-y-2">
                  <Label>hora inicio</Label>
                  <Input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(event) =>
                      setScheduleForm({
                        ...scheduleForm,
                        startTime: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>hora fin</Label>
                  <Input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(event) =>
                      setScheduleForm({
                        ...scheduleForm,
                        endTime: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddDefaultSchedule}>
                <Plus className="h-4 w-4" />
                anadir horario
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
        <Card
          id="crear-clase"
          className="border-border/80 bg-card/70 p-5 shadow-md shadow-black/10"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  crear nueva clase
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  guarda una clase reutilizable y programala ahora solo si lo
                  necesitas.
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="class-start">inicio opcional</Label>
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

              <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                <Label htmlFor="class-duration">duracion objetivo min.</Label>
                <Input
                  id="class-duration"
                  type="number"
                  min="1"
                  value={form.targetDurationMinutes}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      targetDurationMinutes: event.target.value,
                    })
                  }
                  placeholder="60"
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

            {formError ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={createClassSession.isPending}
            >
              <CalendarClock className="h-4 w-4" />
              {createClassSession.isPending ? "creando..." : "crear clase"}
            </Button>
          </form>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">clases</h2>
            <p className="text-sm text-muted-foreground">
              {sessions.length} clases entre borradores y programadas
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

          {classSessionsQuery.isLoading ? (
            <LoadingState
              title="cargando clases"
              description="estamos leyendo borradores y clases programadas."
              className="min-h-[320px]"
            />
          ) : null}

          {classSessionsQuery.error ? (
            <ErrorState
              title="no pudimos cargar las clases"
              description={getClassSessionsErrorMessage(
                classSessionsQuery.error,
              )}
              actionLabel="reintentar"
              onAction={() => void classSessionsQuery.refetch()}
              className="min-h-[320px]"
            />
          ) : null}

          {deleteClassSession.error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteClassSession.error.message}
            </p>
          ) : null}

          {updateClassSessionStatus.error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {updateClassSessionStatus.error.message}
            </p>
          ) : null}

          {updateClassSessionEnabled.error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {updateClassSessionEnabled.error.message}
            </p>
          ) : null}

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
                  isNextSession={session.id === nextScheduledSession?.id}
                  onEdit={() => setEditingSession(session)}
                  onSchedule={() => setScheduleSession(session)}
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
                title="todavia no hay clases"
                description="crea la primera clase y preparala con secciones y ejercicios."
                icon={CalendarClock}
                className="min-h-[320px]"
              />
            )}
        </section>
      </div>
    </div>
  );
}
