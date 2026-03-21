import Link from "next/link";
import {
  AlarmClockCheck,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  FolderKanban,
  Gauge,
  ReceiptText,
  TriangleAlert,
  Users2,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fieldSelectClassName } from "@/components/ui/field";
import { MetricCard } from "@/components/ui/metric-card";
import {
  cn,
  formatRelativeDistance,
  getBoardTheme,
  getPriorityLabel,
  getStatusLabel,
} from "@/lib/utils";
import type { TimeReportsData } from "@/types";

type TimeReportsViewProps = {
  data: TimeReportsData;
};

function formatMinutes(total: number) {
  if (total <= 0) {
    return "0m";
  }

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatVarianceMinutes(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatMinutes(Math.abs(value))}`;
}

function formatVariancePercentage(value: number | null) {
  if (value === null) {
    return "Sin base";
  }

  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

function getVarianceTone(value: number) {
  if (value > 0) {
    return {
      badge: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200",
      text: "text-amber-700 dark:text-amber-200",
      progress: "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500",
    };
  }

  if (value < 0) {
    return {
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
      text: "text-emerald-700 dark:text-emerald-200",
      progress: "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400",
    };
  }

  return {
    badge: "border-border/70 bg-background/70 text-muted-foreground",
    text: "text-muted-foreground",
    progress: "bg-gradient-to-r from-primary via-cyan-400 to-accent",
  };
}

function getEstimateProgress(trackedMinutes: number, estimatedMinutes: number) {
  if (!estimatedMinutes) {
    return 0;
  }

  return Math.min(100, Math.round((trackedMinutes / estimatedMinutes) * 100));
}

function TimeReportsFilters({
  boards,
  selectedBoardId,
}: {
  boards: TimeReportsData["boards"];
  selectedBoardId: string | null;
}) {
  return (
    <form
      action="/reports"
      className="glass-floating flex flex-col gap-3 rounded-[28px] border border-border/70 px-4 py-4 sm:flex-row sm:items-end"
    >
      <div className="min-w-0 flex-1">
        <label
          htmlFor="boardId"
          className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          Tablero
        </label>
        <select
          id="boardId"
          name="boardId"
          defaultValue={selectedBoardId ?? ""}
          className={fieldSelectClassName}
        >
          <option value="">Todos los tableros</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className={cn(buttonVariants({ size: "lg" }), "sm:w-auto")}>
          Aplicar
        </button>
        {selectedBoardId ? (
          <Link
            href="/reports"
            prefetch={false}
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "sm:w-auto")}
          >
            Limpiar
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function TimeReportsView({ data }: TimeReportsViewProps) {
  const overviewTone = getVarianceTone(data.overview.varianceMinutes);
  const scopedTitle = data.selectedBoardName
    ? `Lectura de tiempo para "${data.selectedBoardName}"`
    : "Lectura consolidada del tiempo en todos tus tableros";

  return (
    <div className="space-y-6">
      <section className="glass-panel relative overflow-hidden rounded-[36px] border border-border px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.16),transparent_30%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:items-end">
          <div className="space-y-4">
            <Badge className="w-fit bg-primary/12 text-primary ring-1 ring-primary/15">
              Reportes de tiempo
            </Badge>
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                Estimado vs real
              </p>
              <h2 className="text-balance font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.94]">
                {scopedTitle}
              </h2>
              <p className="max-w-3xl text-base text-muted-foreground">
                Acá ves cuánto tiempo se planificó, cuánto se registró de verdad,
                quién está cargando más horas y qué tarjetas se desviaron más de
                la estimación.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {data.overview.totalCards} tarjetas analizadas
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {data.overview.timeEntryCount} entradas registradas
              </span>
              <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {data.overview.activeMembers} miembros con tiempo
              </span>
            </div>
          </div>

          <TimeReportsFilters
            boards={data.boards}
            selectedBoardId={data.selectedBoardId}
          />
        </div>
      </section>

      {data.boards.length === 0 ? (
        <EmptyState
          title="Todavía no hay tableros para reportar"
          description="Cuando tengas tableros y tiempo cargado, este espacio va a mostrar métricas de estimación, uso real y desvíos."
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_repeat(4,minmax(0,1fr))]">
            <Card className="relative overflow-hidden md:col-span-2 xl:col-span-1">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.16),transparent_30%)]" />
              <CardHeader className="relative gap-3">
                <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">
                  Balance general
                </p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <CardTitle className="text-[clamp(2.8rem,8vw,4.5rem)] leading-none">
                      {formatMinutes(data.overview.totalTrackedMinutes)}
                    </CardTitle>
                    <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                      tiempo registrado real sobre {formatMinutes(data.overview.totalEstimatedMinutes)} estimados.
                    </p>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-[24px] bg-primary/12 text-primary">
                    <Clock3 className="size-6" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em]",
                      overviewTone.badge,
                    )}
                  >
                    Desvío {formatVarianceMinutes(data.overview.varianceMinutes)}
                  </span>
                  <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {formatVariancePercentage(data.overview.variancePercentage)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    <span>Cobertura de estimaciones</span>
                    <span>{data.overview.cardsWithEstimate}/{data.overview.totalCards}</span>
                  </div>
                  <div className="mt-2 progress-track h-1.5">
                    <div
                      className="progress-fill bg-gradient-to-r from-primary via-cyan-400 to-accent"
                      style={{
                        width: `${data.overview.totalCards ? Math.max(Math.round((data.overview.cardsWithEstimate / data.overview.totalCards) * 100), 8) : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.overview.cardsWithoutEstimate > 0
                    ? `${data.overview.cardsWithoutEstimate} tarjetas todavía no tienen estimación, así que conviene leer la diferencia con ese contexto.`
                    : "Todas las tarjetas contempladas tienen base estimada para comparar contra el tiempo real."}
                </p>
              </CardContent>
            </Card>

            <MetricCard
              label="Tiempo estimado"
              value={formatMinutes(data.overview.totalEstimatedMinutes)}
              description="Suma actual de minutos estimados en las tarjetas del alcance filtrado."
              icon={Gauge}
              className="bg-gradient-to-br from-primary/10 via-card to-card"
            />
            <MetricCard
              label="Desvío neto"
              value={formatVarianceMinutes(data.overview.varianceMinutes)}
              description="Diferencia consolidada entre lo planificado y lo efectivamente registrado."
              icon={data.overview.varianceMinutes > 0 ? ArrowUpRight : ArrowDownRight}
              className="bg-gradient-to-br from-secondary/55 via-card to-card"
              valueClassName={overviewTone.text}
            />
            <MetricCard
              label="Sobre estimación"
              value={data.overview.overBudgetCards}
              description="Tarjetas con tiempo real por encima del estimado."
              icon={TriangleAlert}
              tone={data.overview.overBudgetCards > 0 ? "warning" : "default"}
              className="bg-gradient-to-br from-warning-surface via-card to-card"
            />
            <MetricCard
              label="Miembros activos"
              value={data.overview.activeMembers}
              description="Personas que registraron tiempo dentro del alcance actual."
              icon={Users2}
              className="bg-gradient-to-br from-success-surface via-card to-card"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-3 w-fit">
                      Tiempo por tablero
                    </Badge>
                    <CardTitle>Comparativa entre espacios</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Cómo se reparte el esfuerzo real, cuánto se estimó y dónde se está yendo el tiempo.
                    </p>
                  </div>
                  <div className="glass-floating flex items-center gap-3 rounded-[24px] border border-border/70 px-4 py-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                      <FolderKanban className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Alcance
                      </p>
                      <p className="font-display text-2xl font-semibold">
                        {data.byBoard.length}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                {data.byBoard.length ? (
                  data.byBoard.map((board) => {
                    const theme = getBoardTheme(board.boardTheme);
                    const tone = getVarianceTone(board.varianceMinutes);
                    const progress = getEstimateProgress(
                      board.totalTrackedMinutes,
                      board.totalEstimatedMinutes,
                    );

                    return (
                      <Link
                        key={board.boardId}
                        href={`/boards/${board.boardId}`}
                        prefetch={false}
                        className="group block rounded-[24px] border border-border bg-background/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/85"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold">{board.boardName}</p>
                              <Badge className={theme.chipClass}>
                                {board.cardCount} tarjetas
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatMinutes(board.totalTrackedMinutes)} reales sobre {formatMinutes(board.totalEstimatedMinutes)} estimados.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", tone.badge)}>
                              {formatVarianceMinutes(board.varianceMinutes)}
                            </span>
                            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                              {formatVariancePercentage(board.variancePercentage)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Tiempo real</p>
                            <p className="mt-2 font-display text-lg font-semibold">{formatMinutes(board.totalTrackedMinutes)}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Entradas</p>
                            <p className="mt-2 font-display text-lg font-semibold">{board.timeEntryCount}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Miembros</p>
                            <p className="mt-2 font-display text-lg font-semibold">{board.activeMembers}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Sobre estimadas</p>
                            <p className="mt-2 font-display text-lg font-semibold">{board.overBudgetCards}</p>
                          </div>
                        </div>

                        {board.totalEstimatedMinutes > 0 ? (
                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                              <span>Progreso de consumo</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="progress-track h-1.5">
                              <div
                                className={cn("progress-fill", tone.progress)}
                                style={{ width: `${Math.max(progress, board.totalTrackedMinutes ? 8 : 0)}%` }}
                              />
                            </div>
                          </div>
                        ) : null}

                        {board.lastLoggedAt ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Último registro {formatRelativeDistance(board.lastLoggedAt)}
                          </p>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Todavía no hay tiempo cargado en este tablero.
                          </p>
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState
                    className="px-4 py-10"
                    title="No hay tiempo para comparar"
                    description="Cuando se registren horas en tarjetas de este alcance, la distribución por tablero va a aparecer acá."
                  />
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge variant="secondary" className="mb-3 w-fit">
                      Tiempo por miembro
                    </Badge>
                    <CardTitle>Quién está cargando tiempo</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ranking simple por minutos registrados, entradas y alcance entre tableros.
                    </p>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Users2 className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                {data.byMember.length ? (
                  data.byMember.map((member, index) => (
                    <div
                      key={member.userId}
                      className="rounded-[24px] border border-border bg-background/70 px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <UserAvatar name={member.name} src={member.avatarUrl} className="size-10 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{member.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-2xl font-semibold">{formatMinutes(member.totalTrackedMinutes)}</p>
                              <p className="text-xs text-muted-foreground">{member.timeEntryCount} entradas</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                              {member.cardsWorkedCount} tarjetas
                            </span>
                            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                              {member.boardCount} tableros
                            </span>
                            {member.lastLoggedAt ? (
                              <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                                Último registro {formatRelativeDistance(member.lastLoggedAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    className="px-4 py-10"
                    title="Todavía nadie registró tiempo"
                    description="En cuanto aparezcan entradas de tiempo, este panel va a mostrar la distribución por miembro."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant="secondary" className="mb-3 w-fit">
                    Tarjetas que más se desviaron
                  </Badge>
                  <CardTitle>Desvíos más grandes contra la estimación</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ranking de tarjetas con mayor diferencia absoluta entre minutos estimados y reales.
                  </p>
                </div>
                <div className="glass-floating flex items-center gap-3 rounded-[24px] border border-border/70 px-4 py-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <BarChart3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Top visible
                    </p>
                    <p className="font-display text-2xl font-semibold">
                      {data.topVarianceCards.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {data.topVarianceCards.length ? (
                data.topVarianceCards.map((card) => {
                  const theme = getBoardTheme(card.boardTheme);
                  const tone = getVarianceTone(card.varianceMinutes);
                  const progress = getEstimateProgress(
                    card.trackedMinutes,
                    card.estimatedMinutes,
                  );

                  return (
                    <Link
                      key={card.cardId}
                      href={`/boards/${card.boardId}`}
                      prefetch={false}
                      className="group block rounded-[24px] border border-border bg-background/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-background/85"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{card.title}</p>
                            <Badge className={theme.chipClass}>{card.boardName}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                              {card.listName}
                            </span>
                            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                              {getStatusLabel(card.status)}
                            </span>
                            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                              {getPriorityLabel(card.priority)}
                            </span>
                            <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                              Actualizada {formatRelativeDistance(card.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", tone.badge)}>
                            {formatVarianceMinutes(card.varianceMinutes)}
                          </span>
                          <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                            {formatVariancePercentage(card.variancePercentage)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Estimado</p>
                          <p className="mt-2 font-display text-lg font-semibold">{formatMinutes(card.estimatedMinutes)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Real</p>
                          <p className="mt-2 font-display text-lg font-semibold">{formatMinutes(card.trackedMinutes)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card/70 px-3 py-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Responsables</p>
                          <p className="mt-2 text-sm font-medium">
                            {card.assignees.length
                              ? card.assignees.map((assignee) => assignee.name).join(", ")
                              : "Sin asignar"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Consumo vs estimación</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="progress-track h-1.5">
                          <div
                            className={cn("progress-fill", tone.progress)}
                            style={{ width: `${Math.max(progress, card.trackedMinutes ? 8 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <EmptyState
                  className="px-4 py-10"
                  title="No hay tarjetas con desvío para mostrar"
                  description="Cuando existan tarjetas con estimación cargada, acá vas a ver cuáles se alejaron más del tiempo real."
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
