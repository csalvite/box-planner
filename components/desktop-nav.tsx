"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Layers, Dumbbell, Settings } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LogoutButton } from "@/components/logout-button"
import { ActiveOrganizationDisplay } from "@/components/active-organization-display"
import { useAppTranslation } from "@/hooks/use-app-translation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/blocks", labelKey: "nav.blocks", icon: Layers },
  { href: "/trainings", labelKey: "nav.trainings", icon: Dumbbell },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
]

export function DesktopNav() {
  const pathname = usePathname()
  const { t } = useAppTranslation()

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-border bg-card md:block">
      <div className="flex h-full flex-col">
        <div className="flex h-20 flex-col justify-center border-b border-border px-6">
          <h1 className="text-xl font-bold text-foreground">
            Box <span className="text-primary">Planner</span>
          </h1>
          <ActiveOrganizationDisplay className="mt-1" />
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-4">
          <LogoutButton />
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  )
}
