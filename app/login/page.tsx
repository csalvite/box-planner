import { Suspense } from "react";
import { Activity, Dumbbell, Shield, Timer } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden border-r border-border bg-card p-10 lg:flex">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Box <span className="text-primary">Planner</span>
          </h1>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            sports-tech
          </span>
        </div>

        <div className="relative max-w-xl space-y-8">
          <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-primary/20 bg-primary/10 blur-2xl" />

          <div className="relative space-y-5">
            <p className="text-sm font-medium uppercase text-primary">
              saas para clases de boxeo
            </p>
            <h2 className="text-5xl font-bold tracking-tight text-foreground">
              programa clases, prepara partes y gestiona tu gimnasio
            </h2>
            <p className="max-w-md text-lg text-muted-foreground">
              crea clases tipo, reutiliza partes y comparte lo que toca entrenar.
            </p>
          </div>

          <div className="relative rounded-lg border border-border/80 bg-background/55 p-6 shadow-2xl shadow-black/30">
            <div className="grid grid-cols-[1fr_auto] gap-5">
              <div className="space-y-4">
                <div className="h-2 rounded-full bg-primary/80" />
                <div className="h-2 w-3/4 rounded-full bg-chart-4/70" />
                <div className="h-2 w-1/2 rounded-full bg-chart-5/70" />
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                <Dumbbell className="h-9 w-9 text-primary" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border/70 bg-card/70 p-3">
                <Timer className="h-4 w-4 text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">duracion</p>
                <p className="text-sm font-semibold text-foreground">45 min</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/70 p-3">
                <Activity className="h-4 w-4 text-chart-4" />
                <p className="mt-2 text-xs text-muted-foreground">partes</p>
                <p className="text-sm font-semibold text-foreground">6</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/70 p-3">
                <Shield className="h-4 w-4 text-chart-5" />
                <p className="mt-2 text-xs text-muted-foreground">equipo</p>
                <p className="text-sm font-semibold text-foreground">gym</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          empieza simple: clases, partes, ejercicios y alumnos.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2 text-center lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Box <span className="text-primary">Planner</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              inicia sesion o crea una cuenta
            </p>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              bienvenida
            </h2>
            <p className="text-sm text-muted-foreground">
              usa tu cuenta para continuar
            </p>
          </div>

          <div className="rounded-lg border border-border/80 bg-card/90 p-6 shadow-2xl shadow-black/25 ring-1 ring-white/10">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}
