"use client";

import type { ApiTraining } from "@/lib/api/trainings";
import { TrainingDetailView } from "@/components/training-detail-view";

interface TrainingBlocksPanelProps {
  organizationId: string;
  training: ApiTraining;
}

export function TrainingBlocksPanel({
  organizationId,
  training,
}: TrainingBlocksPanelProps) {
  return (
    <TrainingDetailView organizationId={organizationId} training={training} />
  );
}
