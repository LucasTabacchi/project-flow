import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  tone?: MetricTone;
  className?: string;
  valueClassName?: string;
};

type MetricTileProps = {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: MetricTone;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
};

const metricToneClasses: Record<
  MetricTone,
  {
    iconContainer: string;
  }
> = {
  default: {
    iconContainer: "bg-primary/12 text-primary",
  },
  success: {
    iconContainer: "bg-success-surface text-success-foreground",
  },
  warning: {
    iconContainer: "bg-warning-surface text-warning-foreground",
  },
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "default",
  className,
  valueClassName,
}: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <CardTitle
            className={cn(
              "mt-2 text-[clamp(1.8rem,3vw,2.5rem)]",
              valueClassName,
            )}
          >
            {value}
          </CardTitle>
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl",
              metricToneClasses[tone].iconContainer,
            )}
          >
            <Icon className="size-5" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  className,
  valueClassName,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-border bg-background/70 px-4 py-3",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 flex items-center gap-2 text-2xl font-semibold",
          valueClassName,
        )}
      >
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-2xl",
              metricToneClasses[tone].iconContainer,
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
        <span>{value}</span>
      </p>
      {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
