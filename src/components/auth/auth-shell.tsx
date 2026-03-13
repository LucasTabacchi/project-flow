import Link from "next/link";
import { ArrowRight, CalendarRange, ChartColumn, KanbanSquare, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

const highlights = [
  {
    title: "Tableros colaborativos",
    description: "Listas, tarjetas y drag and drop con foco en claridad visual.",
    icon: KanbanSquare,
  },
  {
    title: "Seguimiento real",
    description: "Filtros, calendario y métricas para detectar riesgo y avance.",
    icon: ChartColumn,
  },
  {
    title: "Roles por tablero",
    description: "Propietario, editor y lector con permisos consistentes.",
    icon: Users,
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_560px]">
      <section className="relative hidden overflow-hidden border-r border-border/60 px-10 py-10 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_26%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="space-y-8">
            <Badge>App lista para producción</Badge>
            <div className="space-y-4">
              <h1 className="max-w-xl text-balance font-display text-5xl font-semibold leading-tight">
                Kanban moderno para equipos que necesitan foco, ritmo y contexto.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                ProjectFlow combina la claridad de Trello con una interfaz más
                editorial, filtros útiles, calendario y permisos por rol.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="glass-panel rounded-[28px] border border-border p-5"
                  >
                    <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <h2 className="font-display text-lg font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel rounded-[32px] border border-border p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
                  Demo accesible
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold">
                  Entrá con los usuarios seed
                </h3>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <CalendarRange className="size-5" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[24px] border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Product owner
                </p>
                <p className="mt-2 font-semibold">sofia@projectflow.dev</p>
                <p className="text-sm text-muted-foreground">Demo1234!</p>
              </div>
              <div className="rounded-[24px] border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Engineering
                </p>
                <p className="mt-2 font-semibold">diego@projectflow.dev</p>
                <p className="text-sm text-muted-foreground">Demo1234!</p>
              </div>
            </div>
            <Link
              href="/register"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              Crear una cuenta nueva
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-xl">
          <div className="mb-8 space-y-2 text-center lg:text-left">
            <h2 className="font-display text-4xl font-semibold">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <div className="glass-panel rounded-[32px] border border-border p-6 sm:p-8">
            {children}
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </div>
      </section>
    </div>
  );
}
