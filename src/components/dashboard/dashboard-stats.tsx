import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  KanbanSquare,
  TimerReset,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { percentage } from "@/lib/utils";

type DashboardStatsProps = {
  stats: {
    boardCount: number;
    totalCards: number;
    completedCards: number;
    overdueCards: number;
    dueSoonCards: number;
  };
};

const items = [
  {
    key: "boardCount",
    label: "Tableros activos",
    icon: KanbanSquare,
    description: "Visibilidad rápida de los espacios en marcha.",
    tone: "default",
  },
  {
    key: "totalCards",
    label: "Tareas totales",
    icon: TimerReset,
    description: "Carga consolidada entre tableros propios y compartidos.",
    tone: "default",
  },
  {
    key: "completedCards",
    label: "Tareas completadas",
    icon: CheckCircle2,
    description: "Seguimiento del avance resuelto durante el ciclo actual.",
    tone: "success",
  },
  {
    key: "overdueCards",
    label: "Tareas vencidas",
    icon: AlertTriangle,
    description: "Detectá bloqueos y fechas que ya requieren atención.",
    tone: "warning",
  },
  {
    key: "dueSoonCards",
    label: "Vencen pronto",
    icon: CalendarClock,
    description: "Tarjetas con deadline dentro de los próximos siete días.",
    tone: "default",
  },
] as const;

function getMetricDescription(
  key: (typeof items)[number]["key"],
  value: number,
  attentionCount: number,
) {
  switch (key) {
    case "boardCount":
      return value === 1
        ? "1 espacio visible para retomar con contexto completo."
        : `${value} espacios visibles para retomar con contexto completo.`;
    case "completedCards":
      return value > 0
        ? `${value} tareas resueltas ya empujan el flujo hacia adelante.`
        : "Todavia no hay tareas cerradas en este corte operativo.";
    case "overdueCards":
      return value > 0
        ? `${value} tareas vencidas requieren decision antes de abrir nuevos frentes.`
        : "No hay vencidas: el foco puede ir a continuidad y ritmo.";
    case "dueSoonCards":
      return value > 0
        ? `${value} entregas quedan dentro de los proximos siete dias.`
        : attentionCount > 0
          ? "El riesgo actual viene mas por vencidas que por fechas proximas."
          : "Sin entregas comprometidas en el corto plazo.";
    default:
      return "";
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const attentionCount = stats.overdueCards + stats.dueSoonCards;
  const resolvedRatio = percentage(stats.completedCards, stats.totalCards);
  const attentionRatio = percentage(attentionCount, stats.totalCards);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
      <Card className="animate-enter relative overflow-hidden md:col-span-2 xl:col-span-1">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.16),transparent_30%)]" />
        <CardHeader className="relative gap-3">
          <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">
            Radar diario
          </p>
          <div className="flex items-end justify-between gap-4">
            <div>
              <CardTitle className="text-[clamp(3rem,8vw,4.75rem)] leading-none">
                {stats.totalCards}
              </CardTitle>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                tarjetas en seguimiento entre espacios propios y compartidos.
              </p>
            </div>
            <div className="flex size-14 items-center justify-center rounded-[24px] bg-primary/12 text-primary">
              <TimerReset className="size-6" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {resolvedRatio}% resuelto
            </span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {attentionCount} en seguimiento
            </span>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Tableros
              </p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {stats.boardCount}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Completadas
              </p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {stats.completedCards}
              </p>
            </div>
            <div className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Atención
              </p>
              <p className="mt-2 font-display text-2xl font-semibold">
                {attentionCount}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>Ritmo resuelto</span>
                <span>{resolvedRatio}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-background/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-cyan-400 to-accent"
                  style={{ width: `${Math.max(resolvedRatio, stats.totalCards ? 8 : 0)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>Presión inmediata</span>
                <span>{attentionRatio}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-background/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500"
                  style={{ width: `${Math.max(attentionRatio, attentionCount ? 8 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {attentionCount > 0
              ? `${attentionCount} tarjetas necesitan seguimiento cercano entre vencidas y próximas.`
              : "El panorama está estable: no hay entregas comprometidas en el corto plazo."}
          </p>
        </CardContent>
      </Card>

      {items
        .filter((item) => item.key !== "totalCards")
        .map((item) => {
          const value = stats[item.key];
          const description = getMetricDescription(
            item.key,
            value,
            attentionCount,
          );
          const tone =
            item.key === "completedCards"
              ? stats.completedCards > 0
                ? "success"
                : "default"
              : item.key === "overdueCards"
                ? stats.overdueCards > 0
                  ? "warning"
                  : "success"
                : item.key === "dueSoonCards"
                  ? stats.dueSoonCards > 0
                    ? "warning"
                    : "default"
                  : item.tone;
          const className =
            item.key === "boardCount"
              ? "bg-gradient-to-br from-primary/10 via-card to-card"
              : item.key === "completedCards"
                ? "bg-gradient-to-br from-success-surface via-card to-card"
                : item.key === "overdueCards"
                  ? "bg-gradient-to-br from-warning-surface via-card to-card"
                  : "bg-gradient-to-br from-secondary/55 via-card to-card";

          return (
            <MetricCard
              key={item.key}
              label={item.label}
              value={value}
              description={description || item.description}
              icon={item.icon}
              tone={tone}
              className={`animate-enter relative overflow-hidden ${className}`}
              valueClassName="leading-none"
            />
          );
        })}
    </div>
  );
}
