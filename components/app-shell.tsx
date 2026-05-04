import type React from "react"
import { MobileNav } from "./mobile-nav"
import { DesktopNav } from "./desktop-nav"
import { AuthGate } from "./auth-gate"
import { OrganizationGate } from "./organization-gate"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AuthGate>
      <OrganizationGate>
        <div className="relative min-h-screen">
          <DesktopNav />
          <main className="pb-20 md:ml-64 md:pb-0">
            <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
          </main>
          <MobileNav />
        </div>
      </OrganizationGate>
    </AuthGate>
  )
}
