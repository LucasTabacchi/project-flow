import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  KanbanSquare,
  TimerReset,
} from "lucide-react";

import { MetricCard } from "@/components/ui/metric-card";

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

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {items.map((item) => {
        const value = stats[item.key];

        return (
          <MetricCard
            key={item.key}
            label={item.label}
            value={value}
            description={item.description}
            icon={item.icon}
            tone={item.tone}
          />
        );
      })}
    </div>
  );
}
