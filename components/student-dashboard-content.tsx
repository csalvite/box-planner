"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { useAuth } from "@/components/providers/auth-provider";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  useMarkAttendance,
} from "@/hooks/use-class-sessions";
import { useStudentNextSession, useStudentStats } from "@/hooks/use-student";
import type {
  StudentExercise,
  StudentNextSession,
  StudentSessionBlock,
} from "@/lib/api/student";
import { cn } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  WARM_UP: "bg-chart-2/15 text-chart-2",
  TECHNIQUE: "bg-primary/15 text-primary",
  CARDIO: "bg-chart-5/15 text-chart-5",
  STRENGTH: "bg-chart-4/15 text-chart-4",
  COOL_DOWN: "bg-chart-3/15 text-chart-3",
  SPARRING: "bg-destructive/15 text-destructive",
};

function formatMinutes(totalDurationSec?: number | null) {
  return Math.round((totalDurationSec ?? 0) / 60);
}

function getSessionDate(session: StudentNextSession) {
  return (
    session.startsAt ??
    session.startAt ??
    session.scheduledAt ??
    session.date ??
    null
  );
}

function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return {
      day: "fecha pendiente",
      time: "hora pendiente",
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
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date),
    time: new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function getTrainingTitle(session: StudentNextSession) {
  return (
    session.training?.title ??
    session.training?.name ??
    session.title ??
    "clase"
  );
}

function getTrainingDuration(session: StudentNextSession) {
  return session.training?.totalDurationSec ?? 0;
}

function getAttendanceCount(session: StudentNextSession) {
  return (
    session.attendanceCount ??
    session.attendeesCount ??
    session.attendancesCount ??
    session._count?.attendances ??
    session._count?.attendees ??
    0
  );
}

function isStudentAttending(session: StudentNextSession) {
  return Boolean(
    session.hasCurrentUserAttendance ?? session.isAttending ?? session.attending,
  );
}

function getOrderedBlocks(session: StudentNextSession) {
  return [
    ...(session.training?.blocks ??
      session.training?.trainingBlocks ??
      session.blocks ??
      []),
  ].sort(
    (firstBlock, secondBlock) =>
      (firstBlock.orderIndex ?? 0) - (secondBlock.orderIndex ?? 0),
  );
}

function getBlockTitle(block: StudentSessionBlock) {
  return block.block?.name ?? "parte";
}

function getBlockDescription(block: StudentSessionBlock) {
  return block.notes ?? block.block?.description ?? "sin notas";
}

function getBlockCategory(block: StudentSessionBlock) {
  const rawCategory =
    block.block?.category?.key ?? block.block?.category?.name ?? null;

  return rawCategory ? rawCategory.toUpperCase() : "BLOQUE";
}

function getBlockDuration(block: StudentSessionBlock) {
  return formatMinutes(
    block.customDurationSec ?? block.block?.estimatedDurationSec ?? 0,
  );
}

