"use client"

import { motion } from "framer-motion"
import { Card, type CardProps } from "@/components/ui/card"
import { forwardRef } from "react"

export const AnimatedCard = forwardRef<HTMLDivElement, CardProps>(({ children, className, ...props }, ref) => {
  return (
    <Card asChild ref={ref} className={className} {...props}>
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {children}
      </motion.div>
    </Card>
  )
})

AnimatedCard.displayName = "AnimatedCard"
