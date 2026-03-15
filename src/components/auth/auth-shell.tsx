import {
  ArrowRight,
  CalendarRange,
  ChartColumn,
  KanbanSquare,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

type AsideLink = {
  href: string;
  label: string;
};

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  asideLink?: AsideLink;
  showDemoCredentials?: boolean;
};

const highlights = [
  {
    title: "Tableros colaborativos",
    description: "Organizá listas, tarjetas y responsables con una vista clara y rápida.",
    icon: KanbanSquare,
  },
  {
    title: "Visión operativa",
    description: "Calendario, filtros y métricas para anticipar carga, riesgo y avance.",
    icon: ChartColumn,
  },
  {
    title: "Permisos por equipo",
    description: "Cada tablero respeta roles y acceso compartido sin perder contexto.",
    icon: Users,
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  asideLink,
  showDemoCredentials = false,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,35rem)] 2xl:grid-cols-[1.15fr_35rem]">
      <section className="relative hidden overflow-hidden border-r border-border/60 px-8 py-8 lg:block xl:px-10 xl:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.18),transparent_26%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="space-y-8">
            <Badge>Gestión de proyectos</Badge>
            <div className="space-y-4">
              <h1 className="max-w-xl text-balance font-display text-[clamp(2.8rem,4vw,4rem)] font-semibold leading-tight">
                Un espacio claro para coordinar entregas, prioridades y equipo.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                ProjectFlow reúne tableros, agenda operativa y colaboración en una
                interfaz pensada para trabajar con menos fricción y más contexto.
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
                    <h2 className="font-display text-lg font-semibold">
                      {item.title}
                    </h2>
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
                  {showDemoCredentials ? "Accesos de prueba" : "Ingreso seguro"}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold">
                  {showDemoCredentials
                    ? "Probá el producto con distintos perfiles"
                    : "Entrá a tus tableros con el acceso correcto"}
                </h3>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                {showDemoCredentials ? (
                  <CalendarRange className="size-5" />
                ) : (
                  <ShieldCheck className="size-5" />
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {showDemoCredentials ? (
                <>
                <div className="rounded-[24px] border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Producto
                  </p>
                  <p className="mt-2 font-semibold">sofia@projectflow.dev</p>
                  <p className="text-sm text-muted-foreground">Demo1234!</p>
                </div>
                <div className="rounded-[24px] border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Operaciones
                  </p>
                    <p className="mt-2 font-semibold">lucia@projectflow.dev</p>
                    <p className="text-sm text-muted-foreground">Demo1234!</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[24px] border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Privacidad
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Tu cuenta accede sólo a los tableros donde participás o que
                      fueron compartidos con tu email.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Continuidad
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Seguí tareas, fechas y responsables desde el mismo lugar,
                      con permisos consistentes por tablero.
                    </p>
                  </div>
                </>
              )}
            </div>

            {asideLink ? (
              <a
                href={asideLink.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                {asideLink.label}
                <ArrowRight className="size-4" />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="w-full max-w-2xl lg:max-w-xl">
          <div className="mb-8 flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex size-12 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-500 via-cyan-400 to-orange-400 text-white shadow-lg">
              <KanbanSquare className="size-6" />
            </div>
            <div>
              <div className="font-display text-xl font-semibold">ProjectFlow</div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Workspace de proyectos
              </p>
            </div>
          </div>

          <div className="mb-6 glass-panel rounded-[28px] border border-border p-5 lg:hidden">
            <Badge>{showDemoCredentials ? "Accesos de prueba" : "Ingreso seguro"}</Badge>
            <p className="mt-3 font-display text-xl font-semibold">
              {showDemoCredentials
                ? "Probá ProjectFlow con perfiles listos para entrar."
                : "Entrá con tus permisos y seguí el trabajo desde el mismo lugar."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {showDemoCredentials
                ? "En móvil dejamos visibles las credenciales demo para que no dependan del panel lateral."
                : "Tu cuenta mantiene contexto, permisos y continuidad aunque cambies de dispositivo."}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {showDemoCredentials ? (
                <>
                  <div className="rounded-[24px] border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Producto
                    </p>
                    <p className="mt-2 font-semibold">sofia@projectflow.dev</p>
                    <p className="text-sm text-muted-foreground">Demo1234!</p>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Operaciones
                    </p>
                    <p className="mt-2 font-semibold">lucia@projectflow.dev</p>
                    <p className="text-sm text-muted-foreground">Demo1234!</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[24px] border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Privacidad
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Solo accedés a tableros propios o compartidos con tu email.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Continuidad
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Tareas, fechas y responsables quedan disponibles en la misma vista.
                    </p>
                  </div>
                </>
              )}
            </div>

            {asideLink ? (
              <a
                href={asideLink.href}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                {asideLink.label}
                <ArrowRight className="size-4" />
              </a>
            ) : null}
          </div>

          <div className="mb-8 space-y-2 text-center lg:text-left">
            <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-semibold">
              {title}
            </h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          <div className="glass-panel rounded-[32px] border border-border p-5 sm:p-8">
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
