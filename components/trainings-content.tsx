"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Plus, Clock, Calendar, Trash2, Edit } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrainingForm } from "@/components/training-form";
import { TrainingBlocksPanel } from "@/components/training-blocks-panel";
import type { ApiTraining } from "@/lib/api/trainings";
import { useDeleteTraining, useTrainings } from "@/hooks/use-trainings";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

function formatMinutes(totalDurationSec: number) {
  return Math.round(totalDurationSec / 60);
}

export function TrainingsContent() {
  const { t, language } = useAppTranslation();
  const { activeOrganizationId } = useActiveOrganization();
  const trainingsQuery = useTrainings(activeOrganizationId);
  const deleteTraining = useDeleteTraining(activeOrganizationId);
  const trainings = trainingsQuery.data ?? [];
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<ApiTraining | null>(
    null,
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dashboard.newTrainingTitle")}</DialogTitle>
          </DialogHeader>
          <TrainingForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedTraining}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTraining(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.title}</DialogTitle>
          </DialogHeader>
          {activeOrganizationId && selectedTraining && (
            <TrainingBlocksPanel
              organizationId={activeOrganizationId}
              training={selectedTraining}
            />
          )}
        </DialogContent>
      </Dialog>

      {!activeOrganizationId && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
          <Plus className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            selecciona una organización
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            necesitas una organización activa para gestionar entrenamientos.
          </p>
        </div>
      )}

      {activeOrganizationId && trainingsQuery.isLoading && (
        <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
          cargando entrenamientos...
        </div>
      )}

      {activeOrganizationId && trainingsQuery.error && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
          <Plus className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            no pudimos cargar los entrenamientos
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {trainingsQuery.error.message}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void trainingsQuery.refetch()}
          >
            reintentar
          </Button>
        </div>
      )}

      {activeOrganizationId &&
        !trainingsQuery.isLoading &&
        !trainingsQuery.error && (
          <>
            {deleteTraining.error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteTraining.error.message}
              </p>
            )}

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {trainings.map((training) => (
                <motion.div key={training.id} variants={itemVariants}>
                  <AnimatedCard className="p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-xl font-semibold text-foreground">
                          {training.title}
                        </h3>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatMinutes(training.totalDurationSec)}{" "}
                              {t("trainings.minutes")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {new Date(
                                training.createdAt ?? Date.now(),
                              ).toLocaleDateString(
                                language === "es" ? "es-ES" : "en-US",
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              {training.blocks?.length ?? 0}{" "}
                              {t("trainings.blocksCount")}
                            </span>
                          </div>
                        </div>

                        {training.notes && (
                          <p className="text-sm text-muted-foreground">
                            {training.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedTraining(training)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          disabled={
                            deleteTraining.isPending &&
                            deleteTraining.variables === training.id
                          }
                          onClick={() =>
                            void deleteTraining.mutateAsync(training.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>
              ))}
            </motion.div>

            {trainings.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center"
              >
                <Plus className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {t("trainings.emptyTitle")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("trainings.emptySubtitle")}
                </p>
                <AnimatedButton
                  className="mt-4 gap-2"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t("trainings.createTraining")}
                </AnimatedButton>
              </motion.div>
            )}
          </>
        )}
    </div>
  );
}
