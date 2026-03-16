import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleCheckBig,
  Layers3,
  ShieldAlert,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";

import { CreateBoardDialog } from "@/components/dashboard/create-board-dialog";
import { BoardGrid } from "@/components/dashboard/board-grid";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { InvitationPanel } from "@/components/dashboard/invitation-panel";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/dashboard";
import {
  cn,
  formatDueDate,
  getBoardTheme,
  getPriorityLabel,
  percentage,
} from "@/lib/utils";

function DashboardHeroFallback({ firstName }: { firstName: string }) {
  return (
    <section className="glass-panel animate-enter relative overflow-hidden rounded-[36px] border border-border px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.16),transparent_32%)]" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] xl:items-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <Badge className="w-fit bg-primary/12 text-primary ring-1 ring-primary/15">
              Hola, {firstName}
            </Badge>
            <div className="space-y-3">
              <div className="h-5 w-44 animate-pulse rounded-full bg-secondary/80" />
              <div className="h-16 max-w-3xl animate-pulse rounded-[28px] bg-secondary/70" />
              <div className="h-5 max-w-2xl animate-pulse rounded-full bg-secondary/60" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-secondary sm:w-40" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-secondary/70 sm:w-36" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="glass-floating rounded-[24px] border border-border/70 px-4 py-4"
              >
                <div className="h-4 w-24 animate-pulse rounded bg-secondary/80" />
                <div className="mt-4 h-9 w-20 animate-pulse rounded bg-secondary" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-secondary/60" />
              </div>
            ))}
          </div>
        </div>

        <div className="glass-floating rounded-[32px] border border-border/70 px-5 py-5 sm:px-6">
          <div className="h-5 w-32 animate-pulse rounded bg-secondary/80" />
          <div className="mt-4 h-12 w-3/4 animate-pulse rounded-[20px] bg-secondary/70" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-secondary/60" />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[24px] border border-border bg-background/60 px-4 py-4"
              >
                <div className="h-4 w-20 animate-pulse rounded bg-secondary/80" />
                <div className="mt-3 h-10 w-16 animate-pulse rounded bg-secondary" />
                <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-secondary/60" />
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-border bg-background/60 px-4 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-secondary/80" />
            <div className="mt-3 h-5 w-full animate-pulse rounded bg-secondary/70" />
            <div className="mt-2 h-5 w-4/5 animate-pulse rounded bg-secondary/60" />
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardSectionsFallback() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-border bg-card/70 p-6"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
            <div className="mt-4 h-10 w-20 animate-pulse rounded bg-secondary" />
            <div className="mt-6 h-4 w-full animate-pulse rounded bg-secondary/70" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.5fr_0.9fr]">
        {Array.from({ length: 2 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="rounded-[32px] border border-border bg-card/70 p-6"
          >
            <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-4 w-full max-w-md animate-pulse rounded bg-secondary/70" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <div
                  key={itemIndex}
                  className="rounded-[24px] border border-border bg-background/60 p-4"
                >
                  <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
                  <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-secondary/70" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function DashboardHero({
  dataPromise,
  firstName,
}: {
  dataPromise: ReturnType<typeof getDashboardData>;
  firstName: string;
}) {
  const data = await dataPromise;
  const pendingInvitationCount = data.pendingInvitations.length;
  const attentionCount = data.stats.overdueCards + data.stats.dueSoonCards;
  const resolvedRatio = percentage(data.stats.completedCards, data.stats.totalCards);
  const focusState =
    data.stats.overdueCards > 0
      ? {
          label: "Atencion inmediata",
          title: `${data.stats.overdueCards} ${
            data.stats.overdueCards === 1 ? "tarea vencida pide" : "tareas vencidas piden"
          } decision hoy`,
          description:
            "Conviene resolver cuellos de botella primero y despues volver al flujo normal.",
          icon: ShieldAlert,
          tone:
            "border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(255,255,255,0.04))] text-amber-700 dark:text-amber-200",
        }
      : data.stats.dueSoonCards > 0
        ? {
            label: "Semana bajo seguimiento",
            title: `${data.stats.dueSoonCards} ${
              data.stats.dueSoonCards === 1 ? "entrega queda" : "entregas quedan"
            } dentro de esta semana`,
            description:
              "Tenes visibilidad suficiente para anticiparte antes de que el tablero se cargue de urgencias.",
            icon: CalendarClock,
            tone:
              "border-cyan-500/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(255,255,255,0.04))] text-cyan-700 dark:text-cyan-200",
          }
        : pendingInvitationCount > 0
          ? {
              label: "Colaboracion en espera",
              title: `${pendingInvitationCount} ${
                pendingInvitationCount === 1 ? "invitacion espera" : "invitaciones esperan"
              } tu decision`,
              description:
                "Resolver accesos rapido evita perder contexto en tableros compartidos.",
              icon: UserRoundPlus,
              tone:
                "border-primary/20 bg-[linear-gradient(135deg,rgba(45,212,191,0.16),rgba(255,255,255,0.04))] text-primary",
            }
          : {
              label: "Panorama estable",
              title: "No hay frentes criticos en el corto plazo",
              description:
                "El tablero de entrada queda limpio para elegir el flujo correcto y avanzar con continuidad.",
              icon: Sparkles,
              tone:
                "border-primary/20 bg-[linear-gradient(135deg,rgba(45,212,191,0.14),rgba(251,146,60,0.08))] text-primary",
            };
  const focusSummary =
    data.stats.overdueCards > 0
      ? `Revisa ${data.stats.overdueCards} ${
          data.stats.overdueCards === 1 ? "tarea vencida" : "tareas vencidas"
        } y reasigna responsables si hace falta.`
      : data.stats.dueSoonCards > 0
        ? `Bloquea tiempo para ${data.stats.dueSoonCards} ${
            data.stats.dueSoonCards === 1 ? "entrega cercana" : "entregas cercanas"
          } antes de abrir nuevos frentes.`
        : pendingInvitationCount > 0
          ? `Decidi ${pendingInvitationCount} ${
              pendingInvitationCount === 1 ? "acceso compartido" : "accesos compartidos"
            } y mantene el contexto ordenado.`
          : "Podes entrar al tablero correcto y avanzar sin urgencias abiertas.";
  const heroSignals = [
    {
      icon: Layers3,
      label: "Tableros activos",
      value: data.stats.boardCount,
      description:
        data.stats.boardCount === 1
          ? "1 espacio listo para retomar."
          : `${data.stats.boardCount} espacios listos para retomar.`,
    },
    {
      icon: CircleCheckBig,
      label: "Ritmo resuelto",
      value: `${resolvedRatio}%`,
      description:
        data.stats.completedCards > 0
          ? `${data.stats.completedCards} tarjetas cerradas hasta ahora.`
          : "Todavia no hay tareas cerradas en este corte.",
    },
    {
      icon: CalendarClock,
      label: "Vencen pronto",
      value: data.stats.dueSoonCards,
      description:
        data.stats.dueSoonCards > 0
          ? "Entralas hoy al radar operativo."
          : "Sin fechas comprometidas esta semana.",
    },
    {
      icon: UserRoundPlus,
      label: "Invitaciones",
      value: pendingInvitationCount,
      description:
        pendingInvitationCount > 0
          ? "Accesos compartidos para decidir."
          : "No hay accesos pendientes por resolver.",
    },
  ];
  const FocusIcon = focusState.icon;

  return (
    <section className="glass-panel animate-enter relative overflow-hidden rounded-[36px] border border-border px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.18),transparent_30%)]" />
      <div className="absolute right-10 top-8 size-32 rounded-full bg-white/20 blur-3xl dark:bg-white/8" />
      <div className="absolute bottom-0 left-10 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] xl:items-center">
        <div className="space-y-6">
          <div className="space-y-3">
            <Badge className="w-fit bg-primary/12 text-primary ring-1 ring-primary/15">
              Hola, {firstName}
            </Badge>
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                Centro operativo diario
              </p>
              <h2 className="text-balance font-display text-[clamp(2.35rem,5vw,4.4rem)] font-semibold leading-[0.94]">
                Priorizaciones, fechas y tableros en una sola vista util.
              </h2>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                El dashboard queda planteado como cabina de control: primero
                lees el pulso general, despues entras al tablero correcto y
                recien ahi bajas al detalle.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <CreateBoardDialog />
            <Link
              href="#boards"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "w-full sm:w-auto",
              )}
            >
              Ver tableros
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {heroSignals.map(({ icon: Icon, label, value, description }) => (
              <div
                key={label}
                className="glass-floating rounded-[24px] border border-border/70 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {label}
                  </p>
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="size-[18px]" />
                  </div>
                </div>
                <p className="mt-4 font-display text-[clamp(1.75rem,3vw,2.4rem)] font-semibold leading-none">
                  {value}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-floating relative overflow-hidden rounded-[32px] border border-border/70 px-5 py-5 sm:px-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-accent" />

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                  Radar del dia
                </p>
                <p className="mt-2 font-display text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-tight">
                  {focusState.title}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {focusState.description}
                </p>
              </div>
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-[22px] border",
                  focusState.tone,
                )}
              >
                <FocusIcon className="size-5" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-border/70 bg-background/60 px-4 py-4">
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span>Ritmo resuelto</span>
                  <span>{resolvedRatio}%</span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold">
                  {data.stats.completedCards}
                </p>
                <div className="mt-3 h-2 rounded-full bg-background/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-accent"
                    style={{
                      width: `${Math.max(resolvedRatio, data.stats.totalCards ? 8 : 0)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-background/60 px-4 py-4">
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span>Puntos de atencion</span>
                  <span>{attentionCount}</span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold">
                  {data.stats.overdueCards}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {data.stats.overdueCards > 0
                    ? "vencidas ahora"
                    : "sin vencidas; foco en fechas proximas"}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-background/60 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Siguiente pulso
                </p>
                <Badge
                  className={cn(
                    "border border-border/70 bg-background/70 text-foreground shadow-none",
                    data.stats.overdueCards > 0 && "border-amber-500/25 text-amber-700 dark:text-amber-200",
                  )}
                >
                  {focusState.label}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-medium leading-6">{focusSummary}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

async function DashboardSections({
  dataPromise,
}: {
  dataPromise: ReturnType<typeof getDashboardData>;
}) {
  const data = await dataPromise;

  return (
    <>
      <section className="animate-enter space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="secondary" className="w-fit">
              Lectura operativa
            </Badge>
            <div>
              <h3 className="font-display text-2xl font-semibold">
                Donde esta el pulso del trabajo
              </h3>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Una lectura rapida de volumen, avance y frentes con riesgo para
                entrar al detalle con criterio.
              </p>
            </div>
          </div>
          <div className="glass-floating flex flex-wrap items-center gap-2 rounded-[24px] border border-border/70 px-4 py-3 text-sm text-muted-foreground">
            <span>{data.stats.boardCount} tableros visibles</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{data.stats.totalCards} tareas en seguimiento</span>
            <span className="h-1 w-1 rounded-full bg-border" />
            <span>{data.upcomingCards.length} entregas esta semana</span>
          </div>
        </div>
        <DashboardStats stats={data.stats} />
      </section>

      {data.pendingInvitations.length ? (
        <InvitationPanel invitations={data.pendingInvitations} />
      ) : null}

      <section
        id="boards"
        className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.92fr)]"
      >
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-left">
              <Badge variant="secondary" className="mb-3 w-fit">
                Tableros
              </Badge>
              <h3 className="font-display text-2xl font-semibold">
                Espacios listos para retomar
              </h3>
              <p className="text-sm text-muted-foreground">
                Entradas directas a tus flujos propios o compartidos.
              </p>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              El grid ahora funciona como mapa operativo: progreso, carga y
              riesgo quedan visibles antes de abrir cada tablero.
            </p>
          </div>

          {data.boards.length ? (
            <BoardGrid boards={data.boards} />
          ) : (
            <EmptyState
              title="Todavía no tenés tableros"
              description="Creá el primero para empezar a organizar listas, tarjetas y miembros."
              action={<CreateBoardDialog />}
            />
          )}
        </div>

        <Card className="animate-enter min-w-0 overflow-hidden 2xl:sticky 2xl:top-24">
          <CardHeader className="relative overflow-hidden border-b border-border/60 pb-5">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="flex flex-col items-start gap-4 text-left sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="secondary" className="mb-3 w-fit">
                  Agenda inmediata
                </Badge>
                <CardTitle>Próximas entregas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tarjetas con fecha limite que conviene resolver antes de que
                  se conviertan en urgencia.
                </p>
              </div>
              <div className="glass-floating flex items-center gap-3 rounded-[24px] border border-border/70 px-4 py-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <CalendarClock className="size-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Esta semana
                  </p>
                  <p className="font-display text-2xl font-semibold">
                    {data.upcomingCards.length}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 space-y-3 pt-5">
            {data.upcomingCards.length ? (
              data.upcomingCards.map((card) => {
                const theme = getBoardTheme(card.boardTheme);

                return (
                  <Link
                    key={card.id}
                    href={`/boards/${card.boardId}`}
                    prefetch={false}
                    className={cn(
                      "group block min-w-0 rounded-[24px] border border-border bg-background/70 p-4 transition",
                      "hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/85",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{card.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {card.boardName} · {card.listName}
                        </p>
                      </div>
                      <Badge className={`shrink-0 ${theme.chipClass}`}>
                        {getPriorityLabel(card.priority)}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-muted-foreground",
                          card.isOverdue &&
                            "border-amber-500/25 text-amber-700 dark:text-amber-200",
                        )}
                      >
                        Vence {formatDueDate(card.dueDate)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary transition group-hover:translate-x-0.5">
                        Abrir
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <EmptyState
                className="px-4 py-10"
                title="No hay entregas próximas"
                description="Cuando una tarjeta tenga fecha límite aparecerá acá."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.trim().split(/\s+/)[0] || "equipo";
  const dataPromise = getDashboardData(user.id, user.email);

  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardHeroFallback firstName={firstName} />}>
        <DashboardHero dataPromise={dataPromise} firstName={firstName} />
      </Suspense>

      <Suspense fallback={<DashboardSectionsFallback />}>
        <DashboardSections dataPromise={dataPromise} />
      </Suspense>
    </div>
  );
}
