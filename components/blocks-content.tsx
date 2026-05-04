"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedButton } from "@/components/ui/animated-button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/data-state";
import { Input } from "@/components/ui/input";
import { Dumbbell, Plus, Search, Clock, Trash2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/lib/types";
import type { BlockFormInput } from "@/lib/api/blocks";
import { motion, type Variants } from "framer-motion";
import { BlockExercisesPanel } from "@/components/block-exercises-panel";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { useBlockCategories } from "@/hooks/use-block-categories";
import {
  useBlocks,
  useCreateBlock,
  useDeleteBlock,
} from "@/hooks/use-blocks";
import { useBlockExercises } from "@/hooks/use-exercises";

const categoryColors = {
  "warm-up": "bg-chart-2/20 text-chart-2",
  technique: "bg-primary/20 text-primary",
  cardio: "bg-chart-5/20 text-chart-5",
  strength: "bg-chart-4/20 text-chart-4",
  cooldown: "bg-chart-3/20 text-chart-3",
  sparring: "bg-destructive/20 text-destructive",
} as const;

const backendCategoryToUiCategory: Record<string, Block["category"]> = {
  WARM_UP: "warm-up",
  "warm-up": "warm-up",
  warmup: "warm-up",
  warm_up: "warm-up",
  TECHNIQUE: "technique",
  technique: "technique",
  CARDIO: "cardio",
  cardio: "cardio",
  STRENGTH: "strength",
  strength: "strength",
  COOL_DOWN: "cooldown",
  cooldown: "cooldown",
  cool_down: "cooldown",
  SPARRING: "sparring",
  sparring: "sparring",
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

function BlockExerciseCount({
  organizationId,
  blockId,
  fallbackCount,
}: {
  organizationId: string;
  blockId: string;
  fallbackCount: number;
}) {
  const exercisesQuery = useBlockExercises(organizationId, blockId);

  if (exercisesQuery.isLoading) {
    return <span>{fallbackCount || "..."}</span>;
  }

  return <span>{exercisesQuery.data?.length ?? fallbackCount}</span>;
}

export function BlocksContent() {
  const { t } = useAppTranslation();
  const { activeOrganizationId } = useActiveOrganization();
  const blocksQuery = useBlocks(activeOrganizationId);
  const blockCategoriesQuery = useBlockCategories();
  const createBlock = useCreateBlock(activeOrganizationId);
  const deleteBlock = useDeleteBlock(activeOrganizationId);
  const blocks = blocksQuery.data ?? [];
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [newBlock, setNewBlock] = useState<BlockFormInput>({
    name: "",
    categoryId: undefined,
    description: "",
  });

  const categoryLabels: Record<Block["category"], string> = {
    "warm-up": t("blockCategories.warmUp"),
    technique: t("blockCategories.technique"),
    cardio: t("blockCategories.cardio"),
    strength: t("blockCategories.strength"),
    cooldown: t("blockCategories.cooldown"),
    sparring: t("blockCategories.sparring"),
  };

  const filteredBlocks = blocks.filter((block) =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const currentSelectedBlock = selectedBlock
    ? blocks.find((block) => block.id === selectedBlock.id) ?? selectedBlock
    : null;

  const blockCategories = blockCategoriesQuery.data ?? [];
  const selectedCategoryId =
    newBlock.categoryId ?? blockCategories[0]?.id ?? undefined;

  const getCategoryLabel = (categoryKey: string) => {
    const uiCategory =
      backendCategoryToUiCategory[categoryKey] ??
      backendCategoryToUiCategory[categoryKey.toLowerCase()];

    return uiCategory ? categoryLabels[uiCategory] : categoryKey;
  };

  const handleAddBlock = async () => {
    setFormError(null);

    if (!activeOrganizationId) {
      setFormError("No hay una organización activa.");
      return;
    }

    if (!selectedCategoryId) {
      setFormError("No hay categorías disponibles para crear el bloque.");
      return;
    }

    if (newBlock.name.trim()) {
      try {
        await createBlock.mutateAsync({
          ...newBlock,
          name: newBlock.name.trim(),
          categoryId: selectedCategoryId,
          description: newBlock.description?.trim() || undefined,
        });
        setNewBlock({
          name: "",
          categoryId: undefined,
          description: "",
        });
        setIsDialogOpen(false);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "No se pudo crear el bloque.",
        );
      }
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!activeOrganizationId) {
      return;
    }

    await deleteBlock.mutateAsync(blockId);
  };

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
            {t("blocks.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("blocks.subtitle")}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <AnimatedButton
              size="lg"
              className="gap-2"
              disabled={!activeOrganizationId}
            >
              <Plus className="h-5 w-5" />
              {t("blocks.newBlock")}
            </AnimatedButton>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("blocks.createBlockTitle")}</DialogTitle>
              <DialogDescription>
                crea una plantilla base; la duracion se calcula con sus
                ejercicios.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">{t("blocks.name")}</Label>
                <Input
                  id="name"
                  placeholder={t("blocks.namePlaceholder")}
                  value={newBlock.name}
                  onChange={(e) =>
                    setNewBlock({ ...newBlock, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t("blocks.category")}</Label>
                <Select
                  value={selectedCategoryId ? String(selectedCategoryId) : ""}
                  onValueChange={(value) =>
                    setNewBlock({
                      ...newBlock,
                      categoryId: Number(value),
                    })
                  }
                  disabled={
                    blockCategoriesQuery.isLoading ||
                    blockCategoriesQuery.isError
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {blockCategories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {getCategoryLabel(category.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {blockCategoriesQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">
                    cargando categorías...
                  </p>
                )}
                {blockCategoriesQuery.error && (
                  <p className="text-xs text-destructive">
                    no pudimos cargar las categorías.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("blocks.description")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("blocks.descriptionPlaceholder")}
                  value={newBlock.description}
                  onChange={(e) =>
                    setNewBlock({ ...newBlock, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                la duración se calculará automáticamente al añadir ejercicios.
              </p>

              {formError && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}

              <Button
                onClick={handleAddBlock}
                className="w-full"
                disabled={
                  createBlock.isPending ||
                  blockCategoriesQuery.isLoading ||
                  blockCategoriesQuery.isError
                }
              >
                {createBlock.isPending ? "creando..." : t("blocks.createBlock")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Dialog
        open={!!currentSelectedBlock}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBlock(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentSelectedBlock?.name}</DialogTitle>
            <DialogDescription>
              gestiona ejercicios, descansos y la duracion calculada del bloque.
            </DialogDescription>
          </DialogHeader>
          {activeOrganizationId && currentSelectedBlock && (
            <BlockExercisesPanel
              organizationId={activeOrganizationId}
              blockId={currentSelectedBlock.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {!activeOrganizationId && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
          <Layers className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            selecciona una organización
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            necesitas una organización activa para gestionar bloques.
          </p>
        </div>
      )}

      {activeOrganizationId && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("blocks.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </motion.div>

          <div className="rounded-lg border border-border/70 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
            un bloque es una parte reutilizable de una sesion. Dentro puedes
            anadir ejercicios, descansos y notas para que la duracion se calcule
            sola.
          </div>

          {blocksQuery.isLoading && (
            <LoadingState
              title="cargando bloques"
              description="estamos preparando la biblioteca de la organizacion."
            />
          )}

          {blocksQuery.error && (
            <ErrorState
              title="no pudimos cargar los bloques"
              description={blocksQuery.error.message}
              actionLabel="reintentar"
              onAction={() => void blocksQuery.refetch()}
            />
          )}

          {!blocksQuery.isLoading && !blocksQuery.error && (
            <>
              {deleteBlock.error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {deleteBlock.error.message}
                </p>
              )}

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredBlocks.map((block) => (
                  <motion.div key={block.id} variants={itemVariants}>
                    <AnimatedCard className="h-full border-border/80 bg-card/70 p-5 shadow-md shadow-black/15">
                      <div className="flex h-full flex-col space-y-5">
                        <div className="flex items-start justify-between">
                          <span
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-white/10",
                              categoryColors[block.category],
                            )}
                          >
                            {categoryLabels[block.category]}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={
                              deleteBlock.isPending &&
                              deleteBlock.variables === block.id
                            }
                            onClick={() => void handleDeleteBlock(block.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold leading-tight text-foreground">
                            {block.name}
                          </h3>
                          <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground line-clamp-2">
                            {block.description || "sin descripcion"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              duracion
                            </div>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {block.duration} {t("blocks.minutes")}
                            </p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-background/45 px-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Dumbbell className="h-3.5 w-3.5" />
                              ejercicios
                            </div>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {activeOrganizationId ? (
                                <BlockExerciseCount
                                  organizationId={activeOrganizationId}
                                  blockId={block.id}
                                  fallbackCount={block.exercises?.length ?? 0}
                                />
                              ) : (
                                block.exercises?.length ?? 0
                              )}
                            </p>
                          </div>
                        </div>

                        <Button
                          className="mt-auto w-full"
                          onClick={() => setSelectedBlock(block)}
                        >
                          gestionar ejercicios
                        </Button>
                      </div>
                    </AnimatedCard>
                  </motion.div>
                ))}
              </motion.div>

              {filteredBlocks.length === 0 && (
                <EmptyState
                  title={t("blocks.emptyTitle")}
                  description={
                    searchQuery
                      ? t("blocks.emptySearch")
                      : t("blocks.emptyDefault")
                  }
                  icon={Layers}
                  className="min-h-[360px]"
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
