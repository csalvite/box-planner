"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Blocks,
  Clock,
  Dumbbell,
  Layers,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrainingForm } from "@/components/training-form";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useDeleteTraining, useTrainings } from "@/hooks/use-trainings";
import type { ApiTraining } from "@/lib/api/trainings";
import { isStaffOrganization } from "@/lib/organization-role";

function formatMinutes(totalDurationSec: number) {
  return Math.round(totalDurationSec / 60);
}

function formatTrainingType(trainingType: ApiTraining["trainingType"]) {
  return String(trainingType).toLowerCase() === "group" ? "grupo" : "personal";
}

function formatLevel(level?: string | null) {
  if (!level) {
    return "sin nivel";
  }

  const normalizedLevel = level.toLowerCase();

  if (normalizedLevel === "beginner") {
    return "inicial";
  }

  if (normalizedLevel === "advanced") {
    return "avanzado";
  }

  return "intermedio";
}

export function TrainingsContent() {
  const { t } = useAppTranslation();
  const { activeOrganization, activeOrganizationId } = useActiveOrganization();
  const canManageTrainings = isStaffOrganization(activeOrganization);
  const trainingsOrganizationId = canManageTrainings ? activeOrganizationId : null;
  const trainingsQuery = useTrainings(trainingsOrganizationId);
  const deleteTraining = useDeleteTraining(trainingsOrganizationId);
  const trainings = trainingsQuery.data ?? [];
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleDeleteTraining = async (trainingId: string) => {
    const deletePromise = deleteTraining.mutateAsync(trainingId);

    toast.promise(deletePromise, {
      loading: "borrando clase tipo...",
      success: "clase tipo borrada",
      error: "no se pudo borrar la clase tipo",
    });

    try {
      await deletePromise;
    } catch {
      // react query keeps the detailed error for the inline state
    }
  };

  if (!canManageTrainings) {
    return (
      <EmptyState
        title="no tienes acceso a clases tipo"
        description="esta pantalla esta disponible para owners, admins y coaches."
        icon={Dumbbell}
        className="min-h-[420px]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t("trainings.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t("trainings.subtitle")}
          </p>
        </div>

        <AnimatedButton
          size="lg"
          className="gap-2"
          onClick={() => setIsCreateOpen(true)}
          disabled={!activeOrganizationId}
        >
          <Plus className="h-5 w-5" />
          {t("trainings.newTraining")}
        </AnimatedButton>
      </motion.div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("dashboard.newTrainingTitle")}</DialogTitle>
            <DialogDescription>
              define la clase tipo y anade partes en el orden de trabajo.
            </DialogDescription>
          </DialogHeader>
          <TrainingForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {!activeOrganizationId && (
        <EmptyState
          title="selecciona una organizacion"
          description="necesitas una organizacion activa para gestionar clases tipo."
          icon={Dumbbell}
        />
      )}

      {activeOrganizationId && trainingsQuery.isLoading && (
        <LoadingState
          title="cargando clases tipo"
          description="estamos leyendo las plantillas guardadas en la organizacion."
        />
      )}

      {activeOrganizationId && trainingsQuery.error && (
        <ErrorState
          title="no pudimos cargar las clases tipo"
          description={trainingsQuery.error.message}
          actionLabel="reintentar"
          onAction={() => void trainingsQuery.refetch()}
        />
      )}

      {activeOrganizationId &&
        !trainingsQuery.isLoading &&
        !trainingsQuery.error && (
          <>
            <div className="rounded-lg border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
              una clase tipo combina partes en orden. Usala como plantilla para
              programar clases reales.
            </div>

            {deleteTraining.error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteTraining.error.message}
              </p>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              {trainings.map((training) => {
                const blockCount = training.blocks?.length ?? 0;

                return (
                  <AnimatedCard
                    key={training.id}
                    className="h-full border-border/80 bg-card/70 p-5 shadow-md shadow-black/15"
                  >
                    <div className="flex h-full flex-col gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
                              {formatTrainingType(training.trainingType)}
                            </span>
                            <span className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-white/10">
                              {formatLevel(training.level)}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-semibold leading-tight text-foreground">
                            {training.title}
                          </h3>
                          <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground line-clamp-2">
                            {training.notes ??
                              training.description ??
                              "sin notas"}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={
                            deleteTraining.isPending &&
                            deleteTraining.variables === training.id
                          }
                          onClick={() =>
                            void handleDeleteTraining(training.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            duracion
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {formatMinutes(training.totalDurationSec)} min
                          </p>
                        </div>
                        <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                            partes
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {blockCount}
                          </p>
                        </div>
                        <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            tipo
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {formatTrainingType(training.trainingType)}
                          </p>
                        </div>
                      </div>

                      <Button
                        asChild
                        className="mt-auto w-full"
                      >
                        <Link href={`/trainings/${training.id}`}>
                          <Blocks className="h-4 w-4" />
                          ver estructura
                        </Link>
                      </Button>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>

            {trainings.length === 0 && (
              <EmptyState
                title={t("trainings.emptyTitle")}
                description={t("trainings.emptySubtitle")}
                icon={Dumbbell}
                actionLabel={t("trainings.createTraining")}
                onAction={() => setIsCreateOpen(true)}
                className="min-h-[360px]"
              />
            )}
          </>
        )}
    </div>
  );
}
