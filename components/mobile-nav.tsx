"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarDays,
  Dumbbell,
  Home,
  Layers,
  Settings,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { UserNavSummary } from "@/components/user-nav-summary";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useActiveOrganization } from "@/components/providers/organization-provider";
import { isStaffOrganization } from "@/lib/organization-role";

const navItems = [
  {
    href: "/classes",
    labelKey: "nav.classes",
    icon: CalendarDays,
    staffOnly: true,
  },
  {
    href: "/trainings",
    labelKey: "nav.trainings",
    icon: Dumbbell,
    staffOnly: true,
  },
  {
    href: "/exercises",
    labelKey: "nav.exercises",
    icon: Activity,
    staffOnly: true,
  },
  { href: "/", labelKey: "nav.home", icon: Home },
  {
    href: "/members",
    labelKey: "nav.members",
    icon: UsersRound,
    staffOnly: true,
  },
  {
    href: "/blocks",
    labelKey: "nav.blocks",
    icon: Layers,
    secondary: true,
    staffOnly: true,
  },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useAppTranslation();
  const { activeOrganization } = useActiveOrganization();
  const visibleNavItems = navItems.filter(
    (item) => !item.staffOnly || isStaffOrganization(activeOrganization),
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <UserNavSummary
          compact
          className="flex-1 border-0 bg-transparent p-0"
        />
        <div className="flex shrink-0 gap-2">
          <LogoutButton compact />
          <LanguageSwitcher />
        </div>
      </div>
      <div className="flex items-center justify-start overflow-x-auto overscroll-x-contain pb-[env(safe-area-inset-bottom)]">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4.75rem] flex-1 flex-col items-center gap-1 px-2 py-3 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : item.secondary
                    ? "text-muted-foreground/70 hover:text-foreground"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <span className="max-w-full truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
