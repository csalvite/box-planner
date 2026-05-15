"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/data-state";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { StudentDashboardContent } from "@/components/student-dashboard-content";
import { useClassSessions } from "@/hooks/use-class-sessions";
import { isViewerOrganization } from "@/lib/organization-role";
import type {
  ClassSession,
  ClassSessionSection,
} from "@/lib/api/class-sessions";

function formatSessionDate(value?: string | Date | null) {
  if (!value) {
    return {
      day: "sin programar",
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

function formatMinutes(totalDurationSec?: number | null) {
  return Math.round((totalDurationSec ?? 0) / 60);
}

function getSectionDurationMinutes(section: ClassSessionSection) {
  return (
    section.estimatedDurationMinutes ??
    section.durationMinutes ??
    (section.durationSec ? Math.round(section.durationSec / 60) : null)
  );
}

function getSectionExerciseMinutes(section: ClassSessionSection) {
  const totalSec = (section.exercises ?? []).reduce(
    (total, exercise) => total + (exercise.durationSec ?? 0),
    0,
  );

  return Math.round(totalSec / 60);
}

function getSessionStructureSummary(session: ClassSession) {
  const sections = session.sections ?? [];
  const exerciseCount = sections.reduce(
    (total, section) => total + (section.exercises?.length ?? 0),
    0,
  );
  const totalMinutes = sections.reduce(
    (total, section) => total + getSectionExerciseMinutes(section),
    0,
  );

  return {
    sectionCount: sections.length,
    exerciseCount,
    totalMinutes,
  };
}

function getNextSession(sessions: ClassSession[]) {
  const now = Date.now();

  return [...sessions]
    .map((session) => ({
      session,
      startsAtTime: session.startsAt
        ? new Date(session.startsAt).getTime()
        : Number.NaN,
    }))
    .filter(
      ({ startsAtTime }) =>
        Number.isFinite(startsAtTime) && startsAtTime >= now,
    )
    .sort(
      (firstSession, secondSession) =>
        firstSession.startsAtTime - secondSession.startsAtTime,
    )[0]?.session;
}

function NextClassCard({ session }: { session: ClassSession }) {
  const dateTime = formatSessionDate(session.startsAt);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const sections = session.sections ?? [];
  const summary = getSessionStructureSummary(session);

  return (
    <Card className="border-primary/20 bg-card/80 p-5 shadow-md shadow-black/10 md:p-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
                proxima clase
              </span>
              <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
                {session.status ?? "programada"}
              </span>
              <span className="rounded-full bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/70">
                {summary.sectionCount} secciones / {summary.exerciseCount}{" "}
                ejercicios / {summary.totalMinutes} min
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                {session.title}
              </h2>
            </div>

            {session.notes ? (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {session.notes}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-md border border-border/70 bg-background/45 px-3 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                dia
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {dateTime.day}
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-background/45 px-3 py-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                hora
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {dateTime.time}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/70 bg-background/35">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
            onClick={() => setIsStructureOpen((current) => !current)}
          >
            <span className="text-sm font-medium text-foreground">
              {isStructureOpen ? "Ocultar estructura" : "Ver estructura"}
            </span>
            {isStructureOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {isStructureOpen ? (
            <div className="max-h-[360px] space-y-3 overflow-y-auto border-t border-border/70 p-3">
              {sections.length > 0 ? (
                sections.map((section) => {
                  const durationMinutes = getSectionDurationMinutes(section);
                  const exercises = section.exercises ?? [];

                  return (
                    <article
                      key={section.id}
                      className="rounded-md border border-border/60 bg-card/45 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <h3 className="font-semibold text-foreground">
                          {section.name}
                        </h3>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">
                          {durationMinutes !== null
                            ? `${durationMinutes} min`
                            : "sin duracion"}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">
                          {exercises.length} ejercicios
                        </span>
                      </div>
                      {exercises.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {exercises.slice(0, 4).map((exercise) => (
                            <li key={exercise.id} className="truncate">
                              - {exercise.name}
                            </li>
                          ))}
                          {exercises.length > 4 ? (
                            <li>+ {exercises.length - 4} mas</li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          sin ejercicios todavia
                        </p>
                      )}
                    </article>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-border/70 bg-background/35 px-3 py-3 text-sm text-muted-foreground">
                  Todavia no has preparado la estructura de esta clase.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function DashboardContent() {
  const { activeOrganization, activeOrganizationId, loading } =
    useActiveOrganization();
  const classSessionsQuery = useClassSessions(activeOrganizationId);

  if (loading || !activeOrganization) {
    return (
      <LoadingState
        title="cargando inicio"
        description="estamos preparando tu organizacion activa."
        className="min-h-[420px]"
      />
    );
  }

  if (isViewerOrganization(activeOrganization)) {
    return <StudentDashboardContent />;
  }

  const nextSession = getNextSession(classSessionsQuery.data ?? []);

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">panel coach</p>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Tu proxima clase
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-lg">
            prepara la clase de manana en pocos pasos: crea la clase, anade
            secciones y suma ejercicios desde tu biblioteca.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:w-auto">
          <Button asChild size="lg" className="w-full">
            <Link href="/classes">
              <Plus className="h-4 w-4" />
              crear clase
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full bg-transparent"
          >
            <Link href="/exercises">
              <Activity className="h-4 w-4" />
              crear ejercicio
            </Link>
          </Button>
        </div>
      </section>

      {classSessionsQuery.isLoading && (
        <LoadingState
          title="cargando clases"
          description="estamos buscando tu proxima sesion programada."
          className="min-h-[320px]"
        />
      )}

      {classSessionsQuery.error && (
        <ErrorState
          title="no pudimos cargar tus clases"
          description={classSessionsQuery.error.message}
          actionLabel="reintentar"
          onAction={() => void classSessionsQuery.refetch()}
          className="min-h-[320px]"
        />
      )}

      {!classSessionsQuery.isLoading &&
        !classSessionsQuery.error &&
        nextSession && <NextClassCard session={nextSession} />}

      {!classSessionsQuery.isLoading &&
        !classSessionsQuery.error &&
        !nextSession && (
          <EmptyState
            title="todavia no hay clases programadas"
            description="crea la primera clase y preparala con secciones y ejercicios."
            icon={CalendarClock}
            actionLabel="crear tu primera clase"
            onAction={() => {
              window.location.href = "/classes";
            }}
            className="min-h-[360px]"
          />
        )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/80 bg-card/65 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Clases</h2>
              <p className="text-sm text-muted-foreground">
                crea y prepara sesiones reales.
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-border/80 bg-card/65 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/15 text-chart-2">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Ejercicios</h2>
              <p className="text-sm text-muted-foreground">
                crea ejercicios reutilizables.
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-border/80 bg-card/65 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-5/15 text-chart-5">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Alumnos</h2>
              <p className="text-sm text-muted-foreground">
                invita miembros a tu organizacion.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