function ExerciseList({ exercises }: { exercises?: StudentExercise[] }) {
  if (!exercises || exercises.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/70 bg-background/35 px-3 py-3 text-xs text-muted-foreground">
        ejercicios pendientes de publicar
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {exercises.map((exercise) => (
        <li
          key={exercise.id}
          className="rounded-md border border-border/60 bg-background/45 px-3 py-2"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {exercise.name}
              </p>
              {exercise.notes ?? exercise.description ? (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {exercise.notes ?? exercise.description}
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
      ))}
    </ul>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="border-border/80 bg-card/70 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function SessionBlockCard({
  block,
  index,
}: {
  block: StudentSessionBlock;
  index: number;
}) {
  const category = getBlockCategory(block);

  return (
    <article className="rounded-lg border border-border/80 bg-card/60 p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-3 sm:flex-col">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
            {index + 1}
          </span>
          <span className="hidden h-full min-h-10 w-px bg-border/70 sm:block" />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {getBlockTitle(block)}
                </h3>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-white/10",
                    categoryColors[category] ?? "bg-secondary/70 text-secondary-foreground",
                  )}
                >
                  {category.toLowerCase().replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {getBlockDescription(block)}
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-primary">
              <Clock className="h-4 w-4" />
              <span className="text-base font-semibold">
                {getBlockDuration(block)}
              </span>
              <span className="text-xs font-medium">min</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5" />
              ejercicios
            </div>
            <ExerciseList exercises={block.block?.exercises} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function StudentDashboardContent() {
  const { user } = useAuth();
  const { activeOrganizationId } = useActiveOrganization();
  const nextSessionQuery = useStudentNextSession(activeOrganizationId);
  const statsQuery = useStudentStats(activeOrganizationId);
  const markAttendance = useMarkAttendance(activeOrganizationId);
  const session = nextSessionQuery.data ?? null;
  const stats = statsQuery.data;
  const displayName =
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email ??
    "alumno";

  useEffect(() => {
    if (nextSessionQuery.error) {
      toast.error("no pudimos cargar tu proxima clase");
    }
  }, [nextSessionQuery.error]);

  useEffect(() => {
    if (statsQuery.error) {
      toast.error("no pudimos cargar tus estadisticas");
    }
  }, [statsQuery.error]);

  if (nextSessionQuery.isLoading || statsQuery.isLoading) {
    return (
      <LoadingState
        title="cargando tu inicio"
        description="estamos preparando tu proxima clase."
        className="min-h-[420px]"
      />
    );
  }

  if (nextSessionQuery.error) {
    return (
      <ErrorState
        title="no pudimos cargar tu proxima clase"
        description={nextSessionQuery.error.message}
        actionLabel="reintentar"
        onAction={() => void nextSessionQuery.refetch()}
        className="min-h-[420px]"
      />
    );
  }

  const dateTime = session ? formatDateTime(getSessionDate(session)) : null;
  const blocks = session ? getOrderedBlocks(session) : [];
  const attendanceCount = session ? getAttendanceCount(session) : 0;
  const attending = session ? isStudentAttending(session) : false;
  const hasTraining = Boolean(session?.training);

  const handleMarkAttendance = async () => {
    if (!session?.id) {
      toast.error("no pudimos identificar la clase");
      return;
    }

    const markPromise = markAttendance.mutateAsync(session.id);

    toast.promise(markPromise, {
      loading: "confirmando asistencia...",
      success: "asistencia confirmada",
      error: "no se pudo confirmar asistencia",
    });

    try {
      await markPromise;
      await nextSessionQuery.refetch();
      await statsQuery.refetch();
    } catch {
      // react query keeps the detailed error for the button state
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-2">
        <p className="text-sm font-medium text-primary">inicio de alumno</p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          hola, {displayName}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-lg">
          aqui tienes lo que viene en tu proxima clase y un resumen rapido de tu
          asistencia.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          icon={Flame}
          label="racha de asistencia"
          value={`${stats?.attendanceStreak ?? 0} clases`}
        />
        <StatCard
          icon={Trophy}
          label="total asistencias"
          value={stats?.totalAttendances ?? 0}
        />
      </div>

      {statsQuery.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          no pudimos cargar tus estadisticas.{" "}
          <button
            type="button"
            className="font-medium underline underline-offset-4"
            onClick={() => void statsQuery.refetch()}
          >
            reintentar
          </button>
        </div>
      )}

      {!session && (
        <EmptyState
          title="todavia no tienes proxima clase"
          description="cuando tu entrenador programe una clase, aparecera aqui con sus partes y ejercicios."
          icon={CalendarClock}
          className="min-h-[360px]"
        />
      )}

      {session && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <section className="space-y-4">
            <Card className="border-primary/25 bg-card/75 p-5 shadow-md shadow-black/15 md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
                      proxima clase
                    </span>
                    <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
                      {blocks.length} partes
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                      {getTrainingTitle(session)}
                    </h2>
                    {session.training?.notes ?? session.training?.description ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {session.training.notes ?? session.training.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:min-w-64">
                  <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      dia
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {dateTime?.day}
                    </p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      hora
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {dateTime?.time}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-3 text-primary">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      duracion
                    </div>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMinutes(getTrainingDuration(session))} min
                    </p>
                  </div>
                  <div className="col-span-2 rounded-md border border-border/70 bg-background/45 px-3 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5" />
                      asistentes
                    </div>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {attendanceCount}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  estructura de la clase
                </h2>
                <p className="text-sm text-muted-foreground">
                  sigue las partes en orden de arriba abajo.
                </p>
              </div>

              {blocks.length > 0 ? (
                blocks.map((block, index) => (
                  <SessionBlockCard key={block.id} block={block} index={index} />
                ))
              ) : (
                <EmptyState
                  title="la estructura aun no esta publicada"
                  description={
                    hasTraining
                      ? "tu entrenador todavia no anadio partes a esta clase"
                      : "tu entrenador todavía no añadió la estructura"
                  }
                  icon={Layers}
                  className="min-h-[260px]"
                />
              )}
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-4">
            <Card className="border-primary/25 bg-card/70 p-5">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    asistencia
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {attending
                      ? "asistencia confirmada"
                      : "confirma si vas a venir a esta clase."}
                  </p>
                </div>

                {attending ? (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled
                  >
                    asistencia confirmada
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={() => void handleMarkAttendance()}
                    disabled={markAttendance.isPending || !session.id}
                  >
                    {markAttendance.isPending
                      ? "confirmando..."
                      : "confirmar asistencia"}
                  </Button>
                )}
              </div>
            </Card>

            <Card className="border-border/80 bg-background/45 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    preparado para entrenar
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    revisa las partes antes de llegar y guarda energia para las
                    partes principales de la sesion.
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
