"use client";

import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { TrainingDetailView } from "@/components/training-detail-view";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { useTraining } from "@/hooks/use-trainings";

export function TrainingDetailPageContent({
  trainingId,
}: {
  trainingId: string;
}) {
  const { activeOrganizationId } = useActiveOrganization();
  const trainingQuery = useTraining(activeOrganizationId, trainingId);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="px-0 text-muted-foreground">
        <Link href="/trainings">
          <ArrowLeft className="h-4 w-4" />
          volver a clases tipo
        </Link>
      </Button>

      {!activeOrganizationId && (
        <ErrorState
          title="selecciona una organizacion"
          description="necesitas una organizacion activa para revisar esta clase tipo."
          icon={Dumbbell}
        />
      )}

      {activeOrganizationId && trainingQuery.isLoading && (
        <LoadingState
          title="cargando clase tipo"
          description="estamos preparando la estructura completa."
          className="min-h-[360px]"
        />
      )}

      {activeOrganizationId && trainingQuery.error && (
        <ErrorState
          title="no pudimos cargar la clase tipo"
          description={trainingQuery.error.message}
          actionLabel="reintentar"
          onAction={() => void trainingQuery.refetch()}
          className="min-h-[360px]"
        />
      )}

      {activeOrganizationId && trainingQuery.data && (
        <TrainingDetailView
          organizationId={activeOrganizationId}
          training={trainingQuery.data}
        />
      )}
    </div>
  );
}
