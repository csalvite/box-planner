import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Block, Training, Stats } from "./types"

interface BoxPlannerState {
  // Blocks
  blocks: Block[]
  addBlock: (block: Omit<Block, "id" | "createdAt">) => void
  updateBlock: (id: string, block: Partial<Block>) => void
  deleteBlock: (id: string) => void

  // Trainings
  trainings: Training[]
  addTraining: (training: Omit<Training, "id" | "createdAt">) => void
  updateTraining: (id: string, training: Partial<Training>) => void
  deleteTraining: (id: string) => void

  // Stats
  stats: Stats
  updateStats: (stats: Partial<Stats>) => void

  // UI State
  selectedBlock: string | null
  setSelectedBlock: (id: string | null) => void

  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void
}

export const useBoxPlannerStore = create<BoxPlannerState>()(
  persist(
    (set) => ({
      // Initial Blocks
      blocks: [
        {
          id: "1",
          name: "Calentamiento dinámico",
          category: "warm-up",
          duration: 10,
          description: "Movilidad articular y activación muscular",
          createdAt: new Date(),
        },
        {
          id: "2",
          name: "Trabajo técnico de jab-cross",
          category: "technique",
          duration: 15,
          description: "Perfeccionar la técnica de golpes básicos",
          createdAt: new Date(),
        },
        {
          id: "3",
          name: "Cardio con saco",
          category: "cardio",
          duration: 20,
          description: "Intervalos de alta intensidad",
          createdAt: new Date(),
        },
      ],

      // Initial Trainings
      trainings: [
        {
          id: "1",
          name: "Entrenamiento completo",
          blocks: [],
          totalDuration: 45,
          createdAt: new Date(),
        },
      ],

      // Initial Stats
      stats: {
        trainingsThisMonth: 12,
        totalTimeMinutes: 540,
        currentStreak: 5,
        weeklyGoalMinutes: 180,
        weeklyProgressMinutes: 120,
      },

      // Block Actions
      addBlock: (block) =>
        set((state) => ({
          blocks: [...state.blocks, { ...block, id: crypto.randomUUID(), createdAt: new Date() }],
        })),

      updateBlock: (id, block) =>
        set((state) => ({
          blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...block } : b)),
        })),

      deleteBlock: (id) =>
        set((state) => ({
          blocks: state.blocks.filter((b) => b.id !== id),
        })),

      // Training Actions
      addTraining: (training) =>
        set((state) => ({
          trainings: [...state.trainings, { ...training, id: crypto.randomUUID(), createdAt: new Date() }],
        })),

      updateTraining: (id, training) =>
        set((state) => ({
          trainings: state.trainings.map((t) => (t.id === id ? { ...t, ...training } : t)),
        })),

      deleteTraining: (id) =>
        set((state) => ({
          trainings: state.trainings.filter((t) => t.id !== id),
        })),

      // Stats Actions
      updateStats: (stats) =>
        set((state) => ({
          stats: { ...state.stats, ...stats },
        })),

      // UI State
      selectedBlock: null,
      setSelectedBlock: (id) => set({ selectedBlock: id }),

      isModalOpen: false,
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
    }),
    {
      name: "box-planner-storage",
    },
  ),
)
