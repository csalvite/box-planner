"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Layers, Dumbbell, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LogoutButton } from "@/components/logout-button"
import { ActiveOrganizationDisplay } from "@/components/active-organization-display"
import { useAppTranslation } from "@/hooks/use-app-translation"

const navItems = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/blocks", labelKey: "nav.blocks", icon: Layers },
  { href: "/trainings", labelKey: "nav.trainings", icon: Dumbbell },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const { t } = useAppTranslation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <ActiveOrganizationDisplay className="flex-1" />
        <div className="flex shrink-0 gap-2">
          <LogoutButton compact />
          <LanguageSwitcher />
        </div>
      </div>
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-3 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              >
                <motion.div whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
                  <Icon className="h-5 w-5" />
                </motion.div>
                <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
