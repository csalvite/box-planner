import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden min-h-screen flex-col justify-between border-r border-border bg-card p-10 lg:flex">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Box <span className="text-primary">Planner</span>
          </h1>
        </div>

        <div className="max-w-xl space-y-5">
          <p className="text-sm font-medium uppercase text-primary">
            saas para entrenamientos de boxeo
          </p>
          <h2 className="text-5xl font-bold tracking-tight text-foreground">
            organiza bloques, sesiones y gimnasios desde un solo sitio
          </h2>
          <p className="max-w-md text-lg text-muted-foreground">
            entra con tu cuenta o crea una nueva para configurar tu organización
            y empezar con una base lista para crecer.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          gestión progresiva, sin perder el trabajo local actual.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-7">
          <div className="space-y-2 text-center lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Box <span className="text-primary">Planner</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              inicia sesión o crea una cuenta
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

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
