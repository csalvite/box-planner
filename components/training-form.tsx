"use client";

import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
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
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useBlocks } from "@/hooks/use-blocks";
import {
  useAddBlockToTraining,
  useCreateTraining,
} from "@/hooks/use-trainings";
import { useBoxPlannerStore } from "@/lib/store";
import type { TrainingLevel, TrainingType } from "@/lib/types";

interface TrainingFormProps {
  onSuccess?: () => void;
}

export function TrainingForm({ onSuccess }: TrainingFormProps) {
  const { closeModal } = useBoxPlannerStore();
  const { activeOrganizationId } = useActiveOrganization();
  const blocksQuery = useBlocks(activeOrganizationId);
  const createTraining = useCreateTraining(activeOrganizationId);
  const addBlockToTraining = useAddBlockToTraining(activeOrganizationId);
  const { t } = useAppTranslation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TrainingType>("personal");
  const [level, setLevel] = useState<TrainingLevel>("intermediate");
  const [notes, setNotes] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; form?: string }>({});

  const blocks = blocksQuery.data ?? [];

  const addSelectedBlock = () => {
    if (!selectedBlockId) {
      return;
    }

    setSelectedBlockIds((current) => [...current, selectedBlockId]);
    setSelectedBlockId("");
  };

  const removeSelectedBlock = (index: number) => {
    setSelectedBlockIds((current) =>
      current.filter((_blockId, blockIndex) => blockIndex !== index),
    );
  };

  const resetForm = () => {
    setTitle("");
    setType("personal");
    setLevel("intermediate");
    setNotes("");
    setSelectedBlockId("");
    setSelectedBlockIds([]);
    setErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!activeOrganizationId) {
      setErrors({ form: "No hay una organizacion activa." });
      return;
    }

    if (!title.trim()) {
      setErrors({ title: t("trainingForm.titleRequired") });
      return;
    }

    try {
      const createFlow = async () => {
        const training = await createTraining.mutateAsync({
          title: title.trim(),
          trainingType: type,
          level,
          notes: notes.trim() || undefined,
        });

        if (selectedBlockIds.length > 0) {
          for (const [index, blockId] of selectedBlockIds.entries()) {
            await addBlockToTraining.mutateAsync({
              trainingId: training.id,
              blockId,
              orderIndex: index,
            });
          }
        }

        return training;
      };

      const createPromise = createFlow();

      toast.promise(createPromise, {
        loading: "creando entrenamiento...",
        success: "entrenamiento creado",
        error: "no se pudo crear el entrenamiento",
      });

      await createPromise;

      resetForm();
      closeModal();
      onSuccess?.();
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "No se pudo crear el entrenamiento.",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-foreground">
          {t("trainingForm.title")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setErrors({});
          }}
          placeholder={t("trainingForm.titlePlaceholder")}
          className={errors.title ? "border-destructive" : ""}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-foreground">
            {t("trainingForm.type")}
          </Label>
          <Select
            value={type}
            onValueChange={(value) => setType(value as TrainingType)}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">
                {t("trainingForm.typePersonal")}
              </SelectItem>
              <SelectItem value="group">
                {t("trainingForm.typeGroup")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="level" className="text-foreground">
            {t("trainingForm.level")}
          </Label>
          <Select
            value={level}
            onValueChange={(value) => setLevel(value as TrainingLevel)}
          >
            <SelectTrigger id="level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">
                {t("trainingForm.levelBeginner")}
              </SelectItem>
              <SelectItem value="intermediate">
                {t("trainingForm.levelIntermediate")}
              </SelectItem>
              <SelectItem value="advanced">
                {t("trainingForm.levelAdvanced")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border/80 bg-background/45 p-4">
        <div>
          <Label className="text-foreground">bloques</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            puedes anadirlos ahora o gestionarlos despues desde la estructura.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <Select
            value={selectedBlockId}
            onValueChange={setSelectedBlockId}
            disabled={blocksQuery.isLoading || blocksQuery.isError}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un bloque" />
            </SelectTrigger>
            <SelectContent>
              {blocks.map((block) => (
                <SelectItem key={block.id} value={block.id}>
                  {block.name} - {block.duration} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={addSelectedBlock}>
            anadir
          </Button>
        </div>

        {blocksQuery.isLoading && (
          <LoadingState
            title="cargando bloques"
            description="podras anadirlos cuando esten disponibles."
            className="min-h-[140px]"
          />
        )}

        {blocksQuery.error && (
          <ErrorState
            title="no pudimos cargar los bloques"
            description={blocksQuery.error.message}
            actionLabel="reintentar"
            onAction={() => void blocksQuery.refetch()}
            className="min-h-[140px]"
          />
        )}

        {selectedBlockIds.length > 0 && (
          <div className="space-y-2">
            {selectedBlockIds.map((blockId, index) => {
              const block = blocks.find((item) => item.id === blockId);

              return (
                <div
                  key={`${blockId}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-card/60 px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {index + 1}. {block?.name ?? "bloque"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeSelectedBlock(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-foreground">
          {t("trainingForm.notesOptional")}
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("trainingForm.notesPlaceholder")}
          rows={4}
        />
      </div>

      {errors.form && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            closeModal();
            onSuccess?.();
          }}
          className="bg-transparent"
        >
          {t("trainingForm.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={createTraining.isPending || addBlockToTraining.isPending}
        >
          {createTraining.isPending || addBlockToTraining.isPending
            ? "creando..."
            : t("trainingForm.create")}
        </Button>
      </div>
    </form>
  );
}
