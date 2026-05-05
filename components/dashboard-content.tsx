"use client";

import Link from "next/link";
import {
  CalendarClock,
  Clock,
  Dumbbell,
  Layers,
  Plus,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { StudentDashboardContent } from "@/components/student-dashboard-content";
import { useClassSessions } from "@/hooks/use-class-sessions";
import { isViewerOrganization } from "@/lib/organization-role";
import type { ClassSession } from "@/lib/api/class-sessions";

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

function getNextSession(sessions: ClassSession[]) {
  const now = Date.now();

  return [...sessions]
    .filter((session) => new Date(session.startsAt).getTime() >= now)
    .sort(
      (firstSession, secondSession) =>
        new Date(firstSession.startsAt).getTime() -
        new Date(secondSession.startsAt).getTime(),
    )[0];
}

function NextClassCard({ session }: { session: ClassSession }) {
  const dateTime = formatSessionDate(session.startsAt);
  const blockCount = session.training?.blocks?.length ?? 0;

  return (
    <Card className="border-primary/20 bg-card/80 p-5 shadow-md shadow-black/10 md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
              proxima clase
            </span>
            <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
              {session.status ?? "programada"}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              {session.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {session.training?.title ?? "clase tipo pendiente"}
            </p>
          </div>

          {session.notes ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {session.notes}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
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
          <div className="rounded-md border border-border/70 bg-background/45 px-3 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              partes
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {blockCount}
            </p>
          </div>
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
            empieza por programar clases; las clases tipo y las partes quedan
            como apoyo para prepararlas mas rapido.
          </p>
        </div>

        <Button asChild size="lg" className="w-full md:w-auto">
          <Link href="/classes">
            <Plus className="h-4 w-4" />
            crear tu primera clase
          </Link>
        </Button>
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
            description="crea la primera clase para que tus alumnos sepan que entreno les espera."
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
                programa y revisa sesiones.
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-border/80 bg-card/65 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-chart-2/15 text-chart-2">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Clases tipo</h2>
              <p className="text-sm text-muted-foreground">
                prepara estructuras reutilizables.
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
