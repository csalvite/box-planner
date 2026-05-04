"use client"

import type React from "react"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useBoxPlannerStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useAppTranslation } from "@/hooks/use-app-translation"

interface AppModalProps {
  children: React.ReactNode
  title?: string
}

export function AppModal({ children, title }: AppModalProps) {
  const { isModalOpen, closeModal } = useBoxPlannerStore()
  const { t } = useAppTranslation()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal()
      }
    }

    if (isModalOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isModalOpen, closeModal])

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeModal}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-2xl md:rounded-2xl md:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "modal-title" : undefined}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="absolute right-4 top-4"
                aria-label={t("modal.close")}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Title */}
              {title && (
                <h2 id="modal-title" className="mb-6 text-2xl font-bold text-foreground">
                  {title}
                </h2>
              )}

              {/* Content */}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
