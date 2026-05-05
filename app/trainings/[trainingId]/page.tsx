import { AppShell } from "@/components/app-shell";
import { TrainingDetailPageContent } from "@/components/training-detail-page-content";

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ trainingId: string }>;
}) {
  const { trainingId } = await params;

  return (
    <AppShell>
      <TrainingDetailPageContent trainingId={trainingId} />
    </AppShell>
  );
}
