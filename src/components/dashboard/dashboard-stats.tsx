import { AlertTriangle, CheckCircle2, KanbanSquare, TimerReset } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  },
  {
    key: "totalCards",
    label: "Tareas totales",
    icon: TimerReset,
  },
  {
    key: "completedCards",
    label: "Tareas completadas",
    icon: CheckCircle2,
  },
  {
    key: "overdueCards",
    label: "Tareas vencidas",
    icon: AlertTriangle,
  },
] as const;

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const value = stats[item.key];

        return (
          <Card key={item.key}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item.key === "overdueCards"
                  ? "Detectá bloqueo y fechas de riesgo."
                  : item.key === "completedCards"
                    ? "Seguimiento de avance consolidado."
                    : "Visibilidad rápida del trabajo activo."}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
